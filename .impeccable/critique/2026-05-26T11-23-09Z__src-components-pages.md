---
target: src/components/pages/
total_score: 31
p0_count: 0
p1_count: 0
timestamp: 2026-05-26T11-23-09Z
slug: src-components-pages
---
# SevenSeatJP — Critique (third pass)

Target: `src/components/pages/` (full site).
Compared against: 2nd critique snapshot (28/40), itself compared against 1st (25/40).

## Design Health Score

| # | Heuristic | 1st | 2nd | 3rd | Δ | Why moved |
|---|-----------|-----|-----|-----|---|-----------|
| 1 | Visibility | 2 | 3 | **3** | 0 | Unchanged. |
| 2 | Match Real World | 3 | 3 | **3** | 0 | Partial. zh side fullwidth `？`/`：`/`…`; JA placeholders at `InquiryConversation:85,99,190` still ASCII `:`. Half-fix reads worse than untouched. |
| 3 | User Control | 2 | 2 | **3** | +1 | Section hide/reveal + Skip control + Continue gives explicit ramp. Still no resume-from-refresh, but freedom budget meaningfully expanded. |
| 4 | Consistency | 3 | 3 | **4** | +1 | Hand-rolled `bg-gold` finally gone (`InquiryConversation:318` uses `<Button variant="solid">`). All button paths flow through `BUTTON_STYLES` constant. Three remaining `mt-*` are bullet baseline alignment, not layout. |
| 5 | Error Prevention | 2 | 3 | **3** | 0 | Continue-button section validation adds a guard, no field-level surface. Net flat. |
| 6 | Recognition | 3 | 3 | **3** | 0 | `?service=` prefill is recognition-not-recall, but TripBrowse 4-group still requires categorization. Wash. |
| 7 | Flexibility | 2 | 2 | **3** | +1 | `?service=` query param now read and preselects the `<select>`. Trip→inquiry funnel finally one experience instead of two. |
| 8 | Aesthetic | 3 | 4 | **4** | 0 | Progressive disclosure cuts first-paint inquiry from 14 fields to 6. Stays at 4 because TripBrowse 4-group still trips lane signature. |
| 9 | Error Recovery | 2 | 2 | **2** | 0 | Same single red line. `BAD_REQUEST` doesn't say which field. |
| 10 | Help & Docs | 3 | 3 | **3** | 0 | Unchanged. |
| **Total** | | **25** | **28** | **31** | **+3 / +6** | **Very Good.** Three structural fixes (Consistency violation, Progressive disclosure, hero single-focus) landed structurally rather than cosmetically. |

## Anti-Patterns Verdict

**LLM assessment**: "Not on first glance, but yes on second" → **same verdict, case now thin enough to call coin-flip**. The 2nd critique's exact P0/P1 violations were surgically fixed. But the home-page second-order reflex (TripBrowse 4 stacked groups, each a serif headline + ordinal column + bronze-hover row) wasn't taken. Trip pages individually escape; home is the last piece still inside the lane.

**Deterministic scan**: 2 findings, same 2 false positives (`single-font` + `flat-type-hierarchy` at `BaseLayout`).

**Category-reflex check**:
- First-order: PASS
- Second-order: **carried forward** — TripBrowse 4-group taxonomy still present (mobile column visibility fixed, structural shape didn't change)
- Editorial-typographic lane: still close, but the lane reads more as chosen dialect than as tell

**Scans**:
- Hero-metric template ➔ PASS
- Em-dash audit ➔ PASS (CJK `——` legitimate)
- Side-stripe / gradient / glass / modal / card grids ➔ PASS
- `/pricing` 404 ➔ PASS (grep returns zero)
- Inquiry hand-rolled `bg-gold` ➔ PASS (`<Button variant="solid">`)
- Margin utilities ➔ MOSTLY PASS (3 remaining `mt-*` are bullet baseline alignment)
- ASCII `?` / `:` in CJK ➔ PARTIAL (zh fully fixed, JA placeholders not)

**Bronze "at rest" per page (≤2 budget)** — first pass where ALL 4 surfaces hit budget:
- **Home**: 2 ✓
- **Trip**: 2 ✓
- **Inquiry**: first paint 0 (sections 02+03 hidden so submit + channel not in rendered tree); fully revealed 1 (no default channel, only submit). Was 3 in 2nd critique. ✓✓
- **Legal**: 0 ✓

## Cognitive Load

Previously 2 of 8 failing. **Now 0 of 8 failing.**
- Single focus per screen: FAIL → **PASS** (Hero now single CTA)
- Progressive disclosure: FAIL → **PASS** (sections 02+03 `hidden` by default, Continue validates+reveals)
- All other items unchanged from PASS

## What's Working

1. **Progressive disclosure on Inquiry** — sections 02+03 carry `hidden` (`InquiryConversation:154,209`), Continue button validates then reveals (`inquiry-conversation.client.ts:36-75`), Skip control gives explicit ramp on optional step. First-paint cut from 14 fields to 6. The brand promise "无需追问" now matches the form *structurally*, not rhetorically.

2. **`BUTTON_STYLES` constant + variant pipe** — `button-styles.ts` exports as frozen constant; `Button.astro` reads `BUTTON_STYLES[variant]`; dynamic success CTA in client.ts imports same constant. One source of truth for button classes across both compile-time and runtime. The previous "submit moved files, the inline class didn't" violation can't recur because there *is* no inline class.

3. **`?service=` prefill closes the trip→inquiry loop** — `TripPage:75-79` appends `?service=<category>`; client reads URL with whitelist guard (`inquiry-conversation.client.ts:16-27`). Two pages now act like one funnel.

## Priority Issues That Remain

### [P2] JA inquiry placeholders still ASCII while zh side is fullwidth
**Files**: `InquiryConversation.astro:85,99,190`
**Why**: zh equivalents on the same lines use `：` and `…`. Half-fix reads worse than no-fix.
**Fix**: `例:` → `例：` × 3.

### [P2] Home-page second-order reflex: TripBrowse still 4 stacked groups
**File**: `TripBrowse.astro:81-120`
**Why**: Carried forward from 2nd critique provocative Q. Mobile-column fix applied; structural fix not. The 4-group taxonomy duplicates the spine differentiation each trip page expresses individually.
**Fix**: Collapse to one OL of 7. Drop group headers, merge arrays. Optional: single eyebrow at top.
**Suggested command**: `/impeccable distill` on TripBrowse.

### [P3] RouteHero `badge` prop is latent dead code
**File**: `RouteHero.astro:17,29,72-76`
**Fix**: Delete prop + render branch, or wire to `tokyo-hakuba.yaml` with seasonal badge.

### [P3] Tokushoho placeholders still in production copy
**File**: `TokushohoPage.astro:19,23`
**Why**: `担当責任者(お問合せ時に開示)` + `〒000-0000`. Riley red flag. Blocked on client info. Already in CLAUDE.md pre-launch reminders.

## Persona delta

- **Jordan**: **largest improvement** — Hero one CTA, one destination, no broken link, progressive form (5 fields not 14).
- **Casey**: Better — font perf trim (9→4 weights, expected 59→25-30 file count), TripBrowse mobile shows duration + price.
- **Riley**: Better — `break-words` on both JA + zh hero headlines, `?service=` whitelist guard, Continue-button validation catches malformed date. Tokushoho placeholders + JA punctuation still inconsistent.
- **日本国内 affluent host**: Form-wall blocker closed. `/inquiry?service=charter` forwards cleanly. Passes forward-the-URL test on every page except `/legal/tokushoho`.

## Minor Observations

- Half-converted CJK punctuation (P2 above).
- Font trim is incremental win; self-hosting with character subset (~3000 chars) would beat Google Fonts generic subsets significantly. Follow-up, not blocker.
- Continue-button uses native `reportValidity()` — works but tooltips are stylistically alien to design system.
- 4 `noImportantStyles` warnings on reduced-motion block accepted; rationale in CSS comment.
- 3 wordmark instances per page carried forward. Probably fine for a small marketing site.
- `form.replaceWith(success)` destroys form node on submit; browser-back from external channel won't restore. Low impact.

## Questions to Consider

1. **What if Continue-button validation surfaced error inline next to the field, not via browser-default `reportValidity()`?** A single shared `<p class="text-sm text-gold">` slot per section, populated by JS on fail, closes the last form rough edge without a validation library.

2. **What if `/legal/tokushoho` rendered placeholders as `<dl>` rows that read "情報未公開 · 開示はお問合せ時に" rather than `〒000-0000`?** Honest copy beats fake-data placeholders.

3. **What if TripBrowse collapsed to one OL of 7 with a sortable eyebrow row `BY REGION · BY SEASON · BY DURATION`?** Stays in the editorial lane but the lane becomes chosen voice rather than default reflex.

4. **What if the Skip control on section 02 became prose ("luggage and notes are optional; you can tell us later") rather than a button?** Skip-as-button reads transactional. Skip-as-prose reads brand voice.
