---
name: SevenSeatJP
description: Bilingual hospitality marketing site for a 7-seat private charter in Japan. Aman-lane warm soot black + ivory + aged bronze.
colors:
  bg: "oklch(0.13 0.005 60)"
  surface: "oklch(0.16 0.005 60)"
  surface-lift: "oklch(0.2 0.006 60)"
  border: "oklch(0.28 0.006 60)"
  border-strong: "oklch(0.38 0.008 60)"
  text: "oklch(0.94 0.008 80)"
  text-muted: "oklch(0.72 0.01 80)"
  text-deep: "oklch(0.55 0.01 80)"
  bronze: "oklch(0.62 0.085 50)"
  bronze-dark: "oklch(0.48 0.09 45)"
typography:
  display:
    fontFamily: "Spectral, 'Shippori Mincho', 'Noto Serif JP', 'Source Han Serif SC', serif"
    fontSize: "clamp(2.5rem, 2rem + 2.3vw, 3.75rem)"
    fontWeight: 400
    lineHeight: 1.12
    letterSpacing: "-0.02em"
  display-jp:
    fontFamily: "'Shippori Mincho', 'Noto Serif JP', 'Source Han Serif SC', serif"
    fontSize: "clamp(2rem, 1.2rem + 3vw, 6rem)"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Spectral, 'Shippori Mincho', serif"
    fontSize: "clamp(1.875rem, 1.55rem + 1.4vw, 2.5rem)"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  title:
    fontFamily: "Spectral, 'Shippori Mincho', serif"
    fontSize: "clamp(1.5rem, 1.3rem + 0.9vw, 1.875rem)"
    fontWeight: 400
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  body:
    fontFamily: "'Zen Kaku Gothic New', 'Noto Sans JP', system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.75
    letterSpacing: "normal"
    fontFeature: "'palt' 1"
  label:
    fontFamily: "Spectral, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0.18em"
rounded:
  card: "0"
  input: "2px"
spacing:
  hairline: "1px"
  tight: "0.5rem"
  base: "1rem"
  section: "6rem"
  section-loose: "10rem"
components:
  button-link:
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.card}"
    padding: "0 0 0.25rem 0"
    height: "2.75rem"
  button-link-hover:
    textColor: "{colors.bronze}"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.bronze}"
    typography: "{typography.label}"
    rounded: "{rounded.input}"
    padding: "0 1.75rem"
    height: "3rem"
  button-quiet-hover:
    backgroundColor: "{colors.bronze}"
    textColor: "{colors.bg}"
  button-solid:
    backgroundColor: "{colors.bronze}"
    textColor: "{colors.bg}"
    typography: "{typography.label}"
    rounded: "{rounded.input}"
    padding: "0 1.75rem"
    height: "3rem"
  button-solid-hover:
    backgroundColor: "{colors.bronze-dark}"
  input-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.card}"
    padding: "0 0.75rem"
    height: "2.75rem"
  caption:
    textColor: "{colors.text-muted}"
    typography: "{typography.label}"
    height: "auto"
  card-row:
    backgroundColor: "transparent"
    rounded: "{rounded.card}"
    padding: "1.25rem 0"
---

# Design System: SevenSeatJP

## 1. Overview

**Creative North Star: "The Lacquerware Box"**

A deep-woodgrain hull with a warm matte finish, hardware tucked under the rim, a single bronze hinge that gleams only when the lid moves. Heavy in the hand, made to be opened a handful of times, slowly. The interface has the same posture: warm soot black ground, ivory text laid like rice paper inside, aged bronze used so sparingly that the eye catches on it only twice per page.

The system is **photo-led, hairline-structured, near-zero ornament**. Marketing pages live or die on their photography (vehicle cabins, ski-road approaches, predawn airport pickups). The UI's only job is to make space for those photos and give the bilingual editorial typography somewhere quiet to land. Anything that draws attention to itself (rounded card chrome, decorative gradients, busy shadows, chip toolbars, bottom-sticky CTAs) is interrupting the photograph.

This system explicitly rejects the four reflexes called out in PRODUCT.md: the rideshare-app shell (sticky CTAs, map-first hero, real-time driver markers), the OTA banner-grid (promo ribbons, savings tags, carousel arrows), the black-and-gold luxury (saturated gold strokes, beveled headlines, casino-Macao chroma), and the Airbnb cosy-warm (handwritten faces, illustration, emoji, "welcome home" voice).

**Key Characteristics:**
- Warm soot black ground (`oklch(0.13 0.005 60)`), never `#000`.
- Ivory paper text (`oklch(0.94 0.008 80)`), never `#fff`.
- Aged bronze accent (`oklch(0.62 0.085 50)`) deployed at ≤1% area per page.
- Zero default radius on containers, 2px chamfer on form controls and filled buttons only.
- Zero default shadow; depth conveyed through three tonal lifts of the soot ramp.
- Spectral + Shippori Mincho for display; Zen Kaku Gothic New for body (both scripts).
- Touch targets ≥44×44px (WCAG 2.5.5); `:focus-visible` is 1px bronze outline + 3px offset.

## 2. Colors: The Soot-and-Paper Palette

Five tonal lifts of warm near-black for ground, paper, rules, and a single bronze accent. Hues stay in the 50–80° range (the warm earth side of OKLCH); nothing blue, nothing high-chroma. Chroma is dialled down at lightness extremes so dark surfaces don't take on a video-game purple cast.

### Primary
- **Aged Bronze** (`oklch(0.62 0.085 50)` → `--color-gold`): the lone accent. CTA underlines, link hover, focus ring, numeric ordinals in mobile nav, the small punctuation dot in the wordmark. Used as a *fill* only on the single primary button per page.
- **Bronze Dark** (`oklch(0.48 0.09 45)` → `--color-gold-dark`): the hover state of the bronze fill. Slightly more saturated, slightly darker; reads as the bronze pressing in.

### Neutral (the soot-and-paper ramp)
- **Soot Black** (`oklch(0.13 0.005 60)` → `--color-bg`): page ground. The 60° hue offset (toward yellow-orange) keeps the surface in the same family as the bronze accent and avoids the dead-cold `#000` feel.
- **Surface** (`oklch(0.16 0.005 60)` → `--color-surface`): form-control fills, vehicle spec containers, inquiry-form input grounds. One step above the page ground.
- **Surface Lift** (`oklch(0.2 0.006 60)` → `--color-surface-lift`): rare; reserved for explicit elevation moments (cabin-detail callout overlay).
- **Hairline** (`oklch(0.28 0.006 60)` → `--color-border`): the only line-weight on the site. All 1px borders, dividers between testimonial paragraphs, the underline under section labels.
- **Hairline Strong** (`oklch(0.38 0.008 60)` → `--color-border-strong`): input borders that need to read as interactive rather than decorative.
- **Ivory** (`oklch(0.94 0.008 80)` → `--color-text`): primary text. Slight 80° warmth keeps it from going cold-blue against the soot black.
- **Ivory Muted** (`oklch(0.72 0.01 80)` → `--color-text-muted`): supporting paragraphs, captions, footer body.
- **Ivory Deep** (`oklch(0.55 0.01 80)` → `--color-text-deep`): the tertiary tier; the "scroll" hint at hero base, decorative separators.

### Named Rules

**The One-Percent Rule.** Aged bronze is used on ≤1% of any given page's painted area. Counted across the document: a 1px hairline underline + the wordmark dot + a single button fill = within budget. A bronze-bordered card + bronze hover + bronze chip + bronze section label = budget blown. Strip until the bronze count fits on one hand.

**The No-Pure-Black Rule.** Never `#000`, never `#fff`. The warmth in the soot black is what separates this from generic dark-mode SaaS. Every new color picks up chroma ≥0.005 toward the 50–80° hue family.

## 3. Typography

**Display Font (Latin):** Spectral. Editorial serif with high-contrast strokes; reads as quiet authority without going Didone-thin.
**Display Font (Japanese):** Shippori Mincho. Sister gesture in Mincho-class; controlled brush taper. Activated automatically by `:lang(ja)` and the `font-display-jp` utility.
**Body Font (both scripts):** Zen Kaku Gothic New. Geometric sans that handles Japanese and Latin in the same column without breaking rhythm. `font-feature-settings: "palt" 1` is enabled site-wide so Japanese punctuation packs tightly.

**Character:** Mincho-class serif over geometric sans is the "newspaper masthead over book body" pairing. Reads as established, considered, lightly literary. Anti-cliché check: this is *not* the saturated AI-slop "Tiempos + GT America" pair — Spectral + Zen Kaku is quieter, less recognised, more Japanese.

### Hierarchy
- **Display-JP** (`400`, `clamp(2rem, 1.2rem + 3vw, 6rem)`, line-height `1.1`): hero headlines on the home page only. Used once per document.
- **Display** (`400`, `clamp(2.5rem, 2rem + 2.3vw, 3.75rem)`, line-height `1.12`): closing CTA blocks and one-line page-defining statements.
- **Headline** (`400`, `clamp(1.875rem, 1.55rem + 1.4vw, 2.5rem)`, line-height `1.2`): section titles on service pages.
- **Title** (`400`, `clamp(1.5rem, 1.3rem + 0.9vw, 1.875rem)`, line-height `1.25`): editorial-row titles inside `ServiceGrid` and `TestimonialsList`.
- **Body** (`400`, `1rem` (small) / `clamp(1.0625rem, 0.97rem + 0.4vw, 1.1875rem)` (large), line-height `1.75`): paragraph text. Body line length capped at `max-w-xl` (≈ 36rem ≈ 65ch).
- **Label / Caption** (`400`, `0.75rem`, letter-spacing `0.18em`, uppercase): the `.caption` utility. Eyebrow above every section; the editorial gear that anchors the grid.
- **Ordinal** (`300`, tabular numerals via `font-variant-numeric: tabular-nums lining-nums`): exclusively for serial numbers (01–10 in mobile nav, 01–04 in service grid).

### Named Rules

**The Two-Voice Rule.** Spectral and Shippori Mincho are sister gestures, not the same typeface. On `/ja` routes the hero uses `font-display-jp` primary; on `/zh` routes the hero uses `font-display`. Both pages share Zen Kaku for body — that's where the system stays consistent across scripts.

**The Eyebrow Rule.** Every section begins with a `.caption` label. Removing the caption causes the section to read as a SaaS landing block within two scrolls; keep it.

## 4. Elevation

This system is **flat by default**. The shadow vocabulary is `none` (`--shadow-card: none`). Depth is conveyed through three tonal lifts of the soot ramp (`bg → surface → surface-lift`) and through 1px hairline rules.

Reasoning: shadows on a soot-black ground always read either too soft (invisible) or too hard (smoke). Tonal layering on warm near-black holds depth without smudging the photography.

The whole system has exactly three "elevation moments":
1. **Cabin-detail callout** on the home page: a 100vw photograph with a `bg-gradient-to-t from-bg via-bg/30 to-transparent` overlay so the text panel rises out of the image. Soft, photographic; not a shadow.
2. **Mobile menu panel**: a full-bleed `bg-bg` surface at `z-60`, opacity-transition lift. No shadow.
3. **Header tone shift on scroll**: when `scrollY > 64`, the immersive header gains `background-color: oklch(0.13 0.005 60 / 0.88)` + `backdrop-filter: blur(12px)`. The blur is *functional* (separating header from photography), not decorative.

### Named Rules

**The Flat-by-Default Rule.** No `box-shadow` on cards, hovers, or focus rings. Depth means a hairline rule, a tonal step on the soot ramp, or a photograph. Three primitives, nothing else.

**The Functional Blur Rule.** `backdrop-filter` is permitted only where it does work the image can't (text legibility over varied photography). It is never decorative chrome. And whatever element gains the filter must not contain other `position: fixed` elements — `backdrop-filter` creates a containing block that collapses nested fixed children to the element's size. Mobile menu panel learnt this lesson; keep all future fixed panels at `<body>` level.

## 5. Components

Components are **quiet structure, photo-led**: the chrome says little, the photograph and the typography say everything. Each component lifts visual budget out of the page only when it has a job to do.

### Buttons

Three variants, used in strictly different contexts. Promotion ladder: link → quiet → solid.

- **Shape:** zero radius on the link variant; 2px chamfer (`--radius-input`) on quiet and solid. The 2px is barely perceptible — just enough to soften a saturated fill without sliding into "friendly app button".
- **Link** (`variant="link"`): hairline-underlined typographic CTA with a trailing `→` glyph. Default CTA shape — used 80% of the time. Text in ivory, underline at 40% ivory; hover migrates both to aged bronze and the `→` slides 4px right.
- **Quiet** (`variant="quiet"`): 1px bronze-bordered button with bronze text. Reserved for the inquiry-form submit. Hover *fills* with bronze, inverts text to soot.
- **Solid** (`variant="solid"`): fully filled aged bronze on soot text. The single primary action per page (closing-block CTA on home, "送信" on inquiry). If a page has two `solid` buttons, one of them is wrong.

All three share label-class typography: Spectral, 12px (`text-sm`), `letter-spacing: 0.12em`, uppercase. Touch target ≥44×44px (`min-h-11` for link, `min-h-12` for filled variants).

### Inputs / Fields

- **Style:** `bg-surface` fill (oklch 0.16), 1px `border` (oklch 0.28), **zero radius** (`rounded-[var(--radius-card)]` resolves to 0), 12px horizontal padding, min-height 44px.
- **Label:** sits *above* the input on its own line (`flex flex-col gap-2`), Spectral 14px, with a bronze required-marker (`· 必須`).
- **Focus:** browser default is overridden globally to `outline: 1px solid var(--color-gold); outline-offset: 3px; border-radius: 0`. The same treatment used on every focusable element on the site.
- **No floating labels, no inset placeholders.** Both fight Japanese / Chinese text rendering and impede a11y.

### Cards / Containers

Cards as a pattern are **intentionally avoided** outside of inquiry-form field groupings. Where the AI-slop instinct says "card grid", this system uses **editorial rows** instead: numbered serif ordinal + large photograph + 1px hairline rule below, no enclosing box.

When a container is unavoidable (price-table row group, on-board callout):
- **Shape:** zero radius.
- **Background:** `transparent` over the page ground; never a separate fill.
- **Border:** `border-y` (top + bottom hairline) only; sides open to the column.
- **Shadow:** `none`. Always.
- **Padding:** generous (`py-5` minimum); white space carries the weight that card chrome otherwise would.

### Navigation

- **Desktop header (`lg:` and up):** wordmark left, horizontal nav centred, `LangSwitch` + mobile-menu trigger right. `position: fixed`. Transparent on `immersiveHeader` pages over the hero; gains `bg-bg/85 + backdrop-filter: blur(12px)` only after `scrollY > 64`. Links are Spectral 14px in ivory-muted; hover ivory; active route fully ivory.
- **Mobile (`< lg`):** hamburger button in the header strip; the full-screen panel is rendered as a *sibling of `<header>`, direct child of `<body>`* to escape the header's `backdrop-filter` containing block. Panel opens with `fixed inset-0 z-60`, soot ground, 10-link list, each link an editorial row with serif numeric ordinal (`01`–`10`), 1px `border-b` hairline; hover slides the link 4px right in aged bronze.

### Photographic Hero (signature component)

The `Hero` (home) and `RouteHero` (service pages) components are the signature pattern. They are not "image with overlay" — they are *a photograph that the page begins inside of*. Mechanics:
- `relative isolate h-[100svh] min-h-[600px]` (Hero) or `h-[80svh] min-h-[500px]` (RouteHero), full-bleed.
- `astro:assets` `<Image>` with `widths={[640, 1024, 1600, 2400]}` and `sizes="100vw"`. `quality={80}`, `loading="eager"`, `fetchpriority="high"`. Compile-time AVIF/WebP via the Cloudflare adapter's `imageService: 'compile'`.
- Two stacked gradient overlays: top-to-bottom (`from-bg/55 via-bg/15 to-bg`) for hero-base text legibility, start-to-end (`from-bg/65 via-bg/15 to-transparent`) for left-aligned headline legibility.
- Headline uses Display-JP at the largest fluid clamp; `sr-only` SEO title nested inside the `<h1>` while the visible bilingual two-line treatment is `aria-hidden`.

### Testimonial Block

A single amplified pull-quote anchor, two supporting quotes as hairline-separated rows beneath. Never with avatars, never with star ratings, never with company logos. The language of the quote is the point; not who said it.

## 6. Do's and Don'ts

### Do:
- **Do** ground every dark surface in the warm soot ramp (`oklch(0.13–0.20 0.005–0.006 60)`). Tint every neutral toward 60° hue; 0-chroma neutrals look video-game purple on screens.
- **Do** keep aged bronze under the **One-Percent Rule** — ≤1% of painted area per page.
- **Do** lead every section with a `.caption` label (uppercase, 0.18em-tracked Spectral). It is the editorial gear that anchors the 12-column grid.
- **Do** use `astro:assets` `<Image>` with explicit `widths` and `sizes` for every above-the-fold photograph. Marketing pages live on their photography; serve real srcset.
- **Do** keep `position: fixed` panels as direct children of `<body>`. Header gains `backdrop-filter` on scroll, which creates a containing-block trap for nested fixed descendants (already cost one bug; do not relitigate).
- **Do** write Japanese and Chinese copy independently. No machine-translated parity. Tone can diverge; the visual system stays unified.

### Don't:
- **Don't** use the **rideshare-app reflex** (sticky bottom CTA, map-first hero, real-time driver markers, calculator UI, "几分钟到达"). PRODUCT.md anti-reference #1.
- **Don't** use the **OTA / 旅行社 banner-grid reflex** (promo ribbons, "限時" tags, carousel arrows, "立減 ¥3,000" badges). PRODUCT.md anti-reference #2.
- **Don't** introduce **high-chroma gold** (`oklch chroma > 0.10` in the bronze direction). The bronze is *aged*, not glossy. Going saturated pulls the system into black-and-gold luxury reflex. PRODUCT.md anti-reference #3.
- **Don't** add **handwritten or illustrated ornament**, emoji, "welcome home" voice. The Airbnb cosy-warm direction is incompatible with hospitality-trust positioning. PRODUCT.md anti-reference #4.
- **Don't** use `#000` or `#fff`. Ever. Every neutral picks up ≥0.005 chroma toward 60–80° hue.
- **Don't** wrap content in cards. The default container is the open editorial column with hairline rules.
- **Don't** use `box-shadow` on any component. Depth = tonal step + hairline. That is the entire elevation vocabulary.
- **Don't** use `border-left` / `border-right` > 1px as a colored accent stripe. Match-and-refuse: rewrite with full hairline borders, leading serif ordinals, or no chrome at all.
- **Don't** animate layout properties (`width`, `height`, `padding`). Animate `transform`, `opacity`, or `color` only. Use `ease-out` exponential curves; no bounce, no elastic.
- **Don't** add chat widgets, sticky CTAs, "立即预约" buttons, account systems, or any pattern that implies the site is a transaction surface. The site only carries trust; 24h email reply is the only dynamic promise.
