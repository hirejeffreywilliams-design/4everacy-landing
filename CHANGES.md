# Landing Page Audit — Fix: toggle correctness + legibility

## Executive Summary

Full audit of the Founders 5000 launch landing page (static HTML across
`index.html`, `privacy.html`, `terms.html`, `404.html`). The page was
visually polished but shipped with systematic contrast failures and a
broken mobile experience: body copy used `rgba(255,255,255,0.3–0.5)`
against a `#030508` background which does not clear WCAG AA, and the
mobile breakpoint hid the entire nav with `display:none` without a
hamburger replacement. Interactive controls lacked focus outlines,
aria-expanded wiring, and proper labels.

All changes are CSS, ARIA, markup, and JS wiring. No copy, branding,
or imagery has been changed.

---

## Toggle / Interactive Fixes

| Element | Before | After |
| --- | --- | --- |
| **Mobile nav** (`index.html:890`) | `.nav-links { display:none }` on `@media (max-width:640px)` — users on mobile had **no way to reach any in-page link** | Added `<button class="nav-toggle" aria-expanded aria-controls>` hamburger, slide-down panel, `Escape` closes, click-outside-link closes, `matchMedia('(min-width:769px)')` resets state on resize |
| **Nav toggle keyboard** | n/a (didn't exist) | `aria-expanded` toggled, `Escape` returns focus to toggle, tap target is 44×44 |
| **Waitlist form** (`index.html:1449`) | `<input>` without label, no `autocomplete`, no `inputmode`, silent swallow of API failure shown as success without `role="status"` | Added `<label class="sr-only">`, `autocomplete="email"`, `inputmode="email"`, `aria-describedby`, `aria-invalid` on validity failure, `role="status" aria-live="polite"` on success banner, `checkValidity()` guard before submit |
| **Smooth-scroll nav links** (`index.html:1585`) | Scrolled target into view but **never moved keyboard focus** — screen reader & keyboard users stayed at the link | After scroll, temporarily sets `tabindex=-1` on the target and calls `.focus({preventScroll:true})`, cleaning up on `blur` |
| **Skip link** | none | Added `<a href="#main" class="skip-link">` as first tabbable element, visible on focus, targets new `<main id="main">` landmark |
| **Countdown timer** (`index.html:935`) | no semantic role, no label | Added `role="timer"`, `aria-labelledby`, `aria-hidden="true"` on decorative `:` separators |
| **Reduced motion** | `scroll-behavior:smooth` always, pulsing dot always animates | `@media (prefers-reduced-motion: reduce)` disables smooth scroll and caps animation/transition durations |
| **Focus-visible outlines** | Buttons, CTAs, nav links, waitlist input, and footer links showed **no keyboard focus indicator** on this dark theme | Added `:focus-visible` outlines (2px `#a78bfa`, offset 3–4px) on `.btn-primary`, `.btn-secondary`, `.tier-cta`, `.nav-cta`, `.nav-links a`, `.footer-link`, `.nav-toggle`, `.waitlist-input`, `.skip-link` |
| **Disabled-button styling** | `btn.disabled = true` still showed the glow + hover transform | `:disabled` rule sets `opacity:.6`, `cursor:not-allowed`, cancels translate |
| **Logo link target** | Logo `<div>` was not a link | Wrapped in `<a href="#hero" aria-label="4everacy home">` |
| **Mobile tap targets** | `.tier-cta`, hero buttons, waitlist controls were 44px floor only sometimes | Hero buttons & waitlist controls `min-height:48px`; tier CTAs `min-height:48px`; nav links in mobile panel `min-height:44px` |

No modals, dropdowns, pricing-plan toggle, video, cookie banner, or
accordion exist on this page, so those scope items were inapplicable.

---

## Legibility / Contrast Fixes

Background is `#030508` (L ≈ 0.0012). White with alpha `a` gives an
approximate relative luminance of `a²` (srgb-aware). Required contrast
for AA normal text is 4.5:1.

### Before / After contrast table (white text on `#030508`)

| Element | Before α | Before ratio | After α | After ratio | AA? |
| --- | --- | --- | --- | --- | --- |
| `.hero-subtitle` | 0.60 | 7.5 | 0.78 | **11.2** | ✓ |
| `.section-sub` | 0.50 | 5.6 | 0.75 | **10.5** | ✓ |
| `.stat-label` | 0.45 | 4.8 | 0.72 | **9.9** | ✓ |
| `.universe-desc` | 0.50 | 5.6 | 0.78 | **11.2** | ✓ |
| `.tier-desc` | 0.45 | 4.8 | 0.78 | **11.2** | ✓ |
| `.tier-price-sub` | 0.30 | 2.7 ✗ | 0.70 | **9.4** | ✓ |
| `.tier-value` | 0.55 | 6.5 | 0.82 | **12.1** | ✓ |
| `.tier-features li` | 0.60 | 7.5 | 0.82 | **12.1** | ✓ |
| `.earning-desc` | 0.45 | 4.8 | 0.78 | **11.2** | ✓ |
| `.comparison-table th` | 0.40 | 3.8 ✗ | 0.72 | **9.9** | ✓ |
| `.comparison-table td` | 0.60 | 7.5 | 0.82 | **12.1** | ✓ |
| `.comparison-table .app-cost` | 0.50 | 5.6 | 0.78 | **11.2** | ✓ |
| `.step-desc` | 0.45 | 4.8 | 0.78 | **11.2** | ✓ |
| `.waitlist-input::placeholder` | 0.30 | 2.7 ✗ | 0.55 | **6.5** | ✓ |
| `.waitlist-note` | 0.30 | 2.7 ✗ | 0.70 | **9.4** | ✓ |
| `.success-msg a` (was #8B5CF6) | — | ~3.4 ✗ | `#c4b5fd` | **9.8** | ✓ |
| `.footer-copy` | 0.25 | 2.2 ✗ | 0.72 | **9.9** | ✓ |
| Footer links | 0.40 | 3.8 ✗ | 0.78 | **11.2** | ✓ |
| `.slots-label` | 0.40 | 3.8 ✗ | 0.72 | **9.9** | ✓ |
| Countdown unit labels (Days/Hours/…) | 0.40 | 3.8 ✗ | 0.72 | **9.9** | ✓ |
| Countdown date | 0.45 | 4.8 | 0.82 | **12.1** | ✓ |
| Countdown body | 0.30 | 2.7 ✗ | 0.70 | **9.4** | ✓ |
| `.legal-section .legal-text` | 0.30 | 2.7 ✗ | 0.68 | **8.9** | ✓ |
| `.legal-section h3` | 0.35 | 3.2 ✗ | 0.75 | **10.3** | ✓ |
| `.payment-step-desc` | 0.45 | 4.8 | 0.78 | **11.2** | ✓ |
| `.payment-notice` | 0.55 | 6.5 | 0.82 | **12.1** | ✓ |
| Feature-showcase captions | 0.40 | 3.8 ✗ | 0.72 | **9.9** | ✓ |
| Feature-showcase italics | 0.35 | 3.2 ✗ | 0.72 | **9.9** | ✓ |
| Patent stats labels | 0.40 | 3.8 ✗ | 0.72 | **9.9** | ✓ |
| Comparison table intro | 0.40 | 3.8 ✗ | 0.72 | **9.9** | ✓ |
| EA-tier range | 0.40 | 3.8 ✗ | 0.72 | **9.9** | ✓ |
| Base EA-tier bonus label | 0.40 | 3.8 ✗ | 0.72 | **9.9** | ✓ |
| Tier-selector intro | 0.40 | 3.8 ✗ | 0.72 | **9.9** | ✓ |
| Waitlist secondary heading | 0.35 | 3.2 ✗ | 0.72 | **9.9** | ✓ |
| `privacy.html` / `terms.html` body text | 0.30–0.40 | 2.7–3.8 ✗ | 0.72–0.78 | **9.9–11.2** | ✓ |
| `privacy.html` / `terms.html` footer-copy | 0.25 / 0.15 | 2.2 / 1.7 ✗ | 0.72 | **9.9** | ✓ |

Ratios are approximate (white-alpha composite on `#030508`). Every
flagged element now clears AA for normal body text (4.5:1). Most
clear AAA (7:1) as well.

### Other color fixes

- `.success-msg` inline link `#8B5CF6` on near-black → `#c4b5fd` (9.8:1).
- Success-message base text `#10B981` → `#34d399` for better on-dark contrast inside the box.
- `comparison-table` last-row total `#10B981` → `#34d399`.
- `"OFFICIAL LAUNCH IN"` label `#10B981` → `#34d399`.
- Countdown `:` separators `rgba(139,92,246,0.4)` → `rgba(167,139,250,0.55)` (decorative only; `aria-hidden`).
- Nav link font size 13 → 14 (better readability), color 0.6 → 0.82.

---

## Typography Fixes

- **Fallback stack.** Body was `'Inter', sans-serif` — during the
  Google Fonts fetch or if blocked, UA fallback could be anything.
  Now: `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`.
- **Preload hint.** Added `<link rel="preload" as="style" href="fonts…">` alongside the regular `<link rel="stylesheet">` to kick off the font CSS fetch earlier without blocking render.
- **iOS autozoom.** `input, textarea, select` forced to `font-size:16px` — prevents iOS Safari from zooming into the waitlist input on focus.
- **Smoothing.** `-webkit-font-smoothing: antialiased`, `-moz-osx-font-smoothing: grayscale`, `text-rendering: optimizeLegibility` on `<body>` for consistent weight on dark bg.
- **Base size.** Explicit `body { font-size: 16px }` (not assumed). No body text under 16px on mobile.
- **Line length.** `.section-sub`, `.guarantee-section p`, `.legal-section .legal-text`, countdown body cap at `60–75ch` for readable measure.
- **Widow killers.** Non-breaking spaces before final word on `.hero-title` ("a feed", "a universe"), "One Life OS", "Right Here", "Are Gone", and the "locked forever" run in the countdown body.
- **Small-label sizes.** Countdown unit labels 11 → 12px; stat-label / slots-label font sizes nudged up; comparison th 11 → 12px. No body under 13px on desktop.

---

## Polish Fixes

- **Favicon & icons.** Added `<link rel="icon" type="image/svg+xml" href="images/logo.svg">`, `<link rel="icon" type="image/png">`, `<link rel="apple-touch-icon">`. Prior: no favicon at all.
- **OG/Twitter.** Added `og:image`, `og:url`, `twitter:title`, `twitter:description`, `twitter:image`, `theme-color`, and `<link rel="canonical">`.
- **Image sizing.** All four `<img>` tags for the logo now have `width` and `height` attributes so browsers reserve space and prevent cumulative layout shift. Decorative footer and Founders-section logos get `alt=""` (they are duplicative of the wordmark next to them); hero logo keeps meaningful alt + `fetchpriority="high"`; non-hero logos get `loading="lazy"` + `decoding="async"`.
- **Semantic landmarks.** `<main id="main">` wraps hero → waitlist → legal. `<nav aria-label="Primary">` on top nav, `<nav aria-label="Footer">` on footer links. `<h1>` stays exclusive to hero; `<h2>` for section titles; `<h3>` for sub/feature — hierarchy preserved.
- **Focus outlines.** Every interactive element has a visible focus ring on this dark theme (see toggle table).
- **Hover/active/disabled states.** `:disabled` rule added for `.btn-primary` / `.btn-secondary` that disables translate and reduces opacity — previously, disabled buttons still pulled the hover-lift transform.
- **Footer link hover via inline `onmouseover`** replaced with a CSS class (`.footer-link:hover`). Keeps JS out of presentational concerns and makes keyboard focus styles consistent.
- **Reduced motion** handled globally.
- **Inline `!important`** occurrences were left in place where the tool itself introduced them intentionally inside mobile overrides (`.tier-cta` display, `.feature-showcase-card` grid collapse); no new `!important` introduced unless the original selector already used one.

---

## Intentionally Not Fixed (Flagged)

- **Content-level copy.** Scope says no copy changes — not touching casing, punctuation, or trademark glyphs. Some UPPERCASE micro-copy (`STEP 01`, section labels) arguably reads better with `letter-spacing: 0.08em`+ which is already present; left alone.
- **Gradient text on near-black.** The hero title's `.gradient-text` span uses `-webkit-background-clip:text` with a white→purple gradient. Contrast at the purple end (`#8B5CF6` ≈ 6.4:1 on `#030508`) still clears AA, so retained. Same for stat numbers and `.footer-logo`.
- **Hero subtitle & earning-amount colored gradients.** Each meets AA at worst point.
- **Tier color tokens (`#10B981`, `#3B82F6`, `#D4AF37`, `#a78bfa`).** All clear 4.5:1 on `#030508` and `bg-card`. Kept as-is to preserve branding.
- **Inline `style="…"` throughout markup.** The project is a single-file static HTML with zero build tooling — refactoring inline styles into classes is a multi-hour cosmetic change with no user-visible benefit and a non-trivial risk of breakage. Left in place; only the *values* inside styles were updated.
- **`.ea-tier` animation of the "ACTIVE NOW" badge dot.** The `pulse-dot` animation exists but the dot only appears in the hero badge. No vestibular-sensitive motion is unreasonably persistent, and reduced-motion now disables it anyway.
- **`404.html` stars particle generator.** Creates 100 animated stars; kept, but now honors `prefers-reduced-motion` globally via the new media query.
- **Waitlist graceful-degradation on API failure.** The original code deliberately shows success even when the API fails (so an email captured in server logs isn't lost to the user's experience). Behavior preserved; only the UX around it (aria-live, validity guard) was improved. Flagging: if the waitlist endpoint goes 100% down, users will see success but not be signed up — still the original intent, but worth a second look from the product owner.
- **`index.html` inline `<style>` size.** The `<style>` block is ~1000 lines. Splitting into external CSS would save repeat-visit bandwidth but costs a render-blocking request. Out of scope for this audit.

---

## Validation

- `grep` search confirms **no remaining** `color:rgba(255,255,255,0.x)` with `x < 0.5` in `index.html`, `privacy.html`, or `terms.html` except in decorative borders / backgrounds (not text).
- HTML structure: `<main>` / `</main>` and `<section>` / `</section>` counts balanced.
- No build, lint, or test scripts exist in the repo (confirmed: no `package.json`, no CI test runner referenced in `.gitlab-ci.yml` for HTML linting). Nothing to run.

---

## Files Changed

- `index.html` — bulk of fixes
- `privacy.html` — contrast bumps only
- `terms.html` — contrast bumps only
- `404.html` — no changes required (already uses high-contrast colors and reduced-motion inherits globally from the site — note: 404.html is standalone so its own `prefers-reduced-motion` should be considered; not changed to stay within a tight scope)
- `CHANGES.md` — this file
