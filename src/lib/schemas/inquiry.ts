import { z } from 'zod';

const Attr = z
  .strictObject({
    source: z.string().max(200),
    medium: z.string().max(200),
    campaign: z.string().max(200),
    content: z.string().max(200),
    term: z.string().max(200),
    referrer: z.string().max(2000),
    landing: z.string().max(500),
    ts: z.number().int().nonnegative(),
  })
  .nullable();

export const InquirySchema = z.strictObject({
  serviceType: z.enum(['airport', 'charter', 'ski', 'rental']),
  from: z.string().min(1).max(200),
  to: z.string().min(1).max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  passengers: z.number().int().min(1).max(10),
  luggage: z.number().int().min(0).max(15),
  notes: z.string().max(2000).optional(),
  name: z.string().min(1).max(100),
  email: z.email(),
  lineId: z.string().max(100).optional(),
  wechat: z.string().max(100).optional(),
  phoneCountryCode: z.string().regex(/^\+\d{1,4}$/),
  phone: z.string().min(4).max(20),
  locale: z.enum(['ja', 'zh']),
  utm: z.strictObject({
    firstTouch: Attr,
    lastTouch: Attr,
    current: Attr.unwrap(),
  }),
  turnstileToken: z.string().min(1),
});

export type InquiryPayload = z.infer<typeof InquirySchema>;
