import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (_ctx, next) => {
  const res = await next();
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=()',
  );
  res.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
      "img-src 'self' data: https:",
      "style-src 'self' 'unsafe-inline'",
      "connect-src 'self' https://challenges.cloudflare.com",
      'frame-src https://challenges.cloudflare.com',
    ].join('; '),
  );
  return res;
});
