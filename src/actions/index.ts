import { ActionError, defineAction } from 'astro:actions';
import { env } from 'cloudflare:workers';
import { render } from 'react-email';
import { Resend } from 'resend';
import { InquiryCustomerEmail } from '@/emails/InquiryCustomer';
import { InquiryInternalEmail } from '@/emails/InquiryInternal';
import { type InquiryPayload, InquirySchema } from '@/lib/schemas/inquiry';

declare global {
  namespace Cloudflare {
    interface Env {
      RESEND_API_KEY: string;
      TURNSTILE_SECRET_KEY: string;
      COMPANY_INBOX: string;
      INQUIRY_FROM_EMAIL: string;
    }
  }
}

type SendResult = { data: { id: string } | null; error: unknown };

function sanitizeHeader(s: string): string {
  return s
    .replace(/[\r\n\t]+/g, ' ')
    .trim()
    .slice(0, 200);
}

async function sendInternalEmail(
  resend: Resend,
  input: InquiryPayload,
  safeFrom: string,
  safeTo: string,
  subjectPrefix: string,
): Promise<SendResult> {
  try {
    const html = await render(InquiryInternalEmail(input));
    return await resend.emails.send({
      from: `SevenSeatJP <${env.INQUIRY_FROM_EMAIL}>`,
      to: env.COMPANY_INBOX,
      replyTo: input.email,
      subject: `${subjectPrefix}新询价 ${safeFrom}→${safeTo} ${input.date}`,
      html,
    });
  } catch (e) {
    return { data: null, error: e };
  }
}

async function sendCustomerEmail(
  resend: Resend,
  input: InquiryPayload,
): Promise<SendResult> {
  try {
    const html = await render(InquiryCustomerEmail(input));
    return await resend.emails.send({
      from: `SevenSeatJP <${env.INQUIRY_FROM_EMAIL}>`,
      to: input.email,
      subject:
        input.locale === 'zh'
          ? '【SevenSeatJP】您的询价已收到'
          : '【SevenSeatJP】お問合せを受け付けました',
      html,
    });
  } catch (e) {
    return { data: null, error: e };
  }
}

export const server = {
  inquiry: defineAction({
    accept: 'json',
    input: InquirySchema,
    handler: async (input, ctx) => {
      let verifyOk = false;
      try {
        const verifyRes = await fetch(
          'https://challenges.cloudflare.com/turnstile/v0/siteverify',
          {
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              secret: env.TURNSTILE_SECRET_KEY,
              response: input.turnstileToken,
              remoteip: ctx.request.headers.get('CF-Connecting-IP') ?? '',
            }),
          },
        );
        const verify = (await verifyRes.json()) as { success: boolean };
        verifyOk = verify.success === true;
      } catch (e) {
        console.error('turnstile_verify_unreachable', e);
        throw new ActionError({
          code: 'SERVICE_UNAVAILABLE',
          message: 'turnstile_unavailable',
        });
      }
      if (!verifyOk) {
        throw new ActionError({
          code: 'FORBIDDEN',
          message: 'turnstile_failed',
        });
      }

      const resend = new Resend(env.RESEND_API_KEY);
      const lastSrc = sanitizeHeader(input.utm.lastTouch?.source || 'direct');
      const subjectPrefix = `[${lastSrc}] `;
      const safeFrom = sanitizeHeader(input.from);
      const safeTo = sanitizeHeader(input.to);

      const internal = await sendInternalEmail(
        resend,
        input,
        safeFrom,
        safeTo,
        subjectPrefix,
      );
      if (internal.error) {
        console.error('inquiry_internal_send_failed', internal.error);
        throw new ActionError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'email_send_failed',
        });
      }

      ctx.locals.cfContext.waitUntil(
        (async () => {
          const customer = await sendCustomerEmail(resend, input);
          if (customer.error) {
            console.error('inquiry_customer_send_failed', customer.error, {
              internalEmailId: internal.data?.id,
            });
          }
        })(),
      );

      return { ok: true as const };
    },
  }),
};
