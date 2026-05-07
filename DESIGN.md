---
name: FinanceMe — Violet Pro

colors:
  # ── Brand palette ──────────────────────────────────────────────
  primary:           "oklch(0.50 0.24 270)"   # #7c3aed  deep violet
  primary-dark:      "oklch(0.70 0.22 270)"   # #a78bfa  lighter violet (dark mode)
  primary-hex:       "#7c3aed"                # canonical brand hex

  # Accent variants (user-selectable; replaces primary throughout)
  accent-rose:       "oklch(0.55 0.24 12)"    # #f43f5e
  accent-rose-dark:  "oklch(0.72 0.21 12)"
  accent-blue:       "oklch(0.52 0.22 232)"   # #3b82f6
  accent-blue-dark:  "oklch(0.70 0.20 232)"
  accent-emerald:    "oklch(0.55 0.20 152)"   # #10b981
  accent-emerald-dark: "oklch(0.73 0.18 152)"
  accent-amber:      "oklch(0.60 0.18 50)"    # #f59e0b
  accent-amber-dark: "oklch(0.76 0.16 50)"
  accent-indigo:     "oklch(0.50 0.24 245)"   # #4f46e5
  accent-indigo-dark: "oklch(0.70 0.22 245)"

  # ── Light mode surfaces ─────────────────────────────────────────
  background:        "oklch(0.972 0.007 275)"  # #f5f3ff  lavender-tinted off-white
  foreground:        "oklch(0.12 0.028 265)"   # #1a1533  near-black with violet cast
  card:              "oklch(1 0 0)"            # #ffffff  pure white
  card-foreground:   "oklch(0.12 0.015 265)"
  popover:           "oklch(1 0 0)"
  popover-foreground: "oklch(0.12 0.015 265)"
  primary-foreground: "oklch(0.99 0 0)"       # #fcfcfc  off-white on primary
  secondary:         "oklch(0.965 0.008 270)"  # #f3f0fd
  secondary-foreground: "oklch(0.22 0.015 270)"
  muted:             "oklch(0.96 0.006 270)"   # #f4f2fc
  muted-foreground:  "oklch(0.50 0.012 270)"   # #706e82
  accent:            "oklch(0.96 0.009 270)"   # #f3f0fd
  accent-foreground: "oklch(0.22 0.015 270)"
  destructive:       "oklch(0.577 0.245 27.325)" # #ef4444
  border:            "oklch(0.905 0.010 270)"  # #e3e0f5
  input:             "oklch(0.905 0.010 270)"
  ring:              "oklch(0.50 0.24 270)"    # matches primary
  sidebar:           "oklch(0.99 0.003 270)"   # #fdfcff  faintly tinted white

  # ── Dark mode surfaces ─────────────────────────────────────────
  dark-background:   "oklch(0.065 0.028 272)"  # #08051a  near-black, blue-violet base
  dark-foreground:   "oklch(0.94 0.008 270)"   # #f0eeff  soft lavender white
  dark-card:         "oklch(0.105 0.024 270)"  # #131027  dark card with violet cast
  dark-popover:      "oklch(0.105 0.026 270)"
  dark-secondary:    "oklch(0.145 0.024 270)"  # #1d1a30
  dark-muted:        "oklch(0.135 0.020 270)"  # #191628
  dark-muted-foreground: "oklch(0.56 0.016 270)" # #8b88a0
  dark-destructive:  "oklch(0.65 0.22 22)"     # #f87171
  dark-border:       "oklch(1 0 0 / 7%)"       # rgba(255,255,255,0.07)
  dark-input:        "oklch(1 0 0 / 9%)"       # rgba(255,255,255,0.09)
  dark-sidebar:      "oklch(0.085 0.026 272)"  # #0c0920  slightly darker than bg
  dark-sidebar-glass: "rgba(8, 5, 18, 0.88)"  # glass sidebar backdrop color

  # ── Chart / data visualisation ─────────────────────────────────
  chart-1: "oklch(0.50 0.24 270)"   # violet
  chart-2: "oklch(0.56 0.20 230)"   # blue
  chart-3: "oklch(0.63 0.18 310)"   # purple
  chart-4: "oklch(0.70 0.18 50)"    # amber
  chart-5: "oklch(0.60 0.22 20)"    # red-orange

  # ── Semantic / accent colours used in components ───────────────
  green-accent:   "#059669"
  green-mid:      "#10b981"
  green-light:    "#34d399"
  red-accent:     "#dc2626"
  red-mid:        "#ef4444"
  red-light:      "#f87171"
  blue-accent:    "#2563eb"
  blue-mid:       "#3b82f6"
  blue-light:     "#60a5fa"
  violet-glow:    "rgba(139, 92, 246, 0.25)"
  indigo-glow:    "rgba(99, 102, 241, 0.20)"

typography:
  display:
    fontFamily: Geist Sans
    fontSize: 36px
    fontWeight: "700"
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Geist Sans
    fontSize: 24px
    fontWeight: "600"
    lineHeight: 32px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Geist Sans
    fontSize: 20px
    fontWeight: "600"
    lineHeight: 28px
    letterSpacing: -0.01em
  title-lg:
    fontFamily: Geist Sans
    fontSize: 18px
    fontWeight: "600"
    lineHeight: 28px
  title-md:
    fontFamily: Geist Sans
    fontSize: 15px
    fontWeight: "600"
    lineHeight: 24px
  body-lg:
    fontFamily: Geist Sans
    fontSize: 16px
    fontWeight: "400"
    lineHeight: 24px
  body-md:
    fontFamily: Geist Sans
    fontSize: 14px
    fontWeight: "400"
    lineHeight: 20px
  label-md:
    fontFamily: Geist Sans
    fontSize: 13px
    fontWeight: "500"
    lineHeight: 20px
  label-sm:
    fontFamily: Geist Sans
    fontSize: 12px
    fontWeight: "500"
    lineHeight: 16px
  label-xs:
    fontFamily: Geist Sans
    fontSize: 11px
    fontWeight: "500"
    lineHeight: 14px
    letterSpacing: 0.01em
  numeric:
    fontFamily: Geist Sans
    fontSize: 14px
    fontWeight: "600"
    lineHeight: 20px
    fontVariantNumeric: tabular-nums
    fontFeatureSettings: "'tnum'"
    letterSpacing: -0.01em
  mono:
    fontFamily: Geist Mono
    fontSize: 12px
    fontWeight: "400"
    lineHeight: 16px

rounded:
  sm:      "0.45rem"    # calc(0.75rem * 0.6) = 7.2px  — tight pill badges
  md:      "0.60rem"    # calc(0.75rem * 0.8) = 9.6px  — inputs, small buttons
  DEFAULT: "0.75rem"    # 12px base — standard buttons
  lg:      "0.75rem"    # alias for base — nav items, tooltips
  xl:      "1.05rem"    # calc(0.75rem * 1.4) = 16.8px — cards, sheets
  2xl:     "1.35rem"    # calc(0.75rem * 1.8) = 21.6px — large cards, modals
  3xl:     "1.65rem"    # calc(0.75rem * 2.2) = 26.4px — hero sections
  4xl:     "1.95rem"    # calc(0.75rem * 2.6) = 31.2px — badge caps (rounded-4xl)
  full:    "9999px"     # circles, live dots

spacing:
  base:       "8px"
  xs:         "4px"    # 0.5 unit — tight icon gaps
  sm:         "6px"    # 0.75 unit — compact padding
  md:         "12px"   # 1.5 units — card inner padding rows
  lg:         "16px"   # 2 units — card padding (p-4)
  xl:         "20px"   # 2.5 units
  2xl:        "24px"   # 3 units — section padding (p-6)
  3xl:        "32px"   # 4 units
  gutter:     "16px"   # column gap in grids
  sidebar-w:  "224px"  # w-56 — desktop sidebar width
  topbar-h:   "52px"   # h-13
  bottomnav-h: "64px"  # h-16 — mobile only

elevation:
  # Glassmorphism — dark mode only
  glass:
    background:      "rgba(255, 255, 255, 0.04)"
    backdropFilter:  "blur(24px) saturate(160%)"
    border:          "1px solid rgba(255, 255, 255, 0.08)"
  glass-hover:
    background:      "rgba(255, 255, 255, 0.07)"
    borderColor:     "rgba(255, 255, 255, 0.12)"
  glass-strong:
    background:      "rgba(255, 255, 255, 0.07)"
    backdropFilter:  "blur(32px) saturate(180%)"
    border:          "1px solid rgba(255, 255, 255, 0.10)"
  # Sidebar / topbar chrome
  sidebar-glass:
    background:      "rgba(8, 5, 18, 0.88)"
    backdropFilter:  "blur(32px)"
    border:          "1px solid rgba(255,255,255,0.05)"
  topbar-glass:
    background:      "rgba(8, 5, 18, 0.70)"
    backdropFilter:  "blur(32px)"
    border:          "1px solid rgba(255,255,255,0.05)"
  sheet-glass:
    background:      "rgba(8, 5, 18, 0.96)"
    backdropFilter:  "blur(32px)"
  # Glow / ambient
  glow-violet:
    boxShadow:       "0 0 20px rgba(139,92,246,0.25), 0 0 48px rgba(139,92,246,0.10)"
  glow-blue:
    boxShadow:       "0 0 20px rgba(99,102,241,0.20), 0 0 48px rgba(99,102,241,0.08)"
  # Card shadows
  card-light:
    boxShadow:       "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(124,58,237,0.06)"
  card-light-hover:
    boxShadow:       "0 4px 24px rgba(124,58,237,0.12)"
  card-dark:
    boxShadow:       "0 1px 0 rgba(255,255,255,0.03) inset, 0 4px 20px rgba(0,0,0,0.30)"
  card-dark-hover:
    boxShadow:       "0 4px 24px rgba(0,0,0,0.40)"

motion:
  duration-fast:     "100ms"
  duration-base:     "150ms"
  duration-slow:     "200ms"
  easing-default:    "ease-out"
  easing-smooth:     "ease-in-out"
  # Live indicator pulse
  live-pulse-duration: "2.4s"
  live-pulse-scale-min: "0.75"
  live-pulse-opacity-min: "0.4"
  # Animated background orbs
  orb1-duration:     "22s"
  orb1-translate-mid: "translate(90px, 70px) scale(1.12)"
  orb1-translate-end: "translate(-50px, 130px) scale(0.94)"
  orb2-duration:     "28s"
  orb2-translate-mid: "translate(-70px, -90px) scale(1.18)"
  orb2-translate-end: "translate(50px, -35px) scale(0.88)"
  # Gradient button lift
  btn-hover-translateY: "-1px"
  btn-hover-shadow:    "0 4px 20px rgba(124,58,237,0.35)"

components:
  # ── Buttons ──────────────────────────────────────────────────
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor:       "{colors.primary-foreground}"
    typography:      "{typography.label-md}"
    rounded:         "{rounded.DEFAULT}"
    height:          "32px"
    padding:         "0 10px"
  button-primary-dark:
    backgroundColor: "{colors.primary-dark}"
    textColor:       "{colors.dark-background}"
  button-primary-hover:
    opacity:         "0.90"
    transform:       "translateY(-1px)"
    boxShadow:       "{elevation.btn-hover-shadow}"
  button-outline:
    backgroundColor: "transparent"
    textColor:       "{colors.foreground}"
    border:          "1px solid {colors.border}"
    rounded:         "{rounded.DEFAULT}"
    height:          "32px"
  button-outline-dark:
    border:          "1px solid {colors.dark-input}"
    backgroundColor: "{colors.dark-input}"
    textColor:       "{colors.dark-foreground}"
  button-ghost:
    backgroundColor: "transparent"
    textColor:       "{colors.muted-foreground}"
    rounded:         "{rounded.DEFAULT}"
  button-destructive:
    backgroundColor: "oklch(0.577 0.245 27.325 / 10%)"
    textColor:       "{colors.destructive}"
    rounded:         "{rounded.DEFAULT}"
  button-gradient:
    background:      "linear-gradient(135deg, #7c3aed, #6366f1)"
    textColor:       "#ffffff"
    rounded:         "{rounded.DEFAULT}"
  button-sizes:
    xs:   "height: 24px; padding: 0 8px; font-size: 12px"
    sm:   "height: 28px; padding: 0 10px; font-size: 12.8px"
    default: "height: 32px; padding: 0 10px"
    lg:   "height: 36px; padding: 0 10px"

  # ── Input ─────────────────────────────────────────────────────
  input:
    backgroundColor: "transparent"
    textColor:       "{colors.foreground}"
    border:          "1px solid {colors.input}"
    rounded:         "{rounded.md}"
    height:          "32px"
    padding:         "4px 10px"
    typography:      "{typography.body-md}"
    placeholderColor: "{colors.muted-foreground}"
  input-dark:
    backgroundColor: "oklch(1 0 0 / 9%)"
    border:          "1px solid oklch(1 0 0 / 9%)"
  input-focus:
    border:          "1px solid {colors.ring}"
    boxShadow:       "0 0 0 3px oklch(0.50 0.24 270 / 50%)"

  # ── Card ──────────────────────────────────────────────────────
  card:
    backgroundColor: "{colors.card}"
    border:          "1px solid {colors.border}"
    rounded:         "{rounded.2xl}"
    padding:         "16px"
    gap:             "16px"
    boxShadow:       "{elevation.card-light}"
  card-dark:
    backgroundColor: "rgba(255,255,255,0.04)"
    backdropFilter:  "blur(32px)"
    border:          "1px solid rgba(255,255,255,0.08)"
    boxShadow:       "{elevation.card-dark}"
  card-hover-dark:
    backgroundColor: "rgba(255,255,255,0.06)"
    border:          "1px solid rgba(255,255,255,0.12)"

  # ── Badge / chip ───────────────────────────────────────────────
  badge:
    height:          "20px"
    padding:         "2px 8px"
    rounded:         "{rounded.4xl}"
    typography:      "{typography.label-xs}"
  badge-default:
    backgroundColor: "{colors.primary}"
    textColor:       "{colors.primary-foreground}"
  badge-secondary:
    backgroundColor: "{colors.secondary}"
    textColor:       "{colors.secondary-foreground}"
  badge-outline:
    backgroundColor: "transparent"
    border:          "1px solid {colors.border}"

  # ── Stat card (dashboard hero metrics) ────────────────────────
  stat-card:
    rounded:         "{rounded.2xl}"
    padding:         "16px"
    border:          "1px solid {colors.border}"
    valueTypography: "{typography.headline-lg}"
    labelTypography: "{typography.label-xs}"
    accentBarHeight: "2px"
  stat-card-dark:
    backgroundColor: "rgba(255,255,255,0.04)"
    backdropFilter:  "blur(24px)"
    border:          "1px solid rgba(255,255,255,0.08)"

  # ── Nav item (sidebar) ────────────────────────────────────────
  nav-item:
    rounded:         "{rounded.lg}"
    padding:         "8px 12px"
    gap:             "10px"
    typography:      "{typography.label-md}"
    iconSize:        "15px"
  nav-item-active-light:
    backgroundColor: "oklch(0.50 0.24 270 / 10%)"
    textColor:       "{colors.primary}"
    accentBar:       "2px wide, 16px tall, rounded-r, left edge, {colors.primary}"
  nav-item-active-dark:
    background:      "linear-gradient(90deg, oklch(0.70 0.22 270 / 18%), oklch(0.70 0.22 270 / 10%))"
    boxShadow:       "inset 0 0 0 1px oklch(0.70 0.22 270 / 22%)"
    textColor:       "{colors.primary-dark}"
  nav-item-inactive:
    textColor:       "{colors.muted-foreground}"
  nav-item-inactive-dark:
    textColor:       "rgba(255,255,255,0.45)"

  # ── Bottom nav (mobile) ───────────────────────────────────────
  bottom-nav:
    height:          "64px"
    backdropBlur:    "32px"
    borderTop:       "1px solid {colors.border}"
    itemPadding:     "6px 12px"
    iconSize:        "20px"
    labelTypography: "{typography.label-xs}"
    fabSize:         "56px"
    fabOffset:       "-16px (relative, floats above bar)"
  fab-primary:
    backgroundColor: "{colors.primary}"
    rounded:         "{rounded.full}"
    size:            "56px"
    iconColor:       "#ffffff"
    iconSize:        "24px"

  # ── Topbar ────────────────────────────────────────────────────
  topbar:
    height:          "52px"
    padding:         "0 16px"
    backdropBlur:    "32px"
    titleTypography: "{typography.title-md}"
---

## Brand & Style

FinanceMe "Violet Pro" is a personal-finance dashboard built on a single overriding emotion: **calm authority**. Every visual decision—the deep near-black canvas, the restrained violet accent, the barely-there glassmorphism—signals that this is a serious tool, not a toy. Numbers are the hero; decoration exists only where it earns its space.

The default experience is **dark-first**. The off-black background (`oklch(0.065 0.028 272)`) sits firmly in blue-violet territory rather than neutral grey, giving the whole UI a cool, nocturnal character. Against this, a single accent hue—**Violet Pro** (`#7c3aed` in light, `#a78bfa` in dark)—runs as a consistent thread through brand mark, active navigation, primary buttons, and focus rings. The accent is swappable (rose, blue, emerald, amber, or indigo) via a `data-accent` attribute, so the entire colour personality shifts without touching any component code.

The **"v2.0 Violet Pro"** tagline in the sidebar footer sums up the design intent: this is an opinionated, premium-tier skin, not a neutral base.

## Colors

The palette is built entirely in **oklch**—a perceptually uniform colour space that ensures equal apparent luminance across hues and makes the dark/light mode shift a predictable mathematical operation rather than a manual hand-off.

**Light mode** uses a lavender-tinted off-white background (`oklch(0.972 0.007 275)`)—too subtle for most users to consciously notice, but enough to prevent the harshness of pure white. Borders are similarly tinted (`oklch(0.905 0.010 270)`). The effect is that every surface feels cut from the same cloth.

**Dark mode** inverts the strategy: the background is `oklch(0.065 0.028 272)`, essentially the darkest possible violet-cast tone before it becomes indistinguishable from black. Cards sit one step up at `oklch(0.105 0.024 270)`. Borders switch to white-with-opacity (`7%` for standard borders, `5%` for the sidebar) rather than a fixed dark hue—this keeps them looking correct regardless of which background they sit on.

**Semantic colors** for income/expense (green/red) and warnings (amber) are applied directly in Tailwind utility classes rather than going through CSS custom properties. They use the standard Tailwind emerald, red, and amber palettes at specific stops (500/600 for text, 50/5% for backgrounds in light/dark respectively).

**Chart colors** follow the oklch arc from violet (chart-1) through blue, purple, amber, to red-orange (chart-5)—a deliberate analogous-plus-complement sequence that stays readable on both dark and light backgrounds.

## Typography

The sole typeface is **Geist Sans** (loaded via `next/font/google`). Geist's geometric-grotesque construction gives financial figures a machine-legible crispness while remaining approachable in body copy.

Two typographic conventions are central to the product's identity:

**Font feature settings.** The global `body` sets `font-feature-settings: 'cv11', 'ss01'`—stylistic alternates that give Geist a slightly more distinct single-storey `a` and cleaner punctuation. This is invisible to most users but sharpens the overall texture.

**Tabular numerics.** Every currency amount and percentage renders with `font-variant-numeric: tabular-nums` and `letter-spacing: -0.01em` (via the `.num` utility class). Columns of numbers align perfectly without manual spacing, and the slight negative tracking compensates for the extra glyph width that tabular figures add.

The type scale uses `text-[Npx]` one-offs rather than a rigid semantic scale—sizes like `text-[15px]`, `text-[13px]`, `text-[10px]` appear throughout. This fine-grained control keeps the dense sidebar and compact dashboard cards readable without needing to relax the overall type scale.

## Layout & Spacing

The layout follows an **8 px base grid**. Almost all spacing values are multiples: `gap-1` (4 px), `gap-2` (8 px), `gap-3` (12 px), `gap-4` (16 px), `gap-6` (24 px).

**Desktop** uses a persistent left sidebar (224 px wide) plus a scrollable main area. The sidebar is fixed-height, using flexbox with `flex-1` for the nav and a sticky footer. The main content area applies `p-4 md:p-6` and constrains card grids to 1–3 columns via `sm:grid-cols-3`.

**Mobile** hides the sidebar entirely and replaces it with a bottom navigation bar (64 px, `fixed bottom-0`). A floating action button rises 16 px above the bar's top edge as the primary creation entry point. Pages add `pb-24` to avoid content hiding behind the bar.

**Content max-width** is unset globally; individual page containers set `max-w-2xl` or similar. The philosophy is "fill the space at small sizes, constrain at large sizes."

## Elevation & Depth

Depth comes entirely from **glass layers** in dark mode and **subtle tinted shadows** in light mode.

**Dark mode glass stack:**

| Layer | Effect |
|---|---|
| Page background | `rgba(8,5,18,0.88)` + `blur(32px)` for sidebar/topbar chrome |
| Card surface | `rgba(255,255,255,0.04)` + `blur(24–32px) saturate(160–180%)` |
| Elevated card | `rgba(255,255,255,0.07)` + `blur(32px)` |
| Modal / sheet | `rgba(8,5,18,0.96)` + `blur(32px)` |

Every glass surface pairs with a `1px solid rgba(255,255,255,N%)` border that simulates light hitting the edge of a frosted pane. The values range from `0.05` (sidebar border) to `0.12` (hovered cards).

**Glow accents** (`glow-violet`, `glow-blue`) cast a 20–48 px ambient halo around featured elements—used on brand marks and key action areas, never on body content.

**Light mode** uses a violet-tinted box shadow at low opacity (`rgba(124,58,237,0.06)`) rather than grey shadows. This keeps the shadow palette harmonious with the violet accent rather than creating a grey/beige undertone.

**Animated background orbs** complete the atmospheric feel: two `700×700 px` and `600×600 px` radial-gradient circles, blurred to 90 px, drift through the upper-left and lower-right corners on 22 s and 28 s cycles. Their colour is a 8–9% tint of the primary (computed with `color-mix(in oklch, var(--primary) 9%, transparent)`)—present on close inspection, invisible at a glance.

A **CSS grid overlay** (1 px lines at 48 px pitch, `rgba(255,255,255,0.012)`) runs across the entire dark viewport, adding micro-texture without contributing visual weight.

## Shapes

The shape language uses **rounded** (not squared, not pill-heavy). The base radius is `0.75 rem` (12 px), derived at compile time:

- Very small elements (badge caps): `rounded-4xl` = 31 px — visually pill-like
- Inputs, small buttons: `rounded-md` ≈ 10 px
- Standard buttons, tooltips: `rounded-lg` = 12 px
- Cards, major containers: `rounded-2xl` = 22 px
- Large modals: `rounded-2xl` (base) to `rounded-3xl` (sheet top corners)
- Circular elements (FAB, live dot, avatar): `rounded-full`

The net result is a hierarchy of softness: data-dense elements (inputs, table rows) have tighter corners while structural containers (cards, sheets) have generous rounding that signals "this is a zone."

**Card accent bars** are a recurring motif: a 2 px gradient stripe at the top edge of selected cards, using `::before` pseudo-elements. Four palette variants exist—violet, green, red, blue—mapping to the primary financial semantic colours (brand, income, expense, informational).

**Gradient borders** (`.gradient-border`) use a `padding: 1px` mask technique to create a 1 px gradient outline (violet→indigo→blue at decreasing opacity) without affecting layout.

## Motion

Motion serves two roles: **status signalling** and **ambient atmosphere**.

**Live dot pulse** (`.live-dot`): a 2.4 s `ease-in-out` loop that scales from 100 % → 75 % and fades from full opacity → 40 %. It appears on the sidebar brand, the dashboard "Live" badge, and anywhere a real-time data feed is active. The pace is slow enough to be calm, fast enough to read as "active."

**Background orbs**: two `infinite alternate` animations (`orb1` at 22 s, `orb2` at 28 s) drift the ambient colour blobs through the viewport. The `alternate` direction means they never snap-jump back to origin. The different durations create an aperiodic combined motion that never feels looping.

**UI transitions** use a two-speed system:
- **Fast (100–150 ms)**: colour/background changes on hover—nav items, buttons, card borders.
- **Slow (200 ms)**: structural changes—card hover lift, dialog entry, sheet slide-up.

**Button gradient hover** lifts with `translateY(-1px)` and drops a 20 px violet shadow—a microinteraction that confirms the click target without excessive movement.

**Scale interactions**: the FAB uses `active:scale-95` on press for a tactile depression effect.

## Components

### Navigation

**Sidebar** (desktop) uses two states: *inactive* — muted text at 45 % opacity on dark, `text-gray-500` on light — and *active* — a gradient wash derived from the primary colour using `color-mix(in oklch, …)`, plus a 2 px × 16 px pill accent bar flush to the left edge. Icon and label both adopt the primary colour. The active state in dark mode avoids `bg-primary/10` (which can look muddy) in favour of the CSS gradient computed directly from the current `--primary` variable, so the effect automatically follows accent colour changes.

**Bottom navigation** (mobile) mirrors the sidebar semantics using an active indicator dot above the icon (a 4 px × 4 px rounded cap at `top: 0`). The floating FAB is a `56 px` circle raised 16 px above the bar, casting a `shadow-lg` to visually anchor it above the navigation layer.

### Cards & Stat Cards

Cards are the primary data container. In dark mode, each card is a glass pane (`rgba(255,255,255,0.04)` + blur) with a white 8 %-opacity border. Hover increases both values. The pattern creates the impression of infinite nested depth while keeping the page flat.

**Stat cards** on the dashboard add a 2 px gradient accent bar at top. The value uses `text-2xl font-bold .num` (tabular numerals, tight tracking) while the label uses `text-[10px] text-muted-foreground uppercase tracking-wide`. This two-tier hierarchy makes scanning a dashboard row an instant pattern recognition task.

### Forms & Inputs

Inputs are deliberately understated: no fill, 1 px border, `h-8`. On focus, a 3 px ring at 50 % primary opacity expands outward—visible but not alarming. Placeholder text uses `muted-foreground`. Error state switches the border and ring to `destructive`.

Form layouts use `space-y-4` between groups and `Label` elements at `text-xs text-gray-500 dark:text-white/40`—deliberately light, since the input itself is the focal point.

### Toasts & Feedback

Sonner toasts appear `top-right` with `richColors`—meaning success is green, error is red, inheriting the semantic colour palette. Duration defaults keep success toasts brief (3 s) while error toasts linger (5 s).

### Scrollbars

Dark mode applies a custom 4 px scrollbar: transparent track, `rgba(255,255,255,0.10)` thumb, `rgba(255,255,255,0.18)` on hover. This keeps scrollbars invisible in resting state while remaining findable. Light mode uses the OS default.
