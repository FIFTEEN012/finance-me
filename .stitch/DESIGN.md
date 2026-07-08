---
name: Vibrant Kinetic
source_of_truth: "../DESIGN.md"

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

## Design System Summary

Vibrant Kinetic is the active Finance Quest design language. It emphasizes tactile-playful UI, compact mission-board layouts, bold green-led color blocking, and hard-shadow depth cues that make finance flows feel rewarding and approachable.

This file mirrors the canonical spec in `../DESIGN.md`. If this file and the root document ever drift, the token block and prose in `../DESIGN.md` are the source of truth.

## Stitch Guidance

- Use a mobile-first centered board with compact vertical rhythm.
- Favor cream surfaces, thick borders, and hard bottom shadows over glassmorphism.
- Use `Plus Jakarta Sans` for headings and `Be Vietnam Pro` for all supporting text.
- Primary actions should lean on `primary-container` `#58cc02` with darker green borders and pressed states.
- Finance guidance accents should use `secondary-container` `#2fb8ff`.
- Reward, streak, and urgency accents should use `tertiary-container` `#ff9c27`.

## Layout Pattern

- Mobile: single-column board with `20px` side margins.
- Desktop: centered board with a practical max width around `1024px`.
- Use `12px` stack spacing for related items and `32px` section spacing between major blocks.
- Cards and controls should stay rounded, oversized, and tactile.

## Component Notes

### Buttons

Use a `2px` border, bold centered text, and a `4px` to `6px` hard bottom shadow. Pressed states move down `2px` to `4px` and reduce shadow height.

### Cards

Use bright or cream surfaces with a visible structural border and a hard bottom offset. Featured cards may use green, blue, or orange fills, but should keep the same chunky construction.

### Inputs

Inputs should match the same tactile system with clear borders, rounded corners, and a blue-accent focus state that increases the sense of depth.

### Progress and Indicators

Progress bars should be pill-shaped and chunky, with a subtle top highlight. Circular indicators and reward chips should feel badge-like and celebratory.

## Metadata Status

No Finance Quest Stitch project metadata is locked in this file yet. Do not reintroduce stale project IDs, asset IDs, or screen references from older themes.
