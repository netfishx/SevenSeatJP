---
target: src/components/pages/
total_score: 28
p0_count: 3
p1_count: 1
timestamp: 2026-05-26T10-56-27Z
slug: src-components-pages
---
# SevenSeatJP — Critique (second pass, post 11-commit redesign)

Target: `src/components/pages/` (full site).
Compared against: `.impeccable/critique/2026-05-26T08-19-05Z__src-components-pages.md` (25/40).

## Design Health Score

| # | Heuristic | Prev | Curr | Δ | Why moved |
|---|-----------|------|------|---|-----------|
| 1 | Visibility of System Status | 2 | **3** | +1 | Submit swaps to visible `送信中…` text on submit, not just `aria-busy` (`InquiryConversation.astro:302-312` + `inquiry-conversation.client.ts:183-184,221-223`). Channel-aware success state with deeplink CTA. |
| 2 | Match System / Real World | 3 | **3** | 0 | `JA·中` / `10y` / `incl. tax · all-in` gone with the service pages. ASCII `?` and `:` still leak in JA/zh inquiry copy where `？` / `：` are native. Wash. |
| 3 | User Control and Freedom | 2 | **2** | 0 | Form session still lost on refresh after submit. No "back to inquiry" affordance. Date `min=today` is Error Prevention, not Freedom. |
| 4 | Consistency and Standards | 3 | **3** | 0 | Legal h1s correctly migrated to `text-text`. **But inquiry submit is still hand-rolled `bg-gold`** (`InquiryConversation.astro:302-312`) — the exact pattern flagged previously, file moved, violation didn't. |
| 5 | Error Prevention | 2 | **3** | +1 | `date min=today` added. Channel discriminator enforces email-when-mail in schema. Luggage gets inline hint `(26 寸及以上)`. Still no inline field-level validation. |
| 6 | Recognition Rather Than Recall | 3 | **3** | 0 | Trip-page sameness genuinely fixed (4 spine types verified). Home now has TripBrowse instead — net wash on register variety. |
| 7 | Flexibility and Efficiency | 2 | **2** | 0 | `?service=` query param set by trip-page CTAs but inquiry form never reads it. Missed prefill. |
| 8 | Aesthetic and Minimalist Design | 3 | **4** | +1 | The real win. TrustMetrics deleted, Card.astro deleted, `.grain` deleted, `animate-pulse` deleted, captions 28→16 verified, bronze 40→24, wordmark dot demoted. |
| 9 | Error Recovery | 2 | **2** | 0 | Still a single red line above submit. No field-level errors. `BAD_REQUEST` doesn't say which field. |
| 10 | Help and Documentation | 3 | **3** | 0 | Unchanged. |
| **Total** | | **25** | **28** | **+3** | **Good, edging Very Good.** Real movement on Aesthetic + Status + Error Prevention. The exact Consistency violation example carried forward; Progressive disclosure didn't move structurally. |

## Anti-Patterns Verdict

**LLM assessment**: *"Not on first glance, but yes on second"* → **same verdict, weaker case.** Real specific dials moved: TrustMetrics gone, Card/.grain/animate-pulse gone, reduced-motion added, 4 different spine types per trip, em-dashes audit clean (remaining `——` are legitimate CJK).

**But the home page is still inside the lane.** `TripBrowse` replaces TrustMetrics with 4 fresh ordered-list sections, each opening with a serif headline + 12-col caption-left + body-right grid + bronze hover rows. The eyebrow scaffolding shifted shape, didn't retire. Second-order reflex still trips at the home-page level. Trip pages individually escape the lane via spine differentiation; home page didn't.

**Deterministic scan**: 2 findings, both **false positives** (same as run 1):
- `single-font` at `BaseLayout:75` — detector saw only Spectral in the Google Fonts URL; same URL loads 3 families.
- `flat-type-hierarchy` at `BaseLayout:102` — header chrome is intentionally narrow; content type scale lives in `--text-*` clamps up to 7rem.

**Visual overlays**: not run (synchronous critique; browser injection skipped).

**Category-reflex check (重点)**:
- **First-order: PASS** — same as before.
- **Second-order: WEAKER FAIL** — Trip pages escape the Aman lane via content-derived spine types (timeline / season / itinerary / checklist). Home page does not — TripBrowse + lead-grid both use the canonical caption-left + body-right 12-col, which IS the lane signature.
- **Editorial-typographic lane: STILL CLOSE.** 16 captions across the site (down from 28). Inquiry page opens each section with `01 / 02 / 03` serif tabular ordinal + headline — that is a Klim signature move. Whether you read this as "lane resident" or "fluent in the dialect" is now a judgment call; my read: the latter is plausible but the former is still the prior.

**Scans**:
- Hero-metric template ➔ **PASS** (TrustMetrics deleted, confirmed)
- Em-dash audit ➔ **PASS** (all `—` in JA/zh copy are now `——` CJK double-em; remaining `—` are in code comments only)
- Side-stripe / gradient text / glassmorphism / modal-first / identical card grids ➔ PASS (last with caveat: TripBrowse is 4 identical OLs stacked — pattern shifted shape)
- Bronze-bordered chip ➔ **NOT TESTABLE** (RouteHero `badge` prop still defined at `:17, :72-76` but no current trip YAML passes one; latent risk only)

**Bronze "at rest" per page** (Q4 commitment was ≤2):
- **Home**: Hero second line (1) + closing CTA solid (1) = **2** ✓
- **Trip page**: RouteHero secondary (1) + closing CTA solid (1) = **2** ✓
- **Inquiry**: default-checked channel renders bronze label + indicator dot on first paint via `peer-checked:text-gold` + submit button bg = **3 at rest** (slight over)
- **Legal**: **0** ✓

Three of four hit the goal. Inquiry overshoots by 1 because the recommended-channel pre-check bronzes both label and dot.

## Overall Impression

Real progress on the visual restraint dimensions. The hero-metric template is gone, the bronze count is meaningful, the dead components are gone, motion preference is honored. **But two specific issues from the previous critique survived in disguise:**

1. **The inquiry "conversational" form is visually re-skinned, not structurally progressive.** Same 14 fields render at first paint. The provocative #2 ("inquiry stops being a form") was not delivered — it was repainted.
2. **The inquiry submit button is still the hand-rolled `bg-gold` block** that was called out as the load-bearing Consistency violation. The file moved; the inline class string didn't.

Plus one new launch-blocker: **`/pricing` link in the home hero is a 404** (`Hero.astro:69`). Deleted in IA refactor, the link wasn't.

## What's Working

1. **4 Spine components** (TimelineSpine / SeasonSpine / ItinerarySpine / ChecklistSpine) — single best architectural decision. Trip pages get content-derived spine per category in YAML. Trip pages individually escape the editorial-typographic lane.
2. **TrustMetrics replaced with prose, not another widget.** `HomePage:24-27` lead paragraph does in 60-80 chars what the metric strip was trying to do — and reads as brand voice, not facade.
3. **Wordmark dot demoted from bronze to `text-text-deep`.** Single-line change, huge cumulative effect — bronze finally means something specific (primary action + selected state + one hero highlight), not "decoration applied wherever."

## Priority Issues That Remain

### [P0] `/pricing` link in home hero is a 404
**File**: `src/components/home/Hero.astro:69`
**Why**: `<a href={locale === 'zh' ? '/zh/pricing' : '/pricing'}>` but `/pricing` was deleted in sub-step 3.5. Every visitor clicking "料金一覧を見る / 查看料金一览" lands on 404. **Launch blocker.**
**Fix**: Delete the link (also solves single-focus-per-screen — see issue below), or route to `/about` or a yet-to-build trip index.
**Suggested command**: `/impeccable distill` on Hero.astro.

### [P0] Inquiry submit is still hand-rolled `bg-gold`, not `<Button variant="solid">`
**File**: `src/components/inquiry/InquiryConversation.astro:302-312`, also dynamic injection at `inquiry-conversation.client.ts:198`
**Why**: Verbatim what Button.astro:20 (variant="solid") emits. The previous critique flagged this as the load-bearing Consistency violation. The class string moved files, the violation didn't.
**Fix**: Replace with `<Button type="submit" variant="solid">…</Button>`. For the dynamic success CTA, expose a shared `BUTTON_SOLID_CLASSES` constant or pre-render the button as an HTML template.
**Suggested command**: Direct edit.

### [P0] Inquiry form is still 14 fields on one screen — re-skinned, not split
**File**: `src/components/inquiry/InquiryConversation.astro:42-313`
**Why**: 3 `<section>` blocks (01/02/03) but all visible at first paint. The previous critique's "Step 1 of 2 indicator + progressive disclosure" recommendation was not implemented. Email field toggles based on channel; nothing else hides.
**Fix**: Either (a) split into 2 actual screens (sections 01+02 on first screen, 03 on next; sessionStorage for state), or (b) aggressively cut: drop `luggage`/`notes` from the inquiry payload entirely, ask them in the follow-up email/LINE/WeChat conversation. The brand promise ("无需追问") would finally be honored.
**Suggested command**: `/impeccable distill` on InquiryConversation.astro.

### [P1] Single-focus violation on home hero — 2 CTAs in the same row
**File**: `src/components/home/Hero.astro:64-72`
**Why**: Button variant="link" to inquiry + caption-styled link to /pricing in the same row. Jordan can't tell which is primary. P0 above fixes the broken half; this issue asks: do we ever bring back the second CTA, or commit to single-focus per hero?
**Fix**: Drop the second CTA. Hero ends in the inquiry-link Button only. Aligns with the Lacquerware-Box restraint principle.
**Suggested command**: same as P0 above — `/impeccable distill` Hero.

### [P2] Margin utilities still scattered — violates project zero-margin CSS rule
**Files**: `Hero.astro:47,61,64` (`mb-4`, `mt-6`, `mt-8`), `BaseLayout.astro:125` (`mt-24`), `AboutPage.astro:98` (`mb-5`), `InquiryConversation.astro:288` (`mt-2`), `PackageCard.astro:53` + `VehicleCard.astro:64` (`mt-1.5`), `FaqPage.astro:61` (`mt-1`), `InquiryPage.astro:37,42,47,48,52,55` (`ms-3` × 6).
**Why**: `~/.claude/rules/css-layout.md` forbids `m-*` / `ms-*` / `me-*` in app code. The redesign didn't touch this. Most can be replaced by parent `flex flex-col gap-*`.
**Fix**: `/impeccable normalize` or focused sweep — replace each margin with parent `gap-*`. Highest leverage: InquiryPage.astro contact panel (6 `ms-3` instances; rewrite as `flex gap-3`).

## Persona Red Flags (delta)

- **Jordan (confused first-timer)**: Bronze restraint helps; now bronze = primary action only. **But the dual-CTA in hero is unfixed AND broken** — clicking "/pricing" lands on 404. Net: worse than before because previously-confusing CTA is now confusing-and-broken.
- **Casey (mobile + 3G)**: Hero still `h-[100svh]`. Inquiry form still 14 fields at first paint. `prefers-reduced-motion` now respected. Net: marginally better.
- **Riley (stress-tester)**: `date min=today` real fix. Channel discriminator catches mail-without-email server-side. Hero secondary still lacks `break-words` (RouteHero added it at `:61`; Hero `:55-59` didn't). Tokushoho placeholders still in production copy. Net: better, not done.
- **日本国内 affluent host**: **Best delta of all four.** TrustMetrics deletion + lead paragraph + 7 named trips with prices on home + sample-itinerary CTA going to a real trip page — trust evidence is now medium, not thin. Forward-the-URL test would pass on home. Would fail at /inquiry for the same form-wall reason.

## Minor Observations

- ASCII `?` and `:` in JA/zh inquiry strings where `？` / `：` are native (`InquiryConversation.astro:25,30,48,79,95,156,178-182,194`). Brand should not lose these.
- `recommendedChannel = locale === 'zh' ? 'wechat' : 'line'` pre-checks a radio → bronze paints on initial load. Renders fast as "we already decided." Consider unchecked-first-paint; bronze only after user picks.
- `TripBrowse.astro:104-109` hides duration + starting price columns under `sm:`. On mobile the trip list shows only title + ordinal. Duration / price are valuable trust evidence for the primary form factor; stack them under the title instead of hiding.
- `?service=` query param on trip-page CTAs (`TripPage.astro:78`) is never read by the inquiry client. Wire it up or drop the param.
- `RouteHero badge` prop still defined (`:17, :72-76`) but no trip YAML passes one. Either remove the prop or document the seasonal-badge contract for tokyo-hakuba.
- Footer wordmark + header wordmark + mobile-menu wordmark = 3 wordmark instances per page. Previous critique flagged; unchanged.

## Questions to Consider (new — previous 4 were executed)

1. **What if InquiryConversation were genuinely two pages?** `/inquiry` renders only 01+02 with a `Continue →` button; submit-step-1 navigates to `/inquiry/contact` with sessionStorage state; that page renders only 03. Browser-back restores state, refresh is safe. The brand voice would finally match the form.

2. **What if TripBrowse collapsed to one list of 7, not 4 groups?** The 4 category headers duplicate the spine differentiation the trip pages themselves express. One ordered list of 7 (sorted by region or by season-relevance to today's date) would be quieter and read as "the actual menu" rather than "a taxonomy of menus."

3. **What if the Hero had no CTA at all?** Lacquerware Box north-star says hero is "a photograph the page begins inside of." Right now hero ends with Button + (broken) link. What if it ended in silence? Lead paragraph below becomes the first interactive element; home gets exactly 1 visible-at-rest CTA (closing solid bronze). Maximum scarcity.

4. **What if every `/trip/{slug}` page exposed its spine type as the top-of-page eyebrow?** "Timeline" / "Season" / "Itinerary" / "Checklist" replaces the current category eyebrow. Teaches the visitor "this site indexes trips by shape, not by service-type" — the IA insight the spine system encodes but doesn't surface.
