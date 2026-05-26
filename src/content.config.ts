import { defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const i18nString = z
  .object({
    ja: z.string().min(1),
    zh: z.string().min(1),
  })
  .strict();

const fares = z
  .array(
    z.object({
      vehicle: reference('vehicles'),
      jpy: z.number().int().positive(),
      includes: i18nString,
      notes: i18nString.optional(),
    }),
  )
  .min(1);

const routes = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/routes' }),
  schema: z.object({
    category: z.enum(['airport', 'ski']),
    from: i18nString,
    to: i18nString,
    durationMin: z.number().int().positive(),
    distanceKm: z.number().positive().optional(),
    fares,
    seasonal: z
      .object({
        from: z.string().regex(/^\d{2}-\d{2}$/),
        to: z.string().regex(/^\d{2}-\d{2}$/),
      })
      .optional(),
    order: z.number().default(999),
  }),
});

const packages = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/packages' }),
  schema: z.object({
    type: z.enum(['charter', 'rental']),
    title: i18nString,
    durations: z
      .array(
        z.object({
          label: i18nString,
          hours: z.number().positive(),
          fares,
        }),
      )
      .min(1),
    inclusions: z.array(i18nString),
    excludeRegions: i18nString.optional(),
    notes: i18nString.optional(),
    order: z.number().default(999),
  }),
});

const vehicles = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/vehicles' }),
  schema: ({ image }) =>
    z.object({
      name: i18nString,
      seatCount: z.number().int().min(1).max(15),
      luggageCount: z.number().int().min(0).max(15),
      features: z.array(i18nString).min(1),
      photos: z.array(image()).min(1),
      order: z.number().default(999),
    }),
});

const faq = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/faq' }),
  schema: z.object({
    category: z.enum(['booking', 'payment', 'cancel', 'service', 'vehicle']),
    question: i18nString,
    answer: i18nString,
    order: z.number().default(999),
  }),
});

const testimonials = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/testimonials' }),
  schema: z.object({
    customerInitials: z.string().min(1).max(20),
    sourceChannel: z.enum([
      'xiaohongshu',
      'klook',
      'kkday',
      'google',
      'direct',
    ]),
    content: i18nString,
    rating: z.number().int().min(1).max(5),
    date: z.string().regex(/^\d{4}-\d{2}$/),
  }),
});

export const collections = { routes, packages, vehicles, faq, testimonials };
