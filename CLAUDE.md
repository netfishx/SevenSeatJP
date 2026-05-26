# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

SevenSeatJP — bilingual (ja default / `/zh/` prefix) marketing site for a 7-seat
charter / airport-transfer / ski-shuttle service in Japan. Static-first marketing
pages + one Astro Action endpoint for the inquiry form.

- Spec: `docs/superpowers/specs/2026-05-25-sevenseatjp-design.md`
- Implementation plan: `docs/superpowers/plans/2026-05-25-sevenseatjp-implementation.md`
- Launch acceptance checklist (Task 16, user-gated): `docs/launch-checklist.md`

## Commands

| | |
|---|---|
| `bun run dev` | `astro dev` — workerd runtime via @astrojs/cloudflare adapter. Reads `.dev.vars`. Binds to `localhost:4321` (not `127.0.0.1`). |
| `bun run build` | `astro check && astro build` |
| `bun run lint` | `biome check .` |
| `bun run format` | `biome check --write .` |
| `bun run typecheck` | `astro check` |
| `bun run test:e2e` | Playwright; runs both `chromium-desktop` + `chromium-mobile` (iPhone 15 Pro emulation on Chromium — `iPhone 16 Pro` isn't in Playwright's device list yet, and IMPORTANT: spreading an undefined device key silently makes the project fall back to a desktop layout, so the device name must be a real entry in `devices`) projects |
| `bun run test:e2e -g <pattern>` | Single-test by grep |
| `bun run test:e2e --project=chromium-desktop` | Single project |

Deploy is handled by **Cloudflare Workers Builds** (dashboard-integrated, listens to
`main`). `wrangler deploy` is reserved for manual rollback only.

## Architecture

**Astro 6 `output: 'server'` + `@astrojs/cloudflare` v13 adapter → Cloudflare Workers + Static Assets.**

Build output splits into two trees:
- `dist/client/` — prerendered HTML, `_headers`, `.assetsignore`, hashed `_astro/*.js|css`. Marketing pages bypass the worker entirely.
- `dist/server/entry.mjs` — Worker code for `/_actions/*` and any non-prerendered route.

`wrangler.jsonc` points `main` at the adapter's unified entrypoint
`@astrojs/cloudflare/entrypoints/server` (v13 convention — **not**
`./dist/_worker.js`, which was the v12 layout), and `assets.directory`
at `./dist/client`.

### Dual-layer response headers (critical to keep in sync)

Workers Static Assets serves prerendered HTML **without invoking the Worker**, so
`src/middleware.ts` cannot stamp headers on those responses. There are two layers
that must match:

- `public/_headers` — static layer, applied to assets + prerendered HTML.
- `src/middleware.ts` — dynamic layer, applied to Actions and SSR responses.

When changing CSP / X-Frame / X-Content-Type / Referrer-Policy / Permissions-Policy
**update both files together**.

`public/.assetsignore` must exclude `_worker.js` and `_routes.json` so they aren't
publicly served. The adapter appends `wrangler.json` and `.dev.vars` to the copy
that lands in `dist/client/.assetsignore` automatically.

### i18n + Content Collections

`src/i18n/{ja,zh}.json` are flat key/value dicts; `src/i18n/t.ts` uses
`satisfies Record<keyof typeof ja, string>` on `zh` so removing a key fails
typecheck immediately. **Add new keys to ja first, then mirror in zh** —
typecheck enforces parity.

`src/content.config.ts` defines five collections (`routes`, `packages`, `vehicles`,
`faq`, `testimonials`). All bilingual fields use a strict `i18nString({ja, zh})`
schema; missing `name.zh` etc. fails the build with `InvalidContentEntryDataError`.
Vehicle `reference()` is validated at query time (not build time), so consumer
pages catch dangling refs.

### Routing convention

Every page is a thin 2-line wrapper around a `<XxxPage locale="ja|zh" />`
component under `src/components/pages/`. ja routes live at the root
(`src/pages/foo.astro`), zh routes mirror at `src/pages/zh/foo.astro`. The two
wrappers are nearly identical — keep them so:

```astro
---
export const prerender = true;
import FooPage from '@/components/pages/FooPage.astro';
---
<FooPage locale="ja" />
```

**All marketing pages must have `export const prerender = true`.** Astro Actions
auto-route at `/_actions/*` and stay dynamic.

### Inquiry form pipeline

Client island (`src/components/inquiry/inquiry-form.client.ts`) reads
`readAttribution()` (sessionStorage first-touch + localStorage 30-day last-touch)
and calls `actions.inquiry(input)` from `astro:actions`. Handler in
`src/actions/index.ts`:

1. Turnstile `siteverify` against the secret in `env`.
2. Internal email via Resend (blocking — fail throws `INTERNAL_SERVER_ERROR`).
3. Customer confirmation via `ctx.locals.cfContext.waitUntil` (fire-and-forget).

Error codes map to i18n keys client-side: `BAD_REQUEST → invalid_payload`,
`FORBIDDEN → turnstile_failed`, `SERVICE_UNAVAILABLE → turnstile_unavailable`,
`INTERNAL_SERVER_ERROR → email_send_failed`.

### Worker env (`cloudflare:workers`)

Server code reads secrets via `import { env } from 'cloudflare:workers'`. The
typed `Cloudflare.Env` shape is augmented in `src/actions/index.ts` via
`declare global { namespace Cloudflare { interface Env { ... } } }`.

Local dev: `.dev.vars` (workerd does **not** auto-fallback to `process.env`).
CI E2E job in `.github/workflows/ci.yml` materialises `.dev.vars` from secrets
before `astro dev` boots.

| key | scope |
|---|---|
| `PUBLIC_TURNSTILE_SITE_KEY` | build-time public (Astro `import.meta.env`) — embedded into prerendered HTML |
| `RESEND_API_KEY` | worker secret |
| `TURNSTILE_SECRET_KEY` | worker secret |
| `COMPANY_INBOX` | worker env |
| `INQUIRY_FROM_EMAIL` | worker env |

## Project-specific conventions

- **Biome ignores `.astro` files entirely** (it doesn't track variable usage across
  the frontmatter ↔ template boundary, giving false unused-var errors).
  `astro check` covers `.astro` type-checking.
- **No `mx-auto` / no margin utilities anywhere in app code.** Use parent
  `flex justify-center` + inner `max-w-Xxl w-full` per the global CSS rule.
- Touch targets ≥ `min-h-11 min-w-11` (44px, WCAG 2.5.5).
- CSP intentionally includes `'unsafe-inline'` for `script-src` because Astro
  hoists small `<script>` blocks (LangSwitch, MobileMenu, attribution import)
  inline. Lighthouse Best Practices 100 was verified with this config on
  `/`. If you tighten CSP, run Lighthouse before/after on `/` and `/inquiry`.

## E2E quirks

- `webServer.url` in `playwright.config.ts` must be `http://localhost:4321`
  (not `127.0.0.1` — `astro dev` only binds the IPv6-resolvable hostname on macOS).
- Inquiry tests strip `cf-turnstile-response` before submit, because the
  always-pass dummy key auto-fills the hidden field and lets requests through to
  the real Action.
- Page tests use `h1` with `.first()` to skip the Astro dev toolbar's injected
  headings ("Audit", "Settings", etc.).

## Git workflow

This repo uses `gh auth git-credential` as the only credential helper (local
`.git/config` resets the helper chain inherited from `~/.gitconfig` so the
git-credential-manager dialog doesn't pop on each push). Do **not** re-add
`credential.helper` here.

## Plan deviations to be aware of

- `wrangler` is on `4.94.0`; the implementation plan originally pinned `4.46.0`
  citing `.dev.vars` regression `#11264`. That was fixed by 4.83+ and `4.94`
  matches the @astrojs/cloudflare peer-dep + CF Workers Builds runtime
  (no more "unexpected fields" warnings in the deploy log).
- `dist/_worker.js` does not exist — adapter v13 emits `dist/server/entry.mjs`
  and `dist/client/*`. Any plan step or verify command that references
  `test -f dist/_worker.js` predates the v13 adapter and needs translating to
  `test -f dist/server/entry.mjs`.

## Pre-launch reminders

- `src/components/pages/legal/TokushohoPage.astro` still carries placeholder
  operator name and address strings, awaiting client info.
- `X-Robots-Tag: noindex, nofollow` is still set in `public/_headers` and
  `src/middleware.ts`. Remove both together once the client confirms launch.

## Design context

Strategic brief lives in [`PRODUCT.md`](./PRODUCT.md) (register, users,
brand personality, anti-references, design principles). Read it before
any UI / copy change. Headlines:

- **Register**: brand. Hospitality marketing site, no app surface.
- **Personality**: 静谧 · 内敛 · 工艺 (Aman lane). Restraint over flourish.
- **Anti-refs to actively resist**: Uber/DiDi app-shell, OTA banner-noise,
  black-and-gold luxury, Airbnb cosy-warm.
- **Site only carries trust, not transactions.** No instant booking, no
  sticky CTAs, no chat widgets — single inquiry form, 24h reply promise.
- **Bilingual ≠ translation.** Japanese and Chinese copy are written
  independently and may diverge in tone; visual system stays unified.

Once `DESIGN.md` exists, it owns the visual token vocabulary (colors,
type scale, components) referenced from this file.
