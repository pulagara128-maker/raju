import { z } from 'zod';

export function normalizeIndianPhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1);
  }
  return digits;
}

export function isValidIndianMobile(input: string): boolean {
  const normalized = normalizeIndianPhone(input);
  return /^[6-9]\d{9}$/.test(normalized);
}

export function sanitizeText(value: string | null | undefined, maxLen = 500): string {
  if (!value) return '';
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maxLen);
}

export function sanitizeCsvCell(value: unknown): string {
  const str = String(value ?? '').replace(/\r?\n/g, ' ');
  const safe = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function isValidSafeUrl(url: string | null | undefined): boolean {
  if (!url) return true;
  if (url.startsWith('/')) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export const indianPhoneSchema = z
  .string()
  .min(10, 'Enter a valid 10-digit Indian mobile number')
  .transform((val) => normalizeIndianPhone(val))
  .refine((val) => /^[6-9]\d{9}$/.test(val), {
    message: 'Enter a valid 10-digit Indian mobile number starting with 6-9',
  });

export const createOrderSchema = z.object({
  customerName: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  customerPhone: indianPhoneSchema,
  orderType: z.enum(['pickup', 'delivery']).default('pickup'),
  pickupDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Select a valid pickup date'),
  pickupTime: z.string().min(3, 'Select a pickup time').max(20),
  specialInstructions: z.string().max(400).optional().default(''),
  items: z
    .array(
      z.object({
        menuItemId: z.number().int().positive(),
        quantity: z.number().int().min(1).max(30),
      })
    )
    .min(1, 'Select at least one dish to place an order'),
});

export const createLeadSchema = z.object({
  name: z.string().trim().max(80).optional().default(''),
  phone: indianPhoneSchema,
  consentStatus: z.literal(true, {
    message: 'WhatsApp promotional consent is required to join',
  }),
  source: z.enum(['popup', 'footer', 'loyalty', 'menu']).optional().default('popup'),
});

export const createFeedbackSchema = z.object({
  customerName: z.string().trim().max(80).optional().default(''),
  customerPhone: z
    .string()
    .trim()
    .optional()
    .default('')
    .refine((val) => val === '' || isValidIndianMobile(val), {
      message: 'Enter a valid 10-digit Indian mobile number or leave blank',
    }),
  foodRating: z.number().int().min(1).max(5),
  serviceRating: z.number().int().min(1).max(5),
  ambianceRating: z.number().int().min(1).max(5),
  overallRating: z.number().int().min(1).max(5),
  writtenFeedback: z.string().trim().max(1000).optional().default(''),
  suggestions: z.string().trim().max(1000).optional().default(''),
});

export const createContactMessageSchema = z.object({
  name: z.string().trim().min(2, 'Please enter your name').max(80),
  email: z
    .string()
    .trim()
    .max(150)
    .optional()
    .default('')
    .refine((val) => val === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val), {
      message: 'Please enter a valid email address or leave blank',
    }),
  phone: indianPhoneSchema,
  subject: z.string().trim().min(2, 'Please enter a subject').max(120),
  message: z.string().trim().min(5, 'Please write a short message').max(1500),
});
