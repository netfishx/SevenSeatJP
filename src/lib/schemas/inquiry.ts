import { z } from 'zod';

// Attribution fields are observational. Each one is preprocessed to a safe
// fallback before strict validation so a malformed first/last/current touch
// (stale localStorage from an old script, a campaign with overlong UTM,
// a freak referer) never aborts a valid inquiry. Bad data degrades to null
// (firstTouch / lastTouch) or to a placeholder direct stamp (current).
const AttrShape = z
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

const Attr = z.preprocess((raw) => {
  if (raw == null) return null;
  const parsed = AttrShape.safeParse(raw);
  return parsed.success ? parsed.data : null;
}, AttrShape);

const CurrentAttr = z.preprocess((raw) => {
  const parsed = AttrShape.unwrap().safeParse(raw);
  if (parsed.success) return parsed.data;
  return {
    source: 'unknown',
    medium: '',
    campaign: '',
    content: '',
    term: '',
    referrer: '',
    landing: '',
    ts: Date.now(),
  };
}, AttrShape.unwrap());

export const InquirySchema = z
  .strictObject({
    serviceType: z.enum(['airport', 'charter', 'ski', 'rental']),
    from: z.string().min(1).max(200),
    to: z.string().min(1).max(200),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    time: z.string().regex(/^\d{2}:\d{2}$/),
    passengers: z.number().int().min(1).max(10),
    luggage: z.number().int().min(0).max(15),
    notes: z.string().max(2000).optional(),
    name: z.string().min(1).max(100),
    channel: z.enum(['line', 'wechat', 'mail']),
    email: z.email().optional(),
    phoneCountryCode: z.string().regex(/^\+\d{1,4}$/),
    phone: z.string().min(4).max(20),
    locale: z.enum(['ja', 'zh']),
    utm: z.strictObject({
      firstTouch: Attr,
      lastTouch: Attr,
      current: CurrentAttr,
    }),
    turnstileToken: z.string().min(1),
  })
  .check((ctx) => {
    if (ctx.value.channel === 'mail' && !ctx.value.email) {
      ctx.issues.push({
        code: 'custom',
        input: ctx.value.email,
        path: ['email'],
        message: 'email_required_for_mail_channel',
      });
    }
  });

export type InquiryPayload = z.infer<typeof InquirySchema>;
