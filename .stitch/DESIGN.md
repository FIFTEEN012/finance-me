---
name: FinanceMe — Violet Pro
stitch_project_id: "8990545969730647483"
design_system_asset: "assets/1842134989474943158"

colors:
  primary: "#7c3aed"
  primary-dark: "#a78bfa"
  background: "#08051a"
  card-surface: "rgba(255,255,255,0.04)"
  card-border: "rgba(255,255,255,0.08)"
  card-hover: "rgba(255,255,255,0.07)"
  sidebar-glass: "rgba(8,5,18,0.88)"
  topbar-glass: "rgba(8,5,18,0.70)"
  success: "#10b981"
  danger: "#ef4444"
  warning: "#f59e0b"
  muted-text: "rgba(255,255,255,0.45)"

typography:
  font: Geist Sans
  numeric: "tabular-nums, letter-spacing: -0.01em"

rounded:
  buttons: "12px"
  cards: "22px"
  badges: "9999px"

screens:
  - id: "0c1686e5128040bab4bde76f65761722"
    title: "Dashboard"
    file: "designs/dashboard.html"
    screenshot: "designs/dashboard.png"
  - id: "eb28fc6e5c9040f1919cc9297f7e1f31"
    title: "Transactions"
    file: "designs/transactions.html"
    screenshot: "designs/transactions.png"
  - id: "fcab94b779a14614808625ac2f6a1b87"
    title: "Bill Split"
    file: "designs/bill-split.html"
    screenshot: "designs/bill-split.png"
---

## Project

**Stitch project**: `FinanceMe Violet Pro` (ID: `8990545969730647483`)
**Design system**: `FinanceMe — Violet Pro` (asset: `assets/1842134989474943158`)

Open the project in Stitch: https://stitch.withgoogle.com/

## Design System Summary

Electric-minimalist personal finance dashboard. Deep blue-violet near-black canvas (`#08051a`). Single violet accent (`#7c3aed` / `#a78bfa` dark) threads through all interactive elements. Glassmorphism card surfaces: `rgba(255,255,255,0.04)` with 24px backdrop-blur and 1px `rgba(255,255,255,0.08)` border. All currency values use tabular-nums with `-0.01em` letter-spacing. Font: **Geist Sans** throughout.

### Layout Shell (shared by all pages)
- **Sidebar** 224px — `rgba(8,5,18,0.88)` + `blur(32px)`, right border `rgba(255,255,255,0.05)`. Brand mark (violet rounded-lg icon), nav items with icon+label, active state = violet gradient wash + 2px left accent bar. Footer: Export/Import icon buttons + theme toggle + "v2.0 Violet Pro".
- **Topbar** 52px — `rgba(8,5,18,0.70)` + `blur(32px)`, bottom border `rgba(255,255,255,0.05)`. Page title + right-side action icons.

### Atmosphere
- Two 700px blurred violet radial-gradient orbs drift through top-left and bottom-right corners (22s and 28s animations).
- 48px CSS grid overlay at `rgba(255,255,255,0.012)`.
- Live pulse dot: 2.4s `ease-in-out`, scales to 75% opacity 40%.

## Screens

### Dashboard (`designs/dashboard.html`)
3-column hero stat cards with 2px gradient top accent bars (violet/green/red) → Secondary 4-card row → 2-column main grid (Recent Transactions + Budget Progress bars) → Bottom 2-column (Spending donut chart + Net Worth sparkline).

### Transactions (`designs/transactions.html`)
Summary stat pills (Income/Expense/Net) → Filter row (search + month picker + type pills + Add button) → Grouped transaction list (date headers, colored category icon circles, tabular-nums amounts red/green).

### Bill Split (`designs/bill-split.html`)
3 semantic stat cards (green: owed-to-me, red: I-owe, amber: pending count) → Filter tabs + primary button → Stacked bill cards (participants with avatar initials, share amounts, paid/unpaid toggle circles) → Settled bills with green tint.

## Prompting Tips for New Screens

When generating additional pages, start with:

> "FinanceMe [PAGE NAME] page. Dark Violet Pro design: background #08051a, glassmorphism cards rgba(255,255,255,0.04) backdrop-blur-24px 1px-border rgba(255,255,255,0.08), Geist Sans, tabular-nums for amounts. Violet atmospheric orbs. Same sidebar (224px, [PAGE] nav item active) and topbar ([PAGE TITLE] title)."

Then describe the page-specific content structure.
