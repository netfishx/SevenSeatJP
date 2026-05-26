import { defineAction } from 'astro:actions';
import { InquirySchema } from '@/lib/schemas/inquiry';

export const server = {
  inquiry: defineAction({
    accept: 'json',
    input: InquirySchema,
    handler: async () => {
      return { ok: true as const };
    },
  }),
};
