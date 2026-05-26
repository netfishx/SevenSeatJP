import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (_ctx, next) => {
  const original = await next();
  // Workerd / Cloudflare Workers can hand back a Response whose headers are
  // immutable (responses revived from cache, 304s, redirects, and — during
  // dev — HMR-reloaded responses). Clone into a fresh Response so .set() on
  // the security headers below never throws. See withastro/astro#12201.
  const res = new Response(original.body, original);
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=()',
  );
  // Blocked while placeholder assets remain. Task 16 removes this line.
  res.headers.set('X-Robots-Tag', 'noindex, nofollow');
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
