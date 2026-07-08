---
name: Vibrant Kinetic

colors:
  surface: "#faf9f9"
  surface-dim: "#dadada"
  surface-bright: "#faf9f9"
  surface-container-lowest: "#ffffff"
  surface-container-low: "#f4f3f3"
  surface-container: "#eeeeed"
  surface-container-high: "#e9e8e8"
  surface-container-highest: "#e3e2e2"
  on-surface: "#1a1c1c"
  on-surface-variant: "#3f4a36"
  inverse-surface: "#2f3131"
  inverse-on-surface: "#f1f0f0"
  outline: "#6f7b64"
  outline-variant: "#becbb1"
  surface-tint: "#2b6c00"
  primary: "#2b6c00"
  on-primary: "#ffffff"
  primary-container: "#58cc02"
  on-primary-container: "#1e5000"
  inverse-primary: "#6be026"
  secondary: "#006590"
  on-secondary: "#ffffff"
  secondary-container: "#2fb8ff"
  on-secondary-container: "#004666"
  tertiary: "#8c5000"
  on-tertiary: "#ffffff"
  tertiary-container: "#ff9c27"
  on-tertiary-container: "#683a00"
  error: "#ba1a1a"
  on-error: "#ffffff"
  error-container: "#ffdad6"
  on-error-container: "#93000a"
  primary-fixed: "#87fe45"
  primary-fixed-dim: "#6be026"
  on-primary-fixed: "#082100"
  on-primary-fixed-variant: "#1f5100"
  secondary-fixed: "#c8e6ff"
  secondary-fixed-dim: "#88ceff"
  on-secondary-fixed: "#001e2e"
  on-secondary-fixed-variant: "#004c6e"
  tertiary-fixed: "#ffdcbf"
  tertiary-fixed-dim: "#ffb872"
  on-tertiary-fixed: "#2d1600"
  on-tertiary-fixed-variant: "#6a3b00"
  background: "#faf9f9"
  on-background: "#1a1c1c"
  surface-variant: "#e3e2e2"

typography:
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: "800"
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: "800"
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: "800"
    lineHeight: 28px
  body-lg:
    fontFamily: Be Vietnam Pro
    fontSize: 18px
    fontWeight: "500"
    lineHeight: 26px
  body-md:
    fontFamily: Be Vietnam Pro
    fontSize: 16px
    fontWeight: "500"
    lineHeight: 24px
  label-bold:
    fontFamily: Be Vietnam Pro
    fontSize: 14px
    fontWeight: "700"
    lineHeight: 20px
    letterSpacing: 0.05em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: "800"
    lineHeight: 32px

rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px

spacing:
  unit: 4px
  gutter: 16px
  margin-mobile: 20px
  margin-desktop: 40px
  stack-gap: 12px
  section-gap: 32px
---

## Brand and Style

Vibrant Kinetic is the Finance Quest visual system. It is built around gamification, positive reinforcement, and tactile feedback so personal-finance flows feel energetic, safe, and rewarding instead of heavy or intimidating.

The visual language is tactile-playful and intentionally chunky. UI elements should feel physical and pressable, with bold shapes, thick borders, hard shadows, and confident color blocking. Thin rules, foggy glass effects, and muted luxury styling are out of scope for this system.

The default emotional response should be progress and momentum. Green is the hero color, blue supports guidance and finance-target moments, and orange marks rewards, streaks, and urgency. Every screen should feel like a focused quest board instead of a generic dashboard.

This document is the canonical source of truth. If any prose example conflicts with the YAML tokens above, the token block wins.

## Colors

The palette is bright, high-contrast, and role-driven.

- Primary green uses `primary-container` `#58cc02` for hero fills, progress, and primary CTAs, with `primary` `#2b6c00` and `on-primary-container` `#1e5000` for borders, shadows, and pressed states.
- Action blue uses `secondary-container` `#2fb8ff` for supportive accents, finance targets, information cards, and secondary highlights.
- Warning orange uses `tertiary-container` `#ff9c27` for rewards, coins, urgency, and celebratory callouts.
- Danger states use the error family from the token block and should stay crisp and explicit rather than soft.
- Cream surfaces anchor the system: `background` and `surface` stay at `#faf9f9`, with nested cards stepping through the surface-container scale.
- Structural lines use `outline` `#6f7b64` and `outline-variant` `#becbb1`.

Dark mode can exist as a future extension, but it is not a first-class token set in this document. If a dark presentation is needed, preserve the same vivid accent relationships and tactile depth cues rather than introducing a new aesthetic direction.

## Typography

This system uses a dual-font stack:

- `Plus Jakarta Sans` for headlines and display moments.
- `Be Vietnam Pro` for body text, labels, and dense supporting UI.

Headings are extra bold, compact, and slightly tight-tracked to feel energetic and deliberate. Body copy should stay open and readable, especially in cards and forms. Labels may use uppercase styling with gentle tracking when they need to read as UI metadata rather than content.

Use the mobile headline token for narrow layouts instead of scaling desktop headings mechanically. The goal is compact confidence, not oversized type.

## Layout and Spacing

The layout is mobile-first and centered.

- Mobile screens use a single-column board with `20px` side margins.
- Desktop screens should sit inside a centered container with a practical max width around `1024px`.
- Related items stack on a `12px` rhythm.
- Major sections separate on a `32px` rhythm.
- `16px` gutters are the standard gap for side-by-side cards and grid items.

The system should feel dense but never cramped. Cards fill available width on mobile, then expand into restrained multi-column layouts on tablet and desktop without losing the narrow mission-board feel.

## Elevation and Depth

Depth is created with hard physical offsets, not blur-heavy shadows.

- Interactive elements should use a visible border, usually `2px`, in a darker structural color.
- Buttons and cards should cast a solid bottom shadow or offset lip, typically `4px` to `6px`, using a darker version of the base fill.
- Pressed states should move down `2px` to `4px` while reducing the bottom shadow, creating a clear tactile press.

This should feel like layered stickers or toy blocks. Avoid soft ambient elevation that makes the interface feel airy or premium-minimal.

## Shapes

The shape language is soft, oversized, and friendly.

- Cards and major containers should generally land in rounded `2xl` to `3xl` territory.
- Buttons should stay consistently rounded and squishy-looking.
- Progress bars should be fully pill-shaped.
- Circular indicators should feel bold and badge-like rather than subtle or outline-only.

Sharp corners and delicate micro-radius choices are out of character for this system.

## Components

### Buttons

Primary buttons use the green quest palette with a `2px` border, bold centered text, and a `6px` bottom shadow. On active press, the button drops by `4px` and the bottom shadow shrinks to roughly `2px`.

Secondary and accent buttons follow the same construction rules with blue or orange fills when appropriate. Button behavior should stay visually consistent across routes.

### Progress Bars

Progress bars are chunky and tactile, usually `16px` to `20px` tall with fully rounded ends. The fill should include a subtle top highlight to suggest a cylindrical surface.

### Streaks and Indicators

Daily-goal markers, quest chips, and achievement indicators should use circular or capsule containers. Blue is preferred for finance-target indicators, while orange is preferred for rewards and streak energy. Icons may slightly overlap the container boundary for a badge-like feel.

### Cards

Cards use light surfaces with a visible border and a signature hard bottom offset. Standard cards should feel lifted from the page without using soft blur. Featured cards can color-block with green, blue, or orange fills while keeping the same tactile construction.

### Input Fields

Inputs inherit the same structural logic as cards and buttons: strong border, rounded corners, and visible focus treatment. Focus should lean on the blue accent family and slightly increase the perceived depth so the active field stands out immediately.
