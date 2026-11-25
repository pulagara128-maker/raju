import 'dotenv/config';
import express, { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { EventEmitter } from 'events';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from './src/db/index.ts';
import {
  campaignDeliveries,
  contactMessages,
  customers,
  feedback,
  festivalCampaigns,
  galleryItems,
  leads,
  loyaltyRewards,
  loyaltyTransactions,
  menuCategories,
  menuItems,
  openingHours,
  orderItems,
  orders,
  restaurantSettings,
  todaysSpecial,
} from './src/db/schema.ts';
import { ensureSeeded } from './src/db/seed.ts';
import { computeLiveHoursStatus, getIstNowParts } from './src/lib/hours.ts';
import {
  createContactMessageSchema,
  createFeedbackSchema,
  createLeadSchema,
  createOrderSchema,
  indianPhoneSchema,
  isValidSafeUrl,
  normalizeIndianPhone,
  sanitizeCsvCell,
  sanitizeText,
} from './src/lib/validation.ts';
import { AuthRequest, requireAdmin, requireAuth, requireStaffOrAdmin } from './src/middleware/auth.ts';
import { users } from './src/db/schema.ts';
import { listTeamUsers } from './src/db/users.ts';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const orderStatusBus = new EventEmitter();
orderStatusBus.setMaxListeners(200);

const publicCatalogBus = new EventEmitter();
publicCatalogBus.setMaxListeners(500);

const adminOrderBus = new EventEmitter();
adminOrderBus.setMaxListeners(100);

const adminStreamTickets = new Map<string, { userId: number; role: string; expiresAt: number }>();

function emitCatalogUpdated(reason: string) {
  publicCatalogBus.emit('catalog:updated', { reason, at: new Date().toISOString() });
}

app.set('trust proxy', 1);
app.use(express.json({ limit: '4mb' }));

const uploadsDir = path.resolve(process.cwd(), 'public', 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

const publicWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please wait a few minutes and try again.' },
});

const publicLookupLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many lookup requests. Please try again shortly.' },
});

function generateCode(prefix: string): string {
  const ist = getIstNowParts();
  const datePart = ist.istDateISO.replace(/-/g, '');
  const rand = crypto.randomBytes(2).toString('hex').toUpperCase();
  return `${prefix}-${datePart}-${rand}`;
}

function getWhatsAppApiStatus() {
  const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  return {
    configured: Boolean(token && phoneId),
    token: token || '',
    phoneId: phoneId || '',
  };
}

// SEO Routes
app.get('/robots.txt', (req: Request, res: Response) => {
  const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
  res.type('text/plain').send(
    `User-agent: *\nAllow: /\nDisallow: /admin\nSitemap: ${baseUrl.replace(/\/$/, '')}/sitemap.xml\n`
  );
});

app.get('/sitemap.xml', (req: Request, res: Response) => {
  const baseUrl = (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
  const routes = ['/', '/menu', '/order', '/loyalty', '/qr-menu', '/privacy', '/terms'];
  const urls = routes
    .map(
      (r) =>
        `  <url>\n    <loc>${baseUrl}${r}</loc>\n    <changefreq>daily</changefreq>\n    <priority>${r === '/' ? '1.0' : '0.8'}</priority>\n  </url>`
    )
    .join('\n');
  res.type('application/xml').send(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`
  );
});

// Public Bootstrap
app.get('/api/public/bootstrap', async (_req: Request, res: Response) => {
  try {
    await ensureSeeded();
    const [settingsList, hoursList, categories, items, specialList, gallery] =
      await Promise.all([
        db.select().from(restaurantSettings).limit(1),
        db.select().from(openingHours).orderBy(asc(openingHours.dayOfWeek)),
        db
          .select()
          .from(menuCategories)
          .where(eq(menuCategories.isActive, true))
          .orderBy(asc(menuCategories.sortOrder), asc(menuCategories.id)),
        db
          .select()
          .from(menuItems)
          .orderBy(asc(menuItems.sortOrder), asc(menuItems.id)),
        db.select().from(todaysSpecial).limit(1),
        db
          .select()
          .from(galleryItems)
          .orderBy(asc(galleryItems.sortOrder), asc(galleryItems.id)),
      ]);

    const settings = settingsList[0] || null;
    const liveStatus = computeLiveHoursStatus(hoursList);
    const specialRow = specialList[0] || null;
    const { istDateISO } = getIstNowParts();
    const activeSpecial =
      specialRow &&
      specialRow.isEnabled &&
      (!specialRow.validDate || specialRow.validDate >= istDateISO)
        ? specialRow
        : null;

    res.json({
      settings,
      openingHours: hoursList,
      liveHoursStatus: liveStatus,
      categories,
      menuItems: items,
      todaysSpecial: activeSpecial,
      galleryItems: gallery,
      googleRating: {
        score: 4.6,
        totalReviews: 2080,
      },
    });
  } catch (error) {
    console.error('Error loading public bootstrap:', error);
    res.status(500).json({ error: 'Failed to load restaurant information. Please try again.' });
  }
});

// Public Real-Time Catalog / Menu / Special / Settings Stream (SSE)
app.get('/api/public/stream', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  res.write(`event: catalog:ready\ndata: ${JSON.stringify({ ok: true })}\n\n`);

  const onUpdate = (payload: unknown) => {
    res.write(`event: catalog:updated\ndata: ${JSON.stringify(payload)}\n\n`);
  };
  publicCatalogBus.on('catalog:updated', onUpdate);

  const keepAlive = setInterval(() => {
    res.write(': keepalive\n\n');
  }, 25000);

  _req.on('close', () => {
    clearInterval(keepAlive);
    publicCatalogBus.off('catalog:updated', onUpdate);
  });
});

// Public Pre-Order Placement
app.post('/api/orders', publicWriteLimiter, async (req: Request, res: Response) => {
  try {
    await ensureSeeded();
    const parsed = createOrderSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message || 'Invalid order details',
      });
    }

    const data = parsed.data;
    const settingsRows = await db.select().from(restaurantSettings).limit(1);
    const settings = settingsRows[0];

    if (data.orderType === 'delivery' && !settings?.deliveryEnabled) {
      return res.status(400).json({
        error: 'Delivery ordering is currently disabled. Please select Pickup.',
      });
    }

    const allMenuItems = await db.select().from(menuItems);
    const itemMap: Record<number, (typeof allMenuItems)[number]> = {};
    for (const m of allMenuItems) {
      itemMap[m.id] = m;
    }

    let subtotal = 0;
    let hasUnpricedItems = false;
    const resolvedItems: Array<{
      menuItemId: number;
      dishName: string;
      unitPrice: number | null;
      quantity: number;
      lineTotal: number;
    }> = [];

    for (const reqItem of data.items) {
      const dbItem = itemMap[reqItem.menuItemId];
      if (!dbItem) {
        return res.status(400).json({ error: 'One or more selected menu items no longer exist.' });
      }
      if (!dbItem.isAvailable) {
        return res.status(400).json({ error: `${dbItem.name} is currently unavailable.` });
      }
      const unitPrice = dbItem.isPriceConfirmed && dbItem.price !== null ? dbItem.price : null;
      if (unitPrice === null) {
        hasUnpricedItems = true;
      }
      const lineTotal = unitPrice !== null ? unitPrice * reqItem.quantity : 0;
      subtotal += lineTotal;
      resolvedItems.push({
        menuItemId: dbItem.id,
        dishName: dbItem.name,
        unitPrice,
        quantity: reqItem.quantity,
        lineTotal,
      });
    }

    const deliveryCharge =
      data.orderType === 'delivery' && settings?.deliveryEnabled && settings.deliveryCharge
        ? settings.deliveryCharge
        : 0;
    const total = subtotal + deliveryCharge;
    const cleanName = sanitizeText(data.customerName, 80);
    const cleanInstructions = sanitizeText(data.specialInstructions, 400);

    // Upsert customer record for tracking & loyalty readiness
    const existingCustomer = await db
      .select()
      .from(customers)
      .where(eq(customers.phone, data.customerPhone))
      .limit(1);

    let customerId: number;
    if (existingCustomer.length > 0) {
      customerId = existingCustomer[0].id;
      if (!existingCustomer[0].name && cleanName) {
        await db
          .update(customers)
          .set({ name: cleanName, updatedAt: new Date() })
          .where(eq(customers.id, customerId));
      }
    } else {
      const insertedCust = await db
        .insert(customers)
        .values({ name: cleanName, phone: data.customerPhone })
        .returning();
      customerId = insertedCust[0].id;
    }

    const orderNumber = generateCode('SD');
    const insertedOrder = await db
      .insert(orders)
      .values({
        orderNumber,
        customerId,
        customerName: cleanName,
        customerPhone: data.customerPhone,
        orderType: data.orderType,
        pickupDate: data.pickupDate,
        pickupTime: sanitizeText(data.pickupTime, 20),
        specialInstructions: cleanInstructions || null,
        subtotal,
        deliveryCharge,
        total,
        hasUnpricedItems,
        status: 'new',
      })
      .returning();

    const order = insertedOrder[0];

    await db.insert(orderItems).values(
      resolvedItems.map((it) => ({
        orderId: order.id,
        menuItemId: it.menuItemId,
        dishName: it.dishName,
        unitPrice: it.unitPrice,
        quantity: it.quantity,
        lineTotal: it.lineTotal,
      }))
    );

    const enrichedCreatedOrder = {
      ...order,
      items: resolvedItems,
      hasLoyaltyStamp: false,
    };

    adminOrderBus.emit('order:event', { type: 'created', order: enrichedCreatedOrder });

    res.status(201).json({
      order: enrichedCreatedOrder,
      notice:
        'Your pre-order request has been received and is awaiting confirmation from Signature Dine.',
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Unable to submit order right now. Please try again.' });
  }
});

// Public Order Lookup (requires matching phone)
app.get('/api/orders/track/:orderNumber', publicLookupLimiter, async (req: Request, res: Response) => {
  try {
    const orderNumber = sanitizeText(String(req.params.orderNumber || ''), 40).toUpperCase();
    const rawPhone = String(req.query.phone || '');
    const phoneResult = indianPhoneSchema.safeParse(rawPhone);

    if (!orderNumber || !phoneResult.success) {
      return res.status(400).json({ error: 'Order number and valid mobile number are required.' });
    }

    const found = await db
      .select()
      .from(orders)
      .where(and(eq(orders.orderNumber, orderNumber), eq(orders.customerPhone, phoneResult.data)))
      .limit(1);

    if (found.length === 0) {
      return res.status(404).json({ error: 'No matching order found for that order number and phone.' });
    }

    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, found[0].id));

    res.json({ order: { ...found[0], items } });
  } catch (error) {
    console.error('Error tracking order:', error);
    res.status(500).json({ error: 'Unable to look up order right now.' });
  }
});

// Public Real-Time Order Status Stream (Server-Sent Events)
app.get('/api/orders/stream/:orderNumber', publicLookupLimiter, async (req: Request, res: Response) => {
  try {
    const orderNumber = sanitizeText(String(req.params.orderNumber || ''), 40).toUpperCase();
    const rawPhone = String(req.query.phone || '');
    const phoneResult = indianPhoneSchema.safeParse(rawPhone);

    if (!orderNumber || !phoneResult.success) {
      return res.status(400).json({ error: 'Order number and valid mobile number are required.' });
    }

    const found = await db
      .select()
      .from(orders)
      .where(and(eq(orders.orderNumber, orderNumber), eq(orders.customerPhone, phoneResult.data)))
      .limit(1);

    if (found.length === 0) {
      return res.status(404).json({ error: 'No matching order found for that order number and phone.' });
    }

    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, found[0].id));

    const initialPayload = { ...found[0], items };

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const writeEvent = (eventName: string, data: unknown) => {
      res.write(`event: ${eventName}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    writeEvent('order:state', initialPayload);

    const channel = `order:${found[0].orderNumber}`;
    const onOrderUpdate = (updatedOrder: unknown) => {
      writeEvent('order:state', updatedOrder);
    };
    orderStatusBus.on(channel, onOrderUpdate);

    const keepAliveTimer = setInterval(() => {
      res.write(': keepalive\n\n');
    }, 25000);

    req.on('close', () => {
      clearInterval(keepAliveTimer);
      orderStatusBus.off(channel, onOrderUpdate);
    });
  } catch (error) {
    console.error('Error streaming order status:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Unable to open live status stream right now.' });
    }
  }
});

// Public Lead Capture (with explicit WhatsApp consent)
app.post('/api/leads', publicWriteLimiter, async (req: Request, res: Response) => {
  try {
    const parsed = createLeadSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message || 'Please enter a valid Indian mobile number and consent.',
      });
    }

    const cleanName = sanitizeText(parsed.data.name, 80) || null;
    const phone = parsed.data.phone;
    const now = new Date();

    await db
      .insert(leads)
      .values({
        name: cleanName,
        phone,
        consentStatus: true,
        consentTimestamp: now,
        unsubscribed: false,
        unsubscribedAt: null,
        source: parsed.data.source,
      })
      .onConflictDoUpdate({
        target: leads.phone,
        set: {
          name: cleanName ?? undefined,
          consentStatus: true,
          consentTimestamp: now,
          unsubscribed: false,
          unsubscribedAt: null,
          source: parsed.data.source,
        },
      });

    res.status(201).json({
      success: true,
      message: 'Welcome to the Signature Dine community! You are subscribed for offers and festival greetings.',
    });
  } catch (error) {
    console.error('Error saving lead:', error);
    res.status(500).json({ error: 'Could not save your request. Please try again.' });
  }
});

// Public Lead Unsubscribe
app.post('/api/leads/unsubscribe', publicWriteLimiter, async (req: Request, res: Response) => {
  try {
    const parsed = indianPhoneSchema.safeParse(req.body?.phone || '');
    if (!parsed.success) {
      return res.status(400).json({ error: 'Enter a valid 10-digit Indian mobile number.' });
    }

    await db
      .update(leads)
      .set({
        unsubscribed: true,
        unsubscribedAt: new Date(),
        consentStatus: false,
      })
      .where(eq(leads.phone, parsed.data));

    res.json({
      success: true,
      message: 'You have been unsubscribed from promotional WhatsApp messages.',
    });
  } catch (error) {
    console.error('Error unsubscribing lead:', error);
    res.status(500).json({ error: 'Could not process unsubscribe request.' });
  }
});

// Public Loyalty Check by Customer Phone
app.get('/api/loyalty/check', publicLookupLimiter, async (req: Request, res: Response) => {
  try {
    await ensureSeeded();
    const rawPhone = String(req.query.phone || '');
    const parsed = indianPhoneSchema.safeParse(rawPhone);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Enter a valid 10-digit Indian mobile number.' });
    }

    const [settingsRow] = await db.select().from(restaurantSettings).limit(1);
    const targetMeals = settingsRow?.loyaltyTargetMeals ?? 10;

    const found = await db
      .select({
        id: customers.id,
        name: customers.name,
        stampsCount: customers.stampsCount,
        totalCompletedMeals: customers.totalCompletedMeals,
        rewardsAvailable: customers.rewardsAvailable,
        rewardsRedeemed: customers.rewardsRedeemed,
        birthdayConsent: customers.birthdayConsent,
        birthday: customers.birthday,
      })
      .from(customers)
      .where(eq(customers.phone, parsed.data))
      .limit(1);

    if (found.length === 0) {
      return res.json({
        enrolled: false,
        targetMeals,
        birthdayDiscountPercent: settingsRow?.birthdayDiscountPercent ?? 15,
        birthdayMaxDiscount: settingsRow?.birthdayMaxDiscount ?? 500,
        rulesText: settingsRow?.loyaltyRulesText ?? '',
        customer: null,
      });
    }

    const cust = found[0];
    const availableRewards = await db
      .select({
        rewardCode: loyaltyRewards.rewardCode,
        status: loyaltyRewards.status,
        createdAt: loyaltyRewards.createdAt,
      })
      .from(loyaltyRewards)
      .where(and(eq(loyaltyRewards.customerId, cust.id), eq(loyaltyRewards.status, 'available')));

    res.json({
      enrolled: true,
      targetMeals,
      birthdayDiscountPercent: settingsRow?.birthdayDiscountPercent ?? 15,
      birthdayMaxDiscount: settingsRow?.birthdayMaxDiscount ?? 500,
      rulesText: settingsRow?.loyaltyRulesText ?? '',
      customer: {
        name: cust.name || 'Valued Guest',
        stampsCount: cust.stampsCount,
        totalCompletedMeals: cust.totalCompletedMeals,
        rewardsAvailable: cust.rewardsAvailable,
        rewardsRedeemed: cust.rewardsRedeemed,
        hasBirthdayOnFile: Boolean(cust.birthdayConsent && cust.birthday),
        availableRewardCodes: availableRewards,
      },
    });
  } catch (error) {
    console.error('Error checking loyalty:', error);
    res.status(500).json({ error: 'Could not look up loyalty progress right now.' });
  }
});

// Public Customer Feedback Submission
app.post('/api/feedback', publicWriteLimiter, async (req: Request, res: Response) => {
  try {
    const parsed = createFeedbackSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message || 'Please complete all required star ratings.',
      });
    }

    const d = parsed.data;
    const referenceNumber = generateCode('FB');
    const cleanPhone = d.customerPhone ? normalizeIndianPhone(d.customerPhone) : null;

    await db.insert(feedback).values({
      referenceNumber,
      customerName: sanitizeText(d.customerName, 80) || null,
      customerPhone: cleanPhone || null,
      foodRating: d.foodRating,
      serviceRating: d.serviceRating,
      ambianceRating: d.ambianceRating,
      overallRating: d.overallRating,
      writtenFeedback: sanitizeText(d.writtenFeedback, 1000) || null,
      suggestions: sanitizeText(d.suggestions, 1000) || null,
      isReviewed: false,
    });

    res.status(201).json({
      success: true,
      referenceNumber,
      message: 'Thank you for sharing your feedback with Signature Dine.',
    });
  } catch (error) {
    console.error('Error saving feedback:', error);
    res.status(500).json({ error: 'Unable to submit feedback right now.' });
  }
});

// Public Contact Us Message Submission
app.post('/api/contact', publicWriteLimiter, async (req: Request, res: Response) => {
  try {
    const parsed = createContactMessageSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message || 'Please complete all required contact fields.',
      });
    }

    const d = parsed.data;
    const [created] = await db
      .insert(contactMessages)
      .values({
        name: sanitizeText(d.name, 80),
        email: sanitizeText(d.email, 150) || null,
        phone: d.phone,
        subject: sanitizeText(d.subject, 120),
        message: sanitizeText(d.message, 1500),
        isRead: false,
      })
      .returning();

    res.status(201).json({
      success: true,
      id: created.id,
      message: 'Thank you for reaching out! Our team at Signature Dine will get back to you shortly.',
    });
  } catch (error) {
    console.error('Error saving contact message:', error);
    res.status(500).json({ error: 'Unable to send message right now.' });
  }
});

// =========================================================================
// PROTECTED ADMIN ROUTES
// =========================================================================

app.get('/api/admin/me', requireAuth, async (req: AuthRequest, res: Response) => {
  res.json({
    user: req.dbUser,
    whatsappApiConfigured: getWhatsAppApiStatus().configured,
  });
});

// Secure short-lived SSE ticket for Admin/Staff real-time incoming orders feed
app.post('/api/admin/stream-ticket', requireAuth, requireStaffOrAdmin, (req: AuthRequest, res: Response) => {
  const now = Date.now();
  for (const [k, v] of adminStreamTickets.entries()) {
    if (v.expiresAt < now) adminStreamTickets.delete(k);
  }
  const ticket = crypto.randomUUID();
  adminStreamTickets.set(ticket, {
    userId: req.dbUser!.id,
    role: req.dbUser!.role,
    expiresAt: now + 30_000,
  });
  res.json({ ticket });
});

app.get('/api/admin/stream', (req: Request, res: Response) => {
  const ticket = String(req.query.ticket || '');
  const entry = ticket ? adminStreamTickets.get(ticket) : undefined;
  if (!entry || entry.expiresAt < Date.now()) {
    if (ticket) adminStreamTickets.delete(ticket);
    return res.status(401).json({ error: 'Invalid or expired stream ticket.' });
  }
  adminStreamTickets.delete(ticket);

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  res.write(`event: admin:ready\ndata: ${JSON.stringify({ ok: true })}\n\n`);

  const onOrderEvent = (payload: unknown) => {
    res.write(`event: order:event\ndata: ${JSON.stringify(payload)}\n\n`);
  };
  adminOrderBus.on('order:event', onOrderEvent);

  const keepAlive = setInterval(() => {
    res.write(': keepalive\n\n');
  }, 25000);

  req.on('close', () => {
    clearInterval(keepAlive);
    adminOrderBus.off('order:event', onOrderEvent);
  });
});

function buildSalesReports(allOrders: Array<{ status: string; total: number; orderType: string; createdAt: Date }>) {
  const istFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const monthFormatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    month: 'short',
    year: 'numeric',
  });
  const dayLabelFormatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
  });

  const nonCancelled = allOrders.filter((o) => o.status !== 'cancelled');
  const now = new Date();

  const orderIstDates = allOrders.map((o) => ({
    ...o,
    istDate: istFormatter.format(new Date(o.createdAt)),
  }));

  // Daily (last 14 IST days)
  const dailySales: Array<{ date: string; label: string; orders: number; completed: number; sales: number }> = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const key = istFormatter.format(d);
    const dayOrders = orderIstDates.filter((o) => o.istDate === key && o.status !== 'cancelled');
    dailySales.push({
      date: key,
      label: dayLabelFormatter.format(d),
      orders: dayOrders.length,
      completed: dayOrders.filter((o) => o.status === 'completed').length,
      sales: dayOrders.reduce((s, o) => s + (o.total || 0), 0),
    });
  }

  // Weekly (last 8 weeks)
  const weeklySales: Array<{ weekStart: string; label: string; orders: number; completed: number; sales: number }> = [];
  for (let w = 7; w >= 0; w--) {
    const endD = new Date(now.getTime() - w * 7 * 86400000);
    const startD = new Date(endD.getTime() - 6 * 86400000);
    const startKey = istFormatter.format(startD);
    const endKey = istFormatter.format(endD);
    const weekOrders = orderIstDates.filter(
      (o) => o.istDate >= startKey && o.istDate <= endKey && o.status !== 'cancelled'
    );
    weeklySales.push({
      weekStart: startKey,
      label: `${dayLabelFormatter.format(startD)} – ${dayLabelFormatter.format(endD)}`,
      orders: weekOrders.length,
      completed: weekOrders.filter((o) => o.status === 'completed').length,
      sales: weekOrders.reduce((s, o) => s + (o.total || 0), 0),
    });
  }

  // Monthly (last 6 months)
  const monthlySales: Array<{ month: string; label: string; orders: number; completed: number; sales: number }> = [];
  for (let m = 5; m >= 0; m--) {
    const d = new Date(now.getFullYear(), now.getMonth() - m, 15);
    const monthKey = istFormatter.format(d).slice(0, 7);
    const monthOrders = orderIstDates.filter(
      (o) => o.istDate.startsWith(monthKey) && o.status !== 'cancelled'
    );
    monthlySales.push({
      month: monthKey,
      label: monthFormatter.format(d),
      orders: monthOrders.length,
      completed: monthOrders.filter((o) => o.status === 'completed').length,
      sales: monthOrders.reduce((s, o) => s + (o.total || 0), 0),
    });
  }

  const pickupOrders = nonCancelled.filter((o) => o.orderType === 'pickup');
  const deliveryOrders = nonCancelled.filter((o) => o.orderType === 'delivery');

  return {
    dailySales,
    weeklySales,
    monthlySales,
    orderTypeBreakdown: {
      pickup: pickupOrders.length,
      delivery: deliveryOrders.length,
      pickupSales: pickupOrders.reduce((s, o) => s + (o.total || 0), 0),
      deliverySales: deliveryOrders.reduce((s, o) => s + (o.total || 0), 0),
    },
  };
}

app.get('/api/admin/overview', requireAuth, requireStaffOrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    await ensureSeeded();
    const { istDateISO } = getIstNowParts();
    const isAdmin = req.dbUser?.role === 'admin';

    const [
      allOrders,
      allCustomers,
      allLeads,
      allFeedback,
      allMessages,
      allOrderItems,
      settingsList,
      hoursList,
      categories,
      items,
      specialList,
      gallery,
      campaigns,
      teamUsers,
    ] = await Promise.all([
      db.select().from(orders).orderBy(desc(orders.createdAt)),
      db.select().from(customers).orderBy(desc(customers.updatedAt)),
      isAdmin ? db.select().from(leads).orderBy(desc(leads.createdAt)) : Promise.resolve([]),
      isAdmin ? db.select().from(feedback).orderBy(desc(feedback.createdAt)) : Promise.resolve([]),
      db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt)),
      db.select().from(orderItems),
      db.select().from(restaurantSettings).limit(1),
      db.select().from(openingHours).orderBy(asc(openingHours.dayOfWeek)),
      db.select().from(menuCategories).orderBy(asc(menuCategories.sortOrder), asc(menuCategories.id)),
      db.select().from(menuItems).orderBy(asc(menuItems.sortOrder), asc(menuItems.id)),
      db.select().from(todaysSpecial).limit(1),
      db.select().from(galleryItems).orderBy(asc(galleryItems.sortOrder), asc(galleryItems.id)),
      isAdmin ? db.select().from(festivalCampaigns).orderBy(desc(festivalCampaigns.createdAt)) : Promise.resolve([]),
      isAdmin ? listTeamUsers() : Promise.resolve([]),
    ]);

    const istDateFmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    const isOrderToday = (o: (typeof allOrders)[number]) => {
      if (o.pickupDate === istDateISO) return true;
      const createdIst = o.createdAt ? istDateFmt.format(new Date(o.createdAt)) : '';
      return createdIst === istDateISO;
    };

    const todaysOrdersCount = allOrders.filter(isOrderToday).length;
    const nonCancelledOrders = allOrders.filter((o) => o.status !== 'cancelled');
    const totalSales = nonCancelledOrders.reduce((acc, o) => acc + (o.total || 0), 0);
    const todaysSales = nonCancelledOrders
      .filter(isOrderToday)
      .reduce((acc, o) => acc + (o.total || 0), 0);
    const completedOrders = allOrders.filter((o) => o.status === 'completed');
    const completedSales = completedOrders.reduce((acc, o) => acc + (o.total || 0), 0);
    const averageOrderValue =
      nonCancelledOrders.length > 0 ? Math.round(totalSales / nonCancelledOrders.length) : 0;

    const rewardsRedeemedCount = allCustomers.reduce((acc, c) => acc + c.rewardsRedeemed, 0);

    const statusCounts: Record<string, number> = {
      new: 0,
      confirmed: 0,
      preparing: 0,
      ready: 0,
      completed: 0,
      cancelled: 0,
    };
    for (const o of allOrders) {
      statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
    }

    const pendingOrdersCount = (statusCounts.new || 0) + (statusCounts.confirmed || 0);

    const dishQtyMap: Record<string, { quantity: number; revenue: number }> = {};
    for (const oi of allOrderItems) {
      if (!dishQtyMap[oi.dishName]) dishQtyMap[oi.dishName] = { quantity: 0, revenue: 0 };
      dishQtyMap[oi.dishName].quantity += oi.quantity;
      dishQtyMap[oi.dishName].revenue += oi.lineTotal || 0;
    }
    const popularOrderedDishes = Object.entries(dishQtyMap)
      .map(([name, info]) => ({ name, quantity: info.quantity, revenue: info.revenue }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 8);

    const itemsByOrder: Record<number, typeof allOrderItems> = {};
    for (const oi of allOrderItems) {
      if (!itemsByOrder[oi.orderId]) itemsByOrder[oi.orderId] = [];
      itemsByOrder[oi.orderId].push(oi);
    }

    const loyaltyRewardedOrders = await db
      .select({ orderId: loyaltyTransactions.orderId })
      .from(loyaltyTransactions);
    const stampedOrderIds = new Set(
      loyaltyRewardedOrders.map((t) => t.orderId).filter((id): id is number => id !== null)
    );

    const enrichedOrders = allOrders.map((o) => ({
      ...o,
      items: itemsByOrder[o.id] || [],
      hasLoyaltyStamp: stampedOrderIds.has(o.id),
    }));

    // Enrich customers with order history summary
    const enrichedCustomers = allCustomers.map((c) => {
      const custOrders = enrichedOrders.filter(
        (o) => o.customerId === c.id || o.customerPhone === c.phone
      );
      const totalSpent = custOrders
        .filter((o) => o.status !== 'cancelled')
        .reduce((sum, o) => sum + (o.total || 0), 0);
      return {
        ...c,
        orderCount: custOrders.length,
        totalSpent,
        lastOrderAt: custOrders[0]?.createdAt || null,
      };
    });

    const reports = isAdmin ? buildSalesReports(allOrders) : null;

    res.json({
      currentUser: req.dbUser,
      stats: {
        totalOrders: allOrders.length,
        todaysOrders: todaysOrdersCount,
        pendingOrders: pendingOrdersCount,
        completedOrders: completedOrders.length,
        totalSales: isAdmin ? totalSales : null,
        todaysSales: isAdmin ? todaysSales : null,
        completedSales: isAdmin ? completedSales : null,
        averageOrderValue: isAdmin ? averageOrderValue : null,
        totalCustomers: allCustomers.length,
        totalLeads: isAdmin ? allLeads.filter((l) => l.consentStatus && !l.unsubscribed).length : 0,
        totalLeadsAll: isAdmin ? allLeads.length : 0,
        rewardsRedeemed: rewardsRedeemedCount,
        totalFeedback: isAdmin ? allFeedback.length : 0,
        statusCounts,
        popularOrderedDishes,
      },
      reports,
      settings: settingsList[0] || null,
      openingHours: hoursList,
      categories,
      menuItems: items,
      todaysSpecial: specialList[0] || null,
      galleryItems: gallery,
      orders: enrichedOrders,
      customers: enrichedCustomers,
      leads: allLeads,
      feedback: allFeedback,
      messages: allMessages,
      unreadMessagesCount: allMessages.filter((m) => !m.isRead).length,
      campaigns,
      teamUsers,
      whatsappApiConfigured: getWhatsAppApiStatus().configured,
    });
  } catch (error) {
    console.error('Error loading admin overview:', error);
    res.status(500).json({ error: 'Failed to load admin overview.' });
  }
});

// Upload image safely
app.post('/api/admin/upload', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { dataUrl } = req.body as { dataUrl?: string };
    if (!dataUrl || typeof dataUrl !== 'string') {
      return res.status(400).json({ error: 'Image data is required.' });
    }
    const match = dataUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=]+)$/);
    if (!match) {
      return res.status(400).json({ error: 'Only PNG, JPEG, or WebP images are supported.' });
    }
    const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length > 2 * 1024 * 1024) {
      return res.status(400).json({ error: 'Image must be 2 MB or smaller.' });
    }
    const filename = `${crypto.randomUUID()}.${ext}`;
    const targetPath = path.resolve(uploadsDir, filename);
    if (!targetPath.startsWith(uploadsDir + path.sep)) {
      return res.status(400).json({ error: 'Invalid upload destination.' });
    }
    fs.writeFileSync(targetPath, buffer);
    res.status(201).json({ url: `/uploads/${filename}` });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ error: 'Failed to upload image.' });
  }
});

// Restaurant Settings Update
app.put('/api/admin/settings', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const schema = z.object({
      name: z.string().trim().min(2).max(100),
      teluguName: z.string().trim().min(1).max(100),
      address: z.string().trim().min(5).max(300),
      plusCode: z.string().trim().min(3).max(100),
      phone: z.string().trim().max(25).nullable().optional(),
      whatsappNumber: z.string().trim().max(25).nullable().optional(),
      googleMapsUrl: z.string().trim().max(500).nullable().optional(),
      googleReviewUrl: z.string().trim().max(500).nullable().optional(),
      instagramUrl: z.string().trim().max(300).nullable().optional(),
      facebookUrl: z.string().trim().max(300).nullable().optional(),
      deliveryEnabled: z.boolean(),
      deliveryCharge: z.number().int().min(0).max(5000).nullable().optional(),
      heroHeadline: z.string().trim().min(5).max(200),
      heroSubtext: z.string().trim().min(10).max(500),
      aboutText: z.string().trim().min(10).max(1500),
      loyaltyTargetMeals: z.number().int().min(2).max(30),
      birthdayDiscountPercent: z.number().int().min(1).max(100),
      birthdayMaxDiscount: z.number().int().min(0).max(50000),
      loyaltyRulesText: z.string().trim().min(5).max(1000),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid settings.' });
    }
    const d = parsed.data;
    const urls = [d.googleMapsUrl, d.googleReviewUrl, d.instagramUrl, d.facebookUrl];
    if (urls.some((u) => u && !isValidSafeUrl(u))) {
      return res.status(400).json({ error: 'URLs must start with https:// or http://' });
    }
    const cleanWhatsapp = d.whatsappNumber ? normalizeIndianPhone(d.whatsappNumber) : null;
    if (cleanWhatsapp && !/^[6-9]\d{9}$/.test(cleanWhatsapp)) {
      return res.status(400).json({ error: 'WhatsApp number must be a valid 10-digit Indian mobile number.' });
    }

    const existing = await db.select().from(restaurantSettings).limit(1);
    const payload = {
      name: sanitizeText(d.name, 100),
      teluguName: sanitizeText(d.teluguName, 100),
      address: sanitizeText(d.address, 300),
      plusCode: sanitizeText(d.plusCode, 100),
      phone: d.phone ? sanitizeText(d.phone, 25) : null,
      whatsappNumber: cleanWhatsapp,
      googleMapsUrl: d.googleMapsUrl || null,
      googleReviewUrl: d.googleReviewUrl || null,
      instagramUrl: d.instagramUrl || null,
      facebookUrl: d.facebookUrl || null,
      deliveryEnabled: d.deliveryEnabled,
      deliveryCharge: d.deliveryCharge ?? null,
      heroHeadline: sanitizeText(d.heroHeadline, 200),
      heroSubtext: sanitizeText(d.heroSubtext, 500),
      aboutText: sanitizeText(d.aboutText, 1500),
      loyaltyTargetMeals: d.loyaltyTargetMeals,
      birthdayDiscountPercent: d.birthdayDiscountPercent,
      birthdayMaxDiscount: d.birthdayMaxDiscount,
      loyaltyRulesText: sanitizeText(d.loyaltyRulesText, 1000),
      updatedAt: new Date(),
    };

    const updated =
      existing.length > 0
        ? await db
            .update(restaurantSettings)
            .set(payload)
            .where(eq(restaurantSettings.id, existing[0].id))
            .returning()
        : await db.insert(restaurantSettings).values(payload).returning();

    emitCatalogUpdated('settings');
    res.json({ settings: updated[0] });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update restaurant settings.' });
  }
});

// Opening Hours Update
app.put('/api/admin/hours', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const schema = z.object({
      hours: z
        .array(
          z.object({
            dayOfWeek: z.number().int().min(0).max(6),
            openTime: z.string().regex(/^\d{2}:\d{2}$/),
            closeTime: z
              .string()
              .regex(/^\d{2}:\d{2}$/)
              .nullable()
              .optional(),
            isClosed: z.boolean(),
            specialNote: z.string().max(150).nullable().optional(),
          })
        )
        .length(7),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Provide valid opening hours for all 7 days.' });
    }

    for (const h of parsed.data.hours) {
      await db
        .update(openingHours)
        .set({
          openTime: h.openTime,
          closeTime: h.closeTime || null,
          isClosed: h.isClosed,
          specialNote: h.specialNote ? sanitizeText(h.specialNote, 150) : null,
          updatedAt: new Date(),
        })
        .where(eq(openingHours.dayOfWeek, h.dayOfWeek));
    }

    const updated = await db
      .select()
      .from(openingHours)
      .orderBy(asc(openingHours.dayOfWeek));
    emitCatalogUpdated('hours');
    res.json({ openingHours: updated });
  } catch (error) {
    console.error('Error updating opening hours:', error);
    res.status(500).json({ error: 'Failed to update opening hours.' });
  }
});

// Menu Category CRUD
app.post('/api/admin/categories', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const schema = z.object({
      name: z.string().trim().min(2).max(60),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Category name is required.' });
    }
    const name = sanitizeText(parsed.data.name, 60);
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const created = await db
      .insert(menuCategories)
      .values({ name, slug, sortOrder: 99, isActive: true })
      .returning();
    emitCatalogUpdated('categories');
    res.status(201).json({ category: created[0] });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(400).json({ error: 'Category already exists or could not be created.' });
  }
});

app.put('/api/admin/categories/:id', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid category ID.' });
    }
    const schema = z.object({
      name: z.string().trim().min(2).max(60),
      isActive: z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Valid category name is required.' });
    }
    const name = sanitizeText(parsed.data.name, 60);
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const [updated] = await db
      .update(menuCategories)
      .set({
        name,
        slug,
        ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
      })
      .where(eq(menuCategories.id, id))
      .returning();
    if (!updated) {
      return res.status(404).json({ error: 'Category not found.' });
    }
    emitCatalogUpdated('categories');
    res.json({ category: updated });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(400).json({ error: 'Could not update category (name may already exist).' });
  }
});

app.delete('/api/admin/categories/:id', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid category ID.' });
    }
    await db.delete(menuCategories).where(eq(menuCategories.id, id));
    emitCatalogUpdated('categories');
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Failed to delete category.' });
  }
});

// Menu Items CRUD
const menuItemBodySchema = z.object({
  categoryId: z.number().int().positive(),
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().min(3).max(400),
  price: z.number().int().min(1).max(50000).nullable().optional(),
  isPriceConfirmed: z.boolean().optional(),
  isVeg: z.boolean(),
  isSpicy: z.boolean(),
  isAvailable: z.boolean(),
  isBestseller: z.boolean(),
  imageUrl: z.string().trim().max(500).nullable().optional(),
});

app.post('/api/admin/menu', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const parsed = menuItemBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid dish data.' });
    }
    const d = parsed.data;
    if (d.imageUrl && !isValidSafeUrl(d.imageUrl)) {
      return res.status(400).json({ error: 'Invalid image URL.' });
    }
    const hasPrice = d.price !== null && d.price !== undefined && d.price > 0;
    const created = await db
      .insert(menuItems)
      .values({
        categoryId: d.categoryId,
        name: sanitizeText(d.name, 100),
        description: sanitizeText(d.description, 400),
        price: hasPrice ? d.price! : null,
        isPriceConfirmed: Boolean(hasPrice && (d.isPriceConfirmed ?? true)),
        isVeg: d.isVeg,
        isSpicy: d.isSpicy,
        isAvailable: d.isAvailable,
        isBestseller: d.isBestseller,
        imageUrl: d.imageUrl || null,
      })
      .returning();
    emitCatalogUpdated('menu');
    res.status(201).json({ item: created[0] });
  } catch (error) {
    console.error('Error creating menu item:', error);
    res.status(500).json({ error: 'Failed to add menu item.' });
  }
});

app.put('/api/admin/menu/:id', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid menu item ID.' });
    }
    const parsed = menuItemBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid dish data.' });
    }
    const d = parsed.data;
    if (d.imageUrl && !isValidSafeUrl(d.imageUrl)) {
      return res.status(400).json({ error: 'Invalid image URL.' });
    }
    const hasPrice = d.price !== null && d.price !== undefined && d.price > 0;
    const updated = await db
      .update(menuItems)
      .set({
        categoryId: d.categoryId,
        name: sanitizeText(d.name, 100),
        description: sanitizeText(d.description, 400),
        price: hasPrice ? d.price! : null,
        isPriceConfirmed: Boolean(hasPrice && (d.isPriceConfirmed ?? true)),
        isVeg: d.isVeg,
        isSpicy: d.isSpicy,
        isAvailable: d.isAvailable,
        isBestseller: d.isBestseller,
        imageUrl: d.imageUrl || null,
        updatedAt: new Date(),
      })
      .where(eq(menuItems.id, id))
      .returning();
    emitCatalogUpdated('menu');
    res.json({ item: updated[0] });
  } catch (error) {
    console.error('Error updating menu item:', error);
    res.status(500).json({ error: 'Failed to update menu item.' });
  }
});

// Quick Availability Toggle (allowed for both Staff and Admin)
app.patch('/api/admin/menu/:id/availability', requireAuth, requireStaffOrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid menu item ID.' });
    }
    const schema = z.object({ isAvailable: z.boolean() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Availability boolean is required.' });
    }
    const [updated] = await db
      .update(menuItems)
      .set({ isAvailable: parsed.data.isAvailable, updatedAt: new Date() })
      .where(eq(menuItems.id, id))
      .returning();
    if (!updated) {
      return res.status(404).json({ error: 'Menu item not found.' });
    }
    emitCatalogUpdated('menu');
    res.json({ item: updated });
  } catch (error) {
    console.error('Error toggling menu item availability:', error);
    res.status(500).json({ error: 'Failed to update item availability.' });
  }
});

app.delete('/api/admin/menu/:id', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid menu item ID.' });
    }
    await db.delete(menuItems).where(eq(menuItems.id, id));
    emitCatalogUpdated('menu');
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting menu item:', error);
    res.status(500).json({ error: 'Failed to delete menu item.' });
  }
});

// Today's Special Update
app.put('/api/admin/special', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const schema = z.object({
      dishName: z.string().trim().min(2).max(120),
      description: z.string().trim().min(5).max(500),
      specialPrice: z.number().int().min(1).max(50000).nullable().optional(),
      originalPrice: z.number().int().min(1).max(50000).nullable().optional(),
      imageUrl: z.string().trim().max(500).nullable().optional(),
      validDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      isAvailable: z.boolean(),
      isEnabled: z.boolean(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid special fields.' });
    }
    const d = parsed.data;
    if (d.imageUrl && !isValidSafeUrl(d.imageUrl)) {
      return res.status(400).json({ error: 'Invalid image URL.' });
    }

    const existing = await db.select().from(todaysSpecial).limit(1);
    const payload = {
      dishName: sanitizeText(d.dishName, 120),
      description: sanitizeText(d.description, 500),
      specialPrice: d.specialPrice ?? null,
      originalPrice: d.originalPrice ?? null,
      imageUrl: d.imageUrl || null,
      validDate: d.validDate,
      isAvailable: d.isAvailable,
      isEnabled: d.isEnabled,
      updatedAt: new Date(),
    };

    const saved =
      existing.length > 0
        ? await db
            .update(todaysSpecial)
            .set(payload)
            .where(eq(todaysSpecial.id, existing[0].id))
            .returning()
        : await db.insert(todaysSpecial).values(payload).returning();

    emitCatalogUpdated('special');
    res.json({ todaysSpecial: saved[0] });
  } catch (error) {
    console.error('Error updating today special:', error);
    res.status(500).json({ error: 'Failed to update Today’s Special.' });
  }
});

// Gallery CRUD
app.post('/api/admin/gallery', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const schema = z.object({
      title: z.string().trim().min(2).max(100),
      category: z.string().trim().min(2).max(60),
      imageUrl: z.string().trim().min(2).max(500),
      caption: z.string().trim().max(300).nullable().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid gallery item.' });
    }
    if (!isValidSafeUrl(parsed.data.imageUrl)) {
      return res.status(400).json({ error: 'Invalid image URL.' });
    }
    const created = await db
      .insert(galleryItems)
      .values({
        title: sanitizeText(parsed.data.title, 100),
        category: sanitizeText(parsed.data.category, 60),
        imageUrl: parsed.data.imageUrl,
        caption: parsed.data.caption ? sanitizeText(parsed.data.caption, 300) : null,
      })
      .returning();
    emitCatalogUpdated('gallery');
    res.status(201).json({ item: created[0] });
  } catch (error) {
    console.error('Error adding gallery item:', error);
    res.status(500).json({ error: 'Failed to add gallery photo.' });
  }
});

app.delete('/api/admin/gallery/:id', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid gallery ID.' });
    }
    await db.delete(galleryItems).where(eq(galleryItems.id, id));
    emitCatalogUpdated('gallery');
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting gallery item:', error);
    res.status(500).json({ error: 'Failed to delete gallery photo.' });
  }
});

// Order Status Update (allowed for both Staff and Admin; notifies customer & admin streams)
app.patch('/api/admin/orders/:id/status', requireAuth, requireStaffOrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid order ID.' });
    }
    const schema = z.object({
      status: z.enum(['new', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled']),
      awardStamp: z.boolean().optional().default(false),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid order status.' });
    }

    const updatedList = await db
      .update(orders)
      .set({ status: parsed.data.status, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();

    if (updatedList.length === 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }
    const order = updatedList[0];

    let stampAwarded = false;
    if (parsed.data.status === 'completed' && parsed.data.awardStamp && order.customerId) {
      stampAwarded = await awardLoyaltyStampForCustomer(order.customerId, order.id, `Completed order ${order.orderNumber}`);
    }

    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id));
    const loyaltyTx = await db
      .select({ id: loyaltyTransactions.id })
      .from(loyaltyTransactions)
      .where(eq(loyaltyTransactions.orderId, order.id))
      .limit(1);
    const enrichedOrder = {
      ...order,
      items,
      hasLoyaltyStamp: loyaltyTx.length > 0,
    };

    orderStatusBus.emit(`order:${order.orderNumber}`, enrichedOrder);
    adminOrderBus.emit('order:event', { type: 'updated', order: enrichedOrder });

    res.json({ order: enrichedOrder, stampAwarded });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update order status.' });
  }
});

async function awardLoyaltyStampForCustomer(
  customerId: number,
  orderId: number | null,
  notes: string
): Promise<boolean> {
  const [settingsRow] = await db.select().from(restaurantSettings).limit(1);
  const targetMeals = settingsRow?.loyaltyTargetMeals ?? 10;

  // Prevent duplicate stamps for the same order
  if (orderId !== null) {
    const existingTx = await db
      .select()
      .from(loyaltyTransactions)
      .where(eq(loyaltyTransactions.orderId, orderId))
      .limit(1);
    if (existingTx.length > 0) {
      return false;
    }
  }

  const custRows = await db
    .select()
    .from(customers)
    .where(eq(customers.id, customerId))
    .limit(1);
  if (custRows.length === 0) return false;
  const cust = custRows[0];

  await db.insert(loyaltyTransactions).values({
    customerId,
    orderId,
    type: 'stamp_earned',
    stampsDelta: 1,
    notes,
  });

  const nextStamps = cust.stampsCount + 1;
  const reachedReward = nextStamps >= targetMeals;

  if (reachedReward) {
    const rewardCode = `SDR-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    await db.insert(loyaltyRewards).values({
      customerId,
      rewardCode,
      status: 'available',
      notes: `Earned on meal #${cust.totalCompletedMeals + 1}`,
    });
  }

  await db
    .update(customers)
    .set({
      stampsCount: nextStamps > targetMeals ? targetMeals : nextStamps,
      totalCompletedMeals: cust.totalCompletedMeals + 1,
      rewardsAvailable: reachedReward ? cust.rewardsAvailable + 1 : cust.rewardsAvailable,
      updatedAt: new Date(),
    })
    .where(eq(customers.id, customerId));

  return true;
}

// Loyalty Customer Management (allowed for Staff and Admin)
app.post('/api/admin/customers', requireAuth, requireStaffOrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const schema = z.object({
      name: z.string().trim().min(2).max(80),
      phone: indianPhoneSchema,
      birthday: z.string().trim().max(20).nullable().optional(),
      birthdayConsent: z.boolean().optional().default(false),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid customer data.' });
    }

    const d = parsed.data;
    const saved = await db
      .insert(customers)
      .values({
        name: sanitizeText(d.name, 80),
        phone: d.phone,
        birthday: d.birthdayConsent && d.birthday ? sanitizeText(d.birthday, 20) : null,
        birthdayConsent: Boolean(d.birthdayConsent && d.birthday),
      })
      .onConflictDoUpdate({
        target: customers.phone,
        set: {
          name: sanitizeText(d.name, 80),
          birthday: d.birthdayConsent && d.birthday ? sanitizeText(d.birthday, 20) : undefined,
          birthdayConsent: d.birthdayConsent,
          updatedAt: new Date(),
        },
      })
      .returning();

    res.status(201).json({ customer: saved[0] });
  } catch (error) {
    console.error('Error registering customer:', error);
    res.status(500).json({ error: 'Failed to register customer.' });
  }
});

app.post('/api/admin/customers/:id/stamp', requireAuth, requireStaffOrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid customer ID.' });
    }
    const orderId = req.body?.orderId ? Number(req.body.orderId) : null;
    const notes = sanitizeText(req.body?.notes || 'Eligible completed meal verified by staff', 200);
    const awarded = await awardLoyaltyStampForCustomer(id, orderId, notes);
    if (!awarded) {
      return res.status(409).json({ error: 'Stamp was already awarded for this order or customer not found.' });
    }
    const [updated] = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
    res.json({ customer: updated });
  } catch (error) {
    console.error('Error awarding loyalty stamp:', error);
    res.status(500).json({ error: 'Failed to award stamp.' });
  }
});

app.post('/api/admin/customers/:id/redeem', requireAuth, requireStaffOrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid customer ID.' });
    }
    const [cust] = await db.select().from(customers).where(eq(customers.id, id)).limit(1);
    if (!cust) {
      return res.status(404).json({ error: 'Customer not found.' });
    }
    if (cust.rewardsAvailable <= 0) {
      return res.status(400).json({ error: 'Customer has no available meal reward to redeem yet.' });
    }

    const availableReward = await db
      .select()
      .from(loyaltyRewards)
      .where(and(eq(loyaltyRewards.customerId, id), eq(loyaltyRewards.status, 'available')))
      .orderBy(asc(loyaltyRewards.createdAt))
      .limit(1);

    if (availableReward.length > 0) {
      await db
        .update(loyaltyRewards)
        .set({ status: 'redeemed', redeemedAt: new Date() })
        .where(eq(loyaltyRewards.id, availableReward[0].id));
    }

    await db.insert(loyaltyTransactions).values({
      customerId: id,
      orderId: null,
      type: 'reward_redeemed',
      stampsDelta: -10,
      notes: '10th meal reward redeemed at restaurant',
    });

    const [updated] = await db
      .update(customers)
      .set({
        stampsCount: 0,
        rewardsAvailable: Math.max(0, cust.rewardsAvailable - 1),
        rewardsRedeemed: cust.rewardsRedeemed + 1,
        updatedAt: new Date(),
      })
      .where(eq(customers.id, id))
      .returning();

    res.json({ customer: updated });
  } catch (error) {
    console.error('Error redeeming reward:', error);
    res.status(500).json({ error: 'Failed to redeem reward.' });
  }
});

// Leads Unsubscribe by Admin
app.patch('/api/admin/leads/:id/unsubscribe', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid lead ID.' });
    }
    const [updated] = await db
      .update(leads)
      .set({
        unsubscribed: true,
        unsubscribedAt: new Date(),
        consentStatus: false,
      })
      .where(eq(leads.id, id))
      .returning();
    res.json({ lead: updated });
  } catch (error) {
    console.error('Error updating lead:', error);
    res.status(500).json({ error: 'Failed to unsubscribe lead.' });
  }
});

// Festival Campaigns
app.post('/api/admin/campaigns', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const schema = z.object({
      festivalName: z.string().trim().min(2).max(80),
      greetingMessage: z.string().trim().min(10).max(1000),
      offerText: z.string().trim().max(300).nullable().optional(),
      scheduledAt: z.string().trim().max(40).nullable().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid campaign details.' });
    }
    const waApi = getWhatsAppApiStatus();
    const created = await db
      .insert(festivalCampaigns)
      .values({
        festivalName: sanitizeText(parsed.data.festivalName, 80),
        greetingMessage: sanitizeText(parsed.data.greetingMessage, 1000),
        offerText: parsed.data.offerText ? sanitizeText(parsed.data.offerText, 300) : null,
        scheduledAt: parsed.data.scheduledAt || null,
        mode: waApi.configured ? 'whatsapp_api' : 'manual',
        status: parsed.data.scheduledAt ? 'scheduled' : 'draft',
      })
      .returning();
    res.status(201).json({ campaign: created[0] });
  } catch (error) {
    console.error('Error creating campaign:', error);
    res.status(500).json({ error: 'Failed to create campaign.' });
  }
});

app.post('/api/admin/campaigns/:id/send', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid campaign ID.' });
    }
    const [campaign] = await db
      .select()
      .from(festivalCampaigns)
      .where(eq(festivalCampaigns.id, id))
      .limit(1);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found.' });
    }

    const consentedLeads = await db
      .select()
      .from(leads)
      .where(and(eq(leads.consentStatus, true), eq(leads.unsubscribed, false)));

    const existingDeliveries = await db
      .select()
      .from(campaignDeliveries)
      .where(eq(campaignDeliveries.campaignId, id));
    const alreadyProcessedLeadIds = new Set(existingDeliveries.map((d) => d.leadId));

    const newRecipients = consentedLeads.filter((l) => !alreadyProcessedLeadIds.has(l.id));
    const waApi = getWhatsAppApiStatus();
    const fullMessage = campaign.offerText
      ? `${campaign.greetingMessage}\n\nSpecial Offer: ${campaign.offerText}`
      : campaign.greetingMessage;

    if (!waApi.configured) {
      // Manual WhatsApp campaign mode — never pretend automated sending occurred
      for (const lead of newRecipients) {
        await db
          .insert(campaignDeliveries)
          .values({
            campaignId: id,
            leadId: lead.id,
            phone: lead.phone,
            status: 'pending',
          })
          .onConflictDoNothing();
      }
      const allDeliveries = await db
        .select()
        .from(campaignDeliveries)
        .where(eq(campaignDeliveries.campaignId, id));

      await db
        .update(festivalCampaigns)
        .set({
          mode: 'manual',
          status: 'manual_ready',
          recipientCount: allDeliveries.length,
        })
        .where(eq(festivalCampaigns.id, id));

      const manualLinks = consentedLeads.map((lead) => {
        const personalized = lead.name
          ? `Namaste ${lead.name}! ${fullMessage}`
          : fullMessage;
        const delivery = allDeliveries.find((d) => d.leadId === lead.id);
        return {
          deliveryId: delivery?.id ?? null,
          leadId: lead.id,
          name: lead.name || 'Guest',
          phone: lead.phone,
          status: delivery?.status || 'pending',
          whatsappUrl: `https://wa.me/91${lead.phone}?text=${encodeURIComponent(personalized)}`,
        };
      });

      return res.json({
        mode: 'manual',
        automatedSent: false,
        message:
          'WhatsApp Business API credentials are not configured. Generated personalized manual WhatsApp send links for consented subscribers.',
        recipients: manualLinks,
      });
    }

    // Automated WhatsApp Business Cloud API sending with rate-limiting
    let sentCount = 0;
    let failedCount = 0;
    for (const lead of newRecipients) {
      const personalized = lead.name
        ? `Namaste ${lead.name}! ${fullMessage}`
        : fullMessage;
      let status: 'sent' | 'failed' = 'failed';
      try {
        const resp = await fetch(
          `https://graph.facebook.com/v20.0/${encodeURIComponent(waApi.phoneId)}/messages`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${waApi.token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: `91${lead.phone}`,
              type: 'text',
              text: { body: personalized },
            }),
          }
        );
        if (resp.ok) {
          status = 'sent';
          sentCount += 1;
        } else {
          failedCount += 1;
        }
      } catch {
        failedCount += 1;
      }

      await db
        .insert(campaignDeliveries)
        .values({
          campaignId: id,
          leadId: lead.id,
          phone: lead.phone,
          status,
          sentAt: status === 'sent' ? new Date() : null,
        })
        .onConflictDoNothing();

      await new Promise((r) => setTimeout(r, 120));
    }

    await db
      .update(festivalCampaigns)
      .set({
        mode: 'whatsapp_api',
        status: 'sent',
        recipientCount: consentedLeads.length,
        sentAt: new Date(),
      })
      .where(eq(festivalCampaigns.id, id));

    res.json({
      mode: 'whatsapp_api',
      automatedSent: true,
      sentCount,
      failedCount,
      message: `Dispatched via WhatsApp Business API: ${sentCount} sent, ${failedCount} failed.`,
    });
  } catch (error) {
    console.error('Error sending campaign:', error);
    res.status(500).json({ error: 'Failed to process campaign.' });
  }
});

app.post('/api/admin/campaigns/deliveries/:deliveryId/mark-sent', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const deliveryId = Number(req.params.deliveryId);
    if (!Number.isInteger(deliveryId) || deliveryId <= 0) {
      return res.status(400).json({ error: 'Invalid delivery ID.' });
    }
    const [updated] = await db
      .update(campaignDeliveries)
      .set({ status: 'sent', sentAt: new Date() })
      .where(eq(campaignDeliveries.id, deliveryId))
      .returning();
    res.json({ delivery: updated });
  } catch (error) {
    console.error('Error marking delivery sent:', error);
    res.status(500).json({ error: 'Failed to update delivery status.' });
  }
});

// Feedback Review & CSV Export
app.patch('/api/admin/feedback/:id/review', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid feedback ID.' });
    }
    const isReviewed = Boolean(req.body?.isReviewed ?? true);
    const [updated] = await db
      .update(feedback)
      .set({ isReviewed })
      .where(eq(feedback.id, id))
      .returning();
    res.json({ feedback: updated });
  } catch (error) {
    console.error('Error marking feedback reviewed:', error);
    res.status(500).json({ error: 'Failed to update feedback.' });
  }
});

// Customer Contact Messages Management
app.patch('/api/admin/messages/:id/read', requireAuth, requireStaffOrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid message ID.' });
    }
    const isRead = Boolean(req.body?.isRead ?? true);
    const [updated] = await db
      .update(contactMessages)
      .set({ isRead })
      .where(eq(contactMessages.id, id))
      .returning();
    if (!updated) {
      return res.status(404).json({ error: 'Message not found.' });
    }
    res.json({ message: updated });
  } catch (error) {
    console.error('Error updating message status:', error);
    res.status(500).json({ error: 'Failed to update message.' });
  }
});

app.delete('/api/admin/messages/:id', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid message ID.' });
    }
    await db.delete(contactMessages).where(eq(contactMessages.id, id));
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: 'Failed to delete message.' });
  }
});

app.get('/api/admin/feedback/export', requireAuth, requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const rows = await db.select().from(feedback).orderBy(desc(feedback.createdAt));
    const headers = [
      'Reference',
      'Customer Name',
      'Phone',
      'Food Rating',
      'Service Rating',
      'Ambiance Rating',
      'Overall Rating',
      'Written Feedback',
      'Suggestions',
      'Reviewed',
      'Submitted At',
    ];
    const lines = [
      headers.map(sanitizeCsvCell).join(','),
      ...rows.map((r) =>
        [
          r.referenceNumber,
          r.customerName || '',
          r.customerPhone || '',
          r.foodRating,
          r.serviceRating,
          r.ambianceRating,
          r.overallRating,
          r.writtenFeedback || '',
          r.suggestions || '',
          r.isReviewed ? 'Yes' : 'No',
          r.createdAt ? new Date(r.createdAt).toISOString() : '',
        ]
          .map(sanitizeCsvCell)
          .join(',')
      ),
    ];
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="signature-dine-feedback.csv"');
    res.send(lines.join('\n'));
  } catch (error) {
    console.error('Error exporting feedback CSV:', error);
    res.status(500).json({ error: 'Failed to export feedback.' });
  }
});

// Sales Reports CSV Export (Admin-only)
app.get('/api/admin/reports/export', requireAuth, requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));
    const reports = buildSalesReports(allOrders);
    const headers = ['Period Type', 'Period Label', 'Total Orders', 'Completed Orders', 'Sales (INR)'];
    const rows = [
      ...reports.dailySales.map((d) => ['Daily', d.date, d.orders, d.completed, d.sales]),
      ...reports.weeklySales.map((w) => ['Weekly', w.label, w.orders, w.completed, w.sales]),
      ...reports.monthlySales.map((m) => ['Monthly', m.label, m.orders, m.completed, m.sales]),
    ];
    const lines = [
      headers.map(sanitizeCsvCell).join(','),
      ...rows.map((r) => r.map(sanitizeCsvCell).join(',')),
    ];
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="signature-dine-sales-report.csv"');
    res.send(lines.join('\n'));
  } catch (error) {
    console.error('Error exporting sales report CSV:', error);
    res.status(500).json({ error: 'Failed to export sales report.' });
  }
});

// Team & Roles Management (Admin-only RBAC)
app.post('/api/admin/users/invite', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const schema = z.object({
      email: z.string().trim().email('Enter a valid Google email address').max(150),
      role: z.enum(['admin', 'staff']),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message || 'Invalid team member details.' });
    }
    const email = parsed.data.email.toLowerCase();
    const existing = await db
      .select()
      .from(users)
      .where(sql`lower(${users.email}) = ${email}`)
      .limit(1);

    if (existing.length > 0) {
      if (existing[0].id === req.dbUser!.id && parsed.data.role !== 'admin') {
        return res.status(400).json({ error: 'You cannot demote your own active Admin account.' });
      }
      const [updated] = await db
        .update(users)
        .set({ role: parsed.data.role })
        .where(eq(users.id, existing[0].id))
        .returning();
      return res.json({ user: updated });
    }

    const [created] = await db
      .insert(users)
      .values({
        uid: `invite:${email}`,
        email,
        role: parsed.data.role,
      })
      .returning();
    res.status(201).json({ user: created });
  } catch (error) {
    console.error('Error inviting team user:', error);
    res.status(500).json({ error: 'Failed to add team member.' });
  }
});

app.patch('/api/admin/users/:id/role', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid user ID.' });
    }
    if (id === req.dbUser!.id) {
      return res.status(400).json({ error: 'You cannot change your own role to avoid locking out admin access.' });
    }
    const schema = z.object({
      role: z.enum(['admin', 'staff', 'disabled']),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid role selected.' });
    }
    const [updated] = await db
      .update(users)
      .set({ role: parsed.data.role })
      .where(eq(users.id, id))
      .returning();
    if (!updated) {
      return res.status(404).json({ error: 'Team member not found.' });
    }
    res.json({ user: updated });
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Failed to update role.' });
  }
});

app.delete('/api/admin/users/:id', requireAuth, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid user ID.' });
    }
    if (id === req.dbUser!.id) {
      return res.status(400).json({ error: 'You cannot delete your own account.' });
    }
    await db.delete(users).where(eq(users.id, id));
    res.json({ success: true });
  } catch (error) {
    console.error('Error removing team user:', error);
    res.status(500).json({ error: 'Failed to remove team member.' });
  }
});

// Vite / Static SPA setup
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (req: Request, res: Response) => {
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API route not found' });
      }
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Signature Dine server listening on port ${PORT}`);
  });
}

startServer();
