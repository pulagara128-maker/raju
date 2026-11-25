import { relations } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  role: text('role').notNull().default('staff'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const restaurantSettings = pgTable('restaurant_settings', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().default('Signature Dine'),
  teluguName: text('telugu_name').notNull().default('సిగ్నేచర్ డైన్'),
  restaurantType: text('restaurant_type').notNull().default('Andhra Restaurant'),
  address: text('address')
    .notNull()
    .default('3rd Line, Brindavan Gardens, Guntur, Andhra Pradesh 522006, India'),
  plusCode: text('plus_code').notNull().default('8C79+MX, Guntur, Andhra Pradesh'),
  phone: text('phone'),
  whatsappNumber: text('whatsapp_number'),
  googleMapsUrl: text('google_maps_url'),
  googleReviewUrl: text('google_review_url'),
  instagramUrl: text('instagram_url'),
  facebookUrl: text('facebook_url'),
  deliveryEnabled: boolean('delivery_enabled').notNull().default(false),
  deliveryCharge: integer('delivery_charge'),
  heroHeadline: text('hero_headline')
    .notNull()
    .default('Authentic Andhra Flavours, Served with Love'),
  heroSubtext: text('hero_subtext')
    .notNull()
    .default(
      'Discover delicious biryanis, traditional Andhra delicacies, flavorful starters, and a memorable dining experience in Guntur.'
    ),
  aboutText: text('about_text')
    .notNull()
    .default(
      'Signature Dine (సిగ్నేచర్ డైన్) brings the warmth of Andhra hospitality to the heart of Brindavan Gardens, Guntur. From slow-cooked biryanis and bold coastal starters to comforting traditional meals, every dish is crafted for families, friends, and food lovers.'
    ),
  loyaltyTargetMeals: integer('loyalty_target_meals').notNull().default(10),
  birthdayDiscountPercent: integer('birthday_discount_percent').notNull().default(15),
  birthdayMaxDiscount: integer('birthday_max_discount').notNull().default(500),
  loyaltyRulesText: text('loyalty_rules_text')
    .notNull()
    .default(
      'Earn 1 loyalty stamp on each eligible completed meal order. Collect 10 stamps to enjoy your 10th eligible meal free. Birthday discounts apply once per calendar year with prior date registration.'
    ),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const openingHours = pgTable('opening_hours', {
  id: serial('id').primaryKey(),
  dayOfWeek: integer('day_of_week').notNull().unique(),
  dayName: text('day_name').notNull(),
  openTime: text('open_time').notNull().default('12:00'),
  closeTime: text('close_time'),
  isClosed: boolean('is_closed').notNull().default(false),
  specialNote: text('special_note'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const menuCategories = pgTable('menu_categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
  sortOrder: integer('sort_order').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const menuItems = pgTable(
  'menu_items',
  {
    id: serial('id').primaryKey(),
    categoryId: integer('category_id')
      .references(() => menuCategories.id, { onDelete: 'cascade' })
      .notNull(),
    name: text('name').notNull(),
    description: text('description').notNull(),
    price: integer('price'),
    isPriceConfirmed: boolean('is_price_confirmed').notNull().default(false),
    isVeg: boolean('is_veg').notNull().default(false),
    isSpicy: boolean('is_spicy').notNull().default(false),
    isAvailable: boolean('is_available').notNull().default(true),
    isBestseller: boolean('is_bestseller').notNull().default(false),
    imageUrl: text('image_url'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('menu_items_category_idx').on(table.categoryId)]
);

export const todaysSpecial = pgTable('todays_special', {
  id: serial('id').primaryKey(),
  dishName: text('dish_name').notNull(),
  description: text('description').notNull(),
  specialPrice: integer('special_price'),
  originalPrice: integer('original_price'),
  imageUrl: text('image_url'),
  validDate: text('valid_date').notNull(),
  isAvailable: boolean('is_available').notNull().default(true),
  isEnabled: boolean('is_enabled').notNull().default(false),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const galleryItems = pgTable('gallery_items', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  category: text('category').notNull(),
  imageUrl: text('image_url').notNull(),
  caption: text('caption'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const customers = pgTable(
  'customers',
  {
    id: serial('id').primaryKey(),
    name: text('name'),
    phone: text('phone').notNull().unique(),
    birthday: text('birthday'),
    birthdayConsent: boolean('birthday_consent').notNull().default(false),
    stampsCount: integer('stamps_count').notNull().default(0),
    totalCompletedMeals: integer('total_completed_meals').notNull().default(0),
    rewardsAvailable: integer('rewards_available').notNull().default(0),
    rewardsRedeemed: integer('rewards_redeemed').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('customers_phone_idx').on(table.phone)]
);

export const orders = pgTable(
  'orders',
  {
    id: serial('id').primaryKey(),
    orderNumber: text('order_number').notNull().unique(),
    customerId: integer('customer_id').references(() => customers.id, {
      onDelete: 'set null',
    }),
    customerName: text('customer_name').notNull(),
    customerPhone: text('customer_phone').notNull(),
    orderType: text('order_type').notNull().default('pickup'),
    pickupDate: text('pickup_date').notNull(),
    pickupTime: text('pickup_time').notNull(),
    specialInstructions: text('special_instructions'),
    subtotal: integer('subtotal').notNull().default(0),
    deliveryCharge: integer('delivery_charge').notNull().default(0),
    total: integer('total').notNull().default(0),
    hasUnpricedItems: boolean('has_unpriced_items').notNull().default(false),
    status: text('status').notNull().default('new'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('orders_status_idx').on(table.status),
    index('orders_phone_idx').on(table.customerPhone),
  ]
);

export const orderItems = pgTable(
  'order_items',
  {
    id: serial('id').primaryKey(),
    orderId: integer('order_id')
      .references(() => orders.id, { onDelete: 'cascade' })
      .notNull(),
    menuItemId: integer('menu_item_id').references(() => menuItems.id, {
      onDelete: 'set null',
    }),
    dishName: text('dish_name').notNull(),
    unitPrice: integer('unit_price'),
    quantity: integer('quantity').notNull(),
    lineTotal: integer('line_total').notNull().default(0),
  },
  (table) => [index('order_items_order_idx').on(table.orderId)]
);

export const loyaltyTransactions = pgTable(
  'loyalty_transactions',
  {
    id: serial('id').primaryKey(),
    customerId: integer('customer_id')
      .references(() => customers.id, { onDelete: 'cascade' })
      .notNull(),
    orderId: integer('order_id')
      .references(() => orders.id, { onDelete: 'set null' })
      .unique(),
    type: text('type').notNull(),
    stampsDelta: integer('stamps_delta').notNull(),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('loyalty_tx_customer_idx').on(table.customerId)]
);

export const loyaltyRewards = pgTable(
  'loyalty_rewards',
  {
    id: serial('id').primaryKey(),
    customerId: integer('customer_id')
      .references(() => customers.id, { onDelete: 'cascade' })
      .notNull(),
    rewardCode: text('reward_code').notNull().unique(),
    status: text('status').notNull().default('available'),
    redeemedAt: timestamp('redeemed_at'),
    notes: text('notes'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('loyalty_rewards_customer_idx').on(table.customerId)]
);

export const leads = pgTable(
  'leads',
  {
    id: serial('id').primaryKey(),
    name: text('name'),
    phone: text('phone').notNull().unique(),
    consentStatus: boolean('consent_status').notNull().default(true),
    consentTimestamp: timestamp('consent_timestamp').defaultNow().notNull(),
    unsubscribed: boolean('unsubscribed').notNull().default(false),
    unsubscribedAt: timestamp('unsubscribed_at'),
    source: text('source').notNull().default('popup'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [index('leads_phone_idx').on(table.phone)]
);

export const festivalCampaigns = pgTable('festival_campaigns', {
  id: serial('id').primaryKey(),
  festivalName: text('festival_name').notNull(),
  greetingMessage: text('greeting_message').notNull(),
  offerText: text('offer_text'),
  scheduledAt: text('scheduled_at'),
  mode: text('mode').notNull().default('manual'),
  status: text('status').notNull().default('draft'),
  recipientCount: integer('recipient_count').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  sentAt: timestamp('sent_at'),
});

export const campaignDeliveries = pgTable(
  'campaign_deliveries',
  {
    id: serial('id').primaryKey(),
    campaignId: integer('campaign_id')
      .references(() => festivalCampaigns.id, { onDelete: 'cascade' })
      .notNull(),
    leadId: integer('lead_id')
      .references(() => leads.id, { onDelete: 'cascade' })
      .notNull(),
    phone: text('phone').notNull(),
    status: text('status').notNull().default('pending'),
    sentAt: timestamp('sent_at'),
  },
  (table) => [
    uniqueIndex('campaign_lead_unique_idx').on(table.campaignId, table.leadId),
  ]
);

export const feedback = pgTable('feedback', {
  id: serial('id').primaryKey(),
  referenceNumber: text('reference_number').notNull().unique(),
  customerName: text('customer_name'),
  customerPhone: text('customer_phone'),
  foodRating: integer('food_rating').notNull(),
  serviceRating: integer('service_rating').notNull(),
  ambianceRating: integer('ambiance_rating').notNull(),
  overallRating: integer('overall_rating').notNull(),
  writtenFeedback: text('written_feedback'),
  suggestions: text('suggestions'),
  isReviewed: boolean('is_reviewed').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const contactMessages = pgTable('contact_messages', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone').notNull(),
  subject: text('subject').notNull().default('General Inquiry'),
  message: text('message').notNull(),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const menuCategoriesRelations = relations(menuCategories, ({ many }) => ({
  items: many(menuItems),
}));

export const menuItemsRelations = relations(menuItems, ({ one }) => ({
  category: one(menuCategories, {
    fields: [menuItems.categoryId],
    references: [menuCategories.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, {
    fields: [orders.customerId],
    references: [customers.id],
  }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  menuItem: one(menuItems, {
    fields: [orderItems.menuItemId],
    references: [menuItems.id],
  }),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  orders: many(orders),
  transactions: many(loyaltyTransactions),
  rewards: many(loyaltyRewards),
}));

export const loyaltyTransactionsRelations = relations(
  loyaltyTransactions,
  ({ one }) => ({
    customer: one(customers, {
      fields: [loyaltyTransactions.customerId],
      references: [customers.id],
    }),
    order: one(orders, {
      fields: [loyaltyTransactions.orderId],
      references: [orders.id],
    }),
  })
);

export const loyaltyRewardsRelations = relations(loyaltyRewards, ({ one }) => ({
  customer: one(customers, {
    fields: [loyaltyRewards.customerId],
    references: [customers.id],
  }),
}));

export const festivalCampaignsRelations = relations(
  festivalCampaigns,
  ({ many }) => ({
    deliveries: many(campaignDeliveries),
  })
);

export const campaignDeliveriesRelations = relations(
  campaignDeliveries,
  ({ one }) => ({
    campaign: one(festivalCampaigns, {
      fields: [campaignDeliveries.campaignId],
      references: [festivalCampaigns.id],
    }),
    lead: one(leads, {
      fields: [campaignDeliveries.leadId],
      references: [leads.id],
    }),
  })
);
