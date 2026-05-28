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
  html: string,
): Promise<SendResult> {
  try {
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
  if (!input.email) {
    return { data: null, error: null };
  }
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

const channelDeeplinks: Record<'line' | 'wechat' | 'mail', string | null> = {
  line: 'https://line.me/R/ti/p/@sevenseatjp',
  wechat: null,
  mail: null,
};

export const server = {
  inquiry: defineAction({
    accept: 'json',
    input: InquirySchema,
    handler: async (input, ctx) => {
      // Render the internal email body in parallel with the Turnstile
      // verify fetch — both are independent and each costs 50–200ms.
      const verifyPromise = (async () => {
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
        return verify.success === true;
      })();
      const internalHtmlPromise = render(InquiryInternalEmail(input));

      let verifyOk = false;
      let internalHtml: string;
      try {
        [verifyOk, internalHtml] = await Promise.all([
          verifyPromise,
          internalHtmlPromise,
        ]);
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
        internalHtml,
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

      return {
        ok: true as const,
        channel: input.channel,
        deeplink: channelDeeplinks[input.channel],
      };
    },
  }),
};
