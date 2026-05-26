---
target: src/components/pages/
total_score: 25
p0_count: 2
p1_count: 2
timestamp: 2026-05-26T08-19-05Z
slug: src-components-pages
---
# SevenSeatJP — Critique (full-site)

Target: `src/components/pages/` (whole-site review, Home + 4 service pages + 4 supporting + Inquiry + 3 legal).

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Inquiry submit gives `aria-busy` only, no visible spinner on the bronze button. Success state replaces the form with a static card; refresh loses success. (`inquiry-form.client.ts:113–130`) |
| 2 | Match System / Real World | 3 | Service language solid (空港送迎/チャーター). `JA·中` opaque even to natives; `10y` is English-y inside JA hero; `incl. tax · all-in` Japanglish (`AirportTransferPage.astro:77`). |
| 3 | User Control and Freedom | 2 | No way to recover form session post-submit. Date input has no localized format hint. No "back to inquiry" after submit. |
| 4 | Consistency and Standards | 3 | System-wide spacing/type/color consistency is strong. Inquiry submit uses hand-rolled `bg-gold` block instead of `<Button variant="solid">` (`InquiryForm.astro:252–257`). Tokushoho h1 is `text-gold` (`TokushohoPage.astro:71`), violating One-Percent + "bronze never on a headline." |
| 5 | Error Prevention | 2 | `passengers` 1–10, `luggage` 0–15, no help on what counts as 大型荷物. `from`/`to` free-text, no autocomplete. Date has no `min=today`. Phone country code hard-coded 9 entries — silent failure outside. |
| 6 | Recognition Rather Than Recall | 3 | Header + footer nav discoverable. 4 service pages end with identical solid-CTA blocks — trains users to remember not recognize. Pricing "Jump to" anchor list is the right move executed quietly. |
| 7 | Flexibility and Efficiency | 2 | No keyboard shortcuts. No quick-quote shortcut. Power user has to scroll the full pricing page to compare segments. |
| 8 | Aesthetic and Minimalist Design | 3 | Restraint is real. But 38 `.caption` instances across ~12 templates = constant editorial scaffolding, not silence. Home has 5 captions on a single scroll. The "Eyebrow Rule" has become a uniform. |
| 9 | Error Recovery | 2 | Inquiry errors are a single red line (`InquiryForm.astro:248`). No field-level inline validation. `BAD_REQUEST` doesn't say *which* field. Turnstile failure says "刷新重试" without offering a refresh button. |
| 10 | Help and Documentation | 3 | FAQ well-structured, bilingual, sticky category headers. No contextual help inside the inquiry form (no "国際免許 vs 公式翻訳" link into FAQ from rental flow). Help exists but isn't summoned where it's needed. |
| **Total** | | **25 / 40** | **Good** (above average) — solid execution in chosen lane with real issues at the conversion edges. |

## Anti-Patterns Verdict

**Start here. Does this look AI-generated?**

**LLM assessment:** Not on first glance — **yes on second**. Competent execution in a *specific named lane* (warm soot black, Spectral + Shippori Mincho, hairline rules, ordinals, uppercase-tracked eyebrows). Taste real, discipline real. But the discipline is precisely what a senior LLM-flavored design assistant produces when told "make it Aman, not casino." Second-order reflex. The closest call: any spread that pairs `.caption` + `font-display` headline + 12-col grid + right-rail meta. That spread appears 5× on the home page and on every service page. Beautiful spread; also predictable.

**Deterministic scan (`detect.mjs --json --fast`):** 2 findings, both **false positives**:
1. `single-font` at `BaseLayout.astro:75` — detector parsed only `Spectral` from the Google Fonts URL but the same URL loads Shippori Mincho + Zen Kaku Gothic New. Three families load; detector saw one.
2. `flat-type-hierarchy` at `BaseLayout.astro:102` — detected 12/14/16/18/20px range in the header/footer chrome (1.7 ratio). The header chrome is intentionally flat (`text-sm` 14px nav, `text-base` 16px wordmark, `text-xs` 12px legal). The hierarchy lives in *content* templates (`--text-6xl` clamps up to 7rem). False positive in context.

**Visual overlays:** Not run. The injection step requires a live dev server, browser MCP, and overlay injection — skipped for this synchronous run. The LLM and CLI scans together cover what overlays would surface.

**Category-reflex (the most important test):**
- **First-order reflex: PASS.** No black-and-gold, no map-first, no sticky CTA, no carousel, no `#000`/`#fff`. Obvious clichés avoided.
- **Second-order reflex: FAIL.** Spectral + Shippori Mincho + soot black + bronze + hairline = the *known-good answer* when an AI is asked "Aman, not casino." Anyone briefed for a post-2024 高級ハイヤー site converges here.
- **Editorial-typographic lane proximity: VERY CLOSE.** Spectral ≈ Tiempos; Shippori Mincho is the Japanese Tiempos; Zen Kaku ≈ Söhne sub; 0.18em uppercase tracked labels = Klim signature; hairlines + monochromatic restraint + serif ordinals = Klim signature. DESIGN.md preemptively rebuts ("not the saturated Tiempos + GT America") — *which is exactly what someone inside the lane would write*. Lane is not escaped; the system ranks high *within* it.
- **Eyebrow Rule honest verdict: AI scaffolding wearing a name.** 38 `.caption` instances in ~12 templates. The DESIGN.md justification ("removing causes the section to read as a SaaS landing block within two scrolls") is the tell. A deliberate system uses the eyebrow as a *moment* (3–5 per site); this one uses it as section grammar. The eyebrows are load-bearing — meaning the rest of the system can't stand without them. That's failed brand language, not fluent.

**Scans:**
- Side-stripe `border-l/r > 1px` ➔ Pass (only hairline `border-e` neutral).
- Gradient text ➔ Pass.
- Decorative glassmorphism ➔ Pass (only functional header backdrop).
- Hero-metric template ➔ **FAIL.** `TrustMetrics.astro` is textbook (4 figures, big number + caption, even row, cute-formatted `10y / 500+ / 24h / JA·中`). Contradicts PRODUCT.md principle 3 ("信任的证据是细节，不是文案") — this block IS facade.
- Identical card grids ➔ Pass-with-caveat. Cards explicitly avoided. But 12-col editorial rows repeat enough that they read as "card grid in disguise."
- Modal as first thought ➔ Pass.
- **Em-dash audit ➔ FAIL.** 11 em-dashes in customer-facing copy (`Hero.astro:23`, `HomePage.astro:27–28`, `CharterPage.astro:53–54`, `RentalPage.astro:53`, `ServiceGrid.astro:38`). Some are CJK 双連ダッシュ `——` (legitimate JA punctuation), but several are western em-dashes inside ja/zh prose — that's the AI tell. `RentalPage.astro:53` `IDP — …` is the clearest violation: human JA copy uses `：` or `·`, AI default is em-dash.

## Overall Impression

The site is well-built within a recognizable lane. The Lacquerware Box north star is real in *some* sections (sample-itinerary section, Hero, mobile menu panel) and *imitated* in others (TrustMetrics, eyebrow scaffolding, similarly-shaped service pages). The single biggest opportunity is to **commit to scarcity**: cut what's decorative, let what's specific (driver detail, real itineraries, real cabin photos) carry trust. Right now the system is announcing taste through repeat-pattern instead of demonstrating taste through restraint.

## What's Working

1. **`MobileMenuPanel.astro`** is the cleanest single component in the codebase. Rendered as a direct child of `<body>` (with a code comment explaining the prior `backdrop-filter` containing-block bug, line 79), focus-trap via `<html>` `overflow: hidden`, escape-key handling, editorial-row visual treatment with serif ordinals. Engineering taste matches design taste.
2. **`globals.css:107–111` global `:focus-visible`** — 1px bronze outline + 3px offset, applied system-wide, not bolted onto individual components. And `:lang(ja) h1/h2/h3` swap to `font-display-jp` at `globals.css:96–100` is quiet, correct i18n typography.
3. **Home sample-itinerary section** (`HomePage.astro:91–123`) — Fuji photo + facts as a `border-y` rail with 所要時間 / 車両 / 参考料金. This is the *one* spread where editorial structure feels *earned* rather than imposed. If the rest of the site picked up this register, the critique would soften significantly.

## Priority Issues

### [P0] Inquiry form is a 14-field wall that contradicts the brand voice

**Why it matters:** PRODUCT.md says "无需追问、无需翻译、无需再三确认". The hero copy funneling here says "send your rough itinerary." Then the form asks for 14 fields on one screen (serviceType, from, to, date, time, passengers, luggage, notes, name, email, lineId, wechat, phoneCountryCode, phone). Casey on 3G hits the wall and bounces; Riley fails Turnstile, sees one red line, and gives up. The form contradicts the copy that led you to it.

**Fix:** Split into 2 steps — Step 1: 行程概要 (service, from/to, date, passengers); Step 2: 联系方式 (name/email/phone/preferred channel). Add a "step 1 of 2" indicator. Inline field-level errors. `min=today` on date. Move the LINE/WeChat/Mail direct-contact panel to the *top* of the inquiry page (above the form) so the user sees "you don't have to use this form" before committing. Use `<Button variant="solid">` for submit (currently a hand-rolled `bg-gold` block at `InquiryForm.astro:252–257`).

**Suggested command:** `/impeccable distill` + `/impeccable clarify`.

### [P0] `TrustMetrics` block is the textbook AI hero-metric template

**Why it matters:** 4 figures in a row, big number + small label, evenly distributed, cute-formatted (`10y / 500+ / 24h / JA·中`). This is the exact template the cross-register absolute ban calls out. It contradicts PRODUCT.md principle 3 ("信任的证据是细节"). `JA·中` is illegible as a "metric" (it's a feature flag wearing metric clothing); `24h` collides with the response-time promise stated elsewhere. Removing this block would *raise* the credibility ceiling, not lower it.

**Fix:** Replace with a single editorial paragraph (60–80 ja chars) about a real operational fact — driver tenure of the actual team, insurance specifics, breakdown protocol. One paragraph, one number embedded in prose, hairline rule below. Or delete entirely and let the testimonial above carry the trust load.

**Suggested command:** `/impeccable distill`.

### [P1] The Eyebrow has become AI scaffolding — 38 captions is too many

**Why it matters:** The eyebrow is supposed to anchor the grid. 38 instances across 12 templates means it stops anchoring and starts wallpapering. Both Jordan (first-timer) and the 日本国内 affluent host start to perceive "this site really wants me to know it has captions." The "Eyebrow Rule" in DESIGN.md is being used as a license to scaffold every section rather than as a moment of editorial weight.

**Fix:** Cut to ≤3 eyebrows per page. Keep them only where a section *genuinely* crosses a content boundary (services, inquiry, testimonials). Remove from: hero (the headline already does that job), inquiry-form sidebar blocks, on-board callout, testimonial sub-quotes, price-table headers (the `border-b border-border-strong` is enough), trust-metric labels, footer column. Target: home goes from 5 → 2 captions; service pages from 2 → 1.

**Suggested command:** `/impeccable distill`.

### [P1] Missing `prefers-reduced-motion` is a WCAG 2.2 AA gap, not polish

**Why it matters:** Zero instances of `@media (prefers-reduced-motion: reduce)` or `motion-reduce:` classes across the entire codebase. Yet the site has: `group-hover:translate-x-1` (8 places), `group-hover:scale-105` with `duration-700` (`ServiceGrid:77`), `animate-pulse` on the scroll hint (`Hero.astro:80`), mobile menu opacity transition, header backdrop transition. PRODUCT.md self-flagged this as "待补、polish" — but with WCAG 2.2 AA as the *baseline*, this is compliance, not polish.

**Fix:** Add to `globals.css`:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```
Plus kill the scroll-hint `animate-pulse` under reduced motion (let it fade, not blink).

**Suggested command:** `/impeccable harden`.

### [P2] Service pages rhyme too hard — Charter / Airport / Ski / Rental are structurally identical

**Why it matters:** RouteHero + 12-col meta + price-or-package list + identical closing CTA, 4 times. After page 2, the user has fully decoded the template. That's not editorial — it's templated. Charter has no reason to *feel* identical to Airport in rhythm. Ski has a *seasonal* identity that should be expressed structurally, not just via a `badge` prop. The Ski page does start to differentiate with a seasonal `border-t` advisory list (`SkiPage:113–125`), but its dot bullets (`<span class="text-gold">·</span>`) reinstate the bronze-as-decoration pattern that's already over-deployed.

**Fix:** Give each service page one structural differentiator earned from its content. Airport: clock-anchored timeline (T-2h / T-30min / T+0). Charter: an illustrated route map (not Google). Ski: snow-season calendar strip. Rental: document checklist with photo proofs. The chrome stays unified; the *spine* of each page diverges.

**Suggested command:** `/impeccable shape` per-page.

## Persona Red Flags

- **Jordan (confused first-timer):** Hero shows "今すぐ見積りを依頼する" *and* "料金一覧を見る" in the same row (`Hero.astro:64–71`). Doesn't know which is the primary action. Pricing page (more useful for "what does this cost") is hidden behind a `text-text-muted` caption-styled link that looks like a footnote. The bronze second-line on every hero + the eyebrow + the badge + dot bullets all use the same bronze — Jordan can't tell what bronze *means*.
- **Casey (mobile + 3G):** Hero is `h-[100svh]` — 100% of viewport given to photograph before any content. On 3G the LCP is dominated by the hero image; everything below waits. Then the inquiry form is 14 fields stacked on one screen with a Turnstile widget loaded from `challenges.cloudflare.com` (third-party blocking script). Casey bounces at either hero load or form. Mobile menu is solid (full-screen with `<html>` overflow lock — correct).
- **Riley (stress-tester):** Long ja text in hero secondary at `clamp(2rem, 1.2rem + 3vw, 6rem)` with `max-w-4xl` will wrap unpredictably (`Hero.astro:55` lacks the `break-words` that RouteHero added). Refresh-mid-form: state fully lost. Submitting `passengers=11` gives the browser's native min/max error, no inline help. `from`/`to` are `maxlength=200` free-text — Riley pastes a 200-char address, it accepts, the email confirmation likely renders odd. Tokushoho still has "詳細はお問合せ時に開示" + "担当責任者(お問合せ時に開示)" placeholders in production copy (`TokushohoPage.astro:20–23`).
- **日本国内 affluent host (project-specific persona, per PRODUCT.md):** Wants to forward the URL to a guest and broadcast 放心. Hero accomplishes that for 3 seconds. Then TrustMetrics deflates trust — affluent hosts spot a metrics-strip as marketing facade. Cabin-detail is closer to what they want but lives *below* the metrics strip. The sample-itinerary section is the single block they'll quote as evidence — yet it's only one. No team page, no driver bios, no insurance breakdown, no protocol-during-delay narrative. Trust evidence is thin where it matters most.

## Minor Observations

- `Card.astro` exists with a "cards are rarely the right answer" comment but is never imported anywhere — dead component. Delete or document a legitimate use.
- `TokushohoPage.astro:71` h1 is `text-gold` — drops the One-Percent Rule + bronze h1 contradicts "bronze never on a section headline."
- `ServiceGrid.astro:38` `Services — 04` uses an em-dash as a quantity indicator. Typography could do it without dash.
- `globals.css:144–153` `.grain` utility defined but never applied. Comment says "used on hero photos." Either dead code or missing application.
- `Hero.astro:80` `animate-[pulse_3s_ease-in-out_infinite]` on the "scroll" hint — `animate-pulse` is opacity blink (decorative motion DESIGN.md warns against), violates reduced-motion, "scroll" is a UI cliché for vertical sites.
- `BaseLayout.astro:103` wordmark `Seven·Seat` uses bronze middle-dot. Combined with mobile menu's bronze ordinals + every dot bullet + every badge + hero `title.secondary`, cumulative bronze on a 100vh hero is well over 1%.
- `RouteHero.astro:73` badge — `border border-gold/60 ... text-gold` — exactly the "bronze-bordered chip" DESIGN.md warns against under One-Percent Rule.
- `PricingPage.astro:85–98` per-section ordinal `01–04` next to h2 titles duplicates what the "Jump to" list above already supplied. Two ordinals for the same section.
- Footer wordmark repeats the header wordmark; three wordmark instances per page (header + mobile menu + footer). Trim to one.

## Questions to Consider

1. **What if the entire site dropped the eyebrow utility?** Cut all 38 `.caption` instances. Replace each with nothing, or with a single italic Spectral phrase doing editorial work. Would the site still feel like the Lacquerware Box? Likely yes — and probably *more* like Aman, which doesn't open every section with a tracked label.
2. **What if the inquiry "form" stopped being a form?** PRODUCT.md says final conversation lives on LINE / WeChat / Mail. What if the inquiry page were a 3-question conversational interface ("when? — where? — how shall we reach you?") that ended by handing off to whichever channel the user picked, no contact-info wall? The current form pretends the site is a transaction surface, which the brand explicitly rejects.
3. **What if there were no service pages — just one page per *trip*?** Airport / Charter / Ski / Rental are operational categories, not how a client thinks. A client thinks "Narita → Tokyo at 11pm with kids" or "東京→白馬 with skis." Trip-shaped IA (Narita Late-Night, Hakuba Day, Fuji Day, Kyoto Half-Day, Document-Free Self-Drive) would give every page a real spine and prevent the current structural sameness.
4. **What if bronze were used exactly twice per page, enforced programmatically?** Strip all `text-gold` / `bg-gold` / `border-gold`, find the bare minimum (1 hero accent word + 1 closing CTA fill = 2). Count every other appearance as debt. The wordmark dot would fight for one slot. That kind of enforced scarcity turns "Aman-style" into actual Aman.
