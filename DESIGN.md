---
# Sources (every value below traces to one of these):
#   apps/web/src/index.css (all color hex, --radius, fonts, coarse-pointer 44px, page-in motion, reduced-motion)
#   apps/web/node_modules/tailwindcss/theme.css (Tailwind v4 defaults: --spacing 0.25rem, --text-*, --leading-*,
#     --tracking-*, --shadow-*, --breakpoint-*, --container-sm 24rem, --blur-xs 4px)
#   apps/web/src/components/ui/{button,card,input,badge,dialog,tabs,sheet,select,status,list-row,metric-cell,page-header,empty-state}.tsx
#   apps/web/src/components/layout/{app-layout,sidebar,topbar}.tsx, apps/web/src/components/theme-{provider,selector}.tsx
#   apps/web/src/routes/_auth/login.tsx, apps/web/src/routes/_app/service/index.tsx, apps/web/src/routes/_app/floor/-floor-map.tsx
#   apps/web/package.json (@fontsource-variable/inter, @fontsource-variable/fraunces, lucide-react, react ^19)
#   apps/web/index.html, apps/web/components.json
#   CLAUDE.md, docs/archive/PRODUCT-design-system-2026.md, docs/design-revamp/direction.md, docs/design-revamp/plans/01-design-system.md
#   docs/design-revamp/review-2026-07-10/PRODUCT-REVIEW*.md, docs/screens/*.md (stale; see Known inconsistencies)
name: RestoManager
description: Your restaurant, running like clockwork. A tablet-first restaurant operations app on a warm paper canvas.
colors:
  background: "#f3ece1"
  foreground: "#2a2521"
  card: "#fbf7f0"
  popover: "#fbf7f0"
  primary: "#c2562f"
  primary-foreground: "#fbf7f0"
  secondary: "#ece2d4"
  muted: "#ece2d4"
  muted-foreground: "#897c6b"
  accent: "#c2562f"
  accent-foreground: "#fbf7f0"
  destructive: "#c0392b"
  border: "#e4d8c7"
  input: "#e4d8c7"
  ring: "#c2562f"
  success: "#15924c"
  success-foreground: "#fbf7f0"
  warning: "#b9760a"
  warning-foreground: "#fbf7f0"
  info: "#1f5fd6"
  info-foreground: "#fbf7f0"
  chart-5: "#8a5a9c"
  sidebar: "#ece2d4"
  sidebar-foreground: "#2a2521"
  sidebar-accent: "#e4d8c7"
typography:
  display:
    fontFamily: "Fraunces Variable, serif"
    fontSize: "2.25rem"
    fontWeight: 600
    lineHeight: 1.111
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Fraunces Variable, serif"
    fontSize: "1.5rem"
    fontWeight: 500
    lineHeight: 1.25
  numeral:
    fontFamily: "Fraunces Variable, serif"
    fontSize: "1.5rem"
    fontWeight: 400
    lineHeight: 1
  title:
    fontFamily: "Fraunces Variable, serif"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.375
  body:
    fontFamily: "Inter Variable, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.429
  body-strong:
    fontFamily: "Inter Variable, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.429
  label:
    fontFamily: "Inter Variable, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.333
  overline:
    fontFamily: "Inter Variable, sans-serif"
    fontSize: "11px"
    fontWeight: 500
    letterSpacing: "0.05em"
rounded:
  md: "8px"
  lg: "10px"
  xl: "14px"
  4xl: "26px"
spacing:
  "1": "4px"
  "1.5": "6px"
  "2": "8px"
  "2.5": "10px"
  "3": "12px"
  "4": "16px"
  "6": "24px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-foreground}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.lg}"
    padding: "0 10px"
    height: "32px"
  button-outline:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.lg}"
    padding: "0 10px"
    height: "32px"
  button-secondary:
    backgroundColor: "{colors.secondary}"
    textColor: "{colors.foreground}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.lg}"
    padding: "0 10px"
    height: "32px"
  button-ghost:
    textColor: "{colors.foreground}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.lg}"
    padding: "0 10px"
    height: "32px"
  button-destructive:
    textColor: "{colors.destructive}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.lg}"
    padding: "0 10px"
    height: "32px"
  input:
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.lg}"
    padding: "4px 10px"
    height: "32px"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.xl}"
    padding: "16px"
  card-sm:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.xl}"
    padding: "12px"
  metric-cell:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    typography: "{typography.numeral}"
    rounded: "{rounded.lg}"
    padding: "12px"
  status-badge-success:
    textColor: "{colors.success}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "2px 8px"
  status-badge-info:
    textColor: "{colors.info}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "2px 8px"
  status-badge-warning:
    textColor: "{colors.warning}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "2px 8px"
  status-badge-destructive:
    textColor: "{colors.destructive}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "2px 8px"
  status-badge-neutral:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.muted-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.md}"
    padding: "2px 8px"
  badge:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.4xl}"
    padding: "2px 8px"
    height: "20px"
  tabs-list:
    backgroundColor: "{colors.muted}"
    textColor: "{colors.muted-foreground}"
    rounded: "{rounded.lg}"
    padding: "3px"
    height: "32px"
  tabs-trigger-active:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.md}"
  dialog:
    backgroundColor: "{colors.popover}"
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.xl}"
    padding: "16px"
    width: "384px"
  nav-item:
    textColor: "{colors.sidebar-foreground}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  nav-item-active:
    backgroundColor: "{colors.sidebar-accent}"
    textColor: "{colors.sidebar-foreground}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  sidebar:
    backgroundColor: "{colors.sidebar}"
    textColor: "{colors.sidebar-foreground}"
    width: "240px"
  topbar:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    height: "56px"
  list-row:
    textColor: "{colors.foreground}"
    typography: "{typography.body-strong}"
    padding: "12px 16px"
---

# Design System: RestoManager

## Overview

**Creative North Star: "The Maître d's Ledger"**

RestoManager should feel like the host's book of the room: warm paper, dark ink, and every line earning its place. The surfaces are a linen canvas with cream sheets laid on top. Names and numbers are set in a serif (Fraunces); everything a hand has to operate is set in a plain, compact sans (Inter). The screen is dense the way a good ledger is dense. Rows are ruled with hairlines and status is a small coloured mark, so a waiter holding a tablet can read the whole floor at a glance.

The system is calm by default and loud only where it has to be. Exactly one terracotta element on a screen tells you what to do next. Status colour carries urgency: green for open, blue for in service, amber for waiting, red for "needs you". Chrome stays quiet. The parchment sidebar is a shade off the canvas, the topbar is a cream strip, and nothing floats unless it actually overlays something. The owner's brief rejects bright-POS, soft-native and the empty starter template. The aim is "clean dense productivity" in the Notion / Airtable / Linear-light family, warmed for hospitality.

Themes swap palette only. Midnight, Monokai and Gruvbox repaint the same ledger, and density, hierarchy, radius logic and component shapes never change between them (except that Monokai and Gruvbox tighten the base radius, see Shapes).

**Key Characteristics:**
- Warm light paper canvas with cream cards, and ink-dark text that is never pure black.
- A single terracotta accent, rationed to one primary action per screen.
- Fraunces serif for names and numbers, Inter for everything operated.
- Hairline separation (1px rings and borders) instead of shadows.
- Compact 32px controls on desktop that grow to 44px under touch.
- Status as semantic tint plus label or dot, the same in every theme.

## Colors

A warm, low-chroma paper-and-ink palette with one fired-clay accent and four functional status hues.

### Primary
- **Terracotta** (#c2562f; `accent`, also `primary`, `ring`, `chart-1`): the single "do this next" colour. It fills the one primary CTA per screen and the brand tile in the sidebar. It also tints selected states (`accent/5`–`accent/10` backgrounds with an `accent/40` border, as in checkout bill selection and the active theme card) and drives the focus ring (`ring/50`, 3px). Text on it is Cream Paper (`accent-foreground`).

### Neutral
- **Linen Canvas** (#f3ece1; `background`): the page itself, behind every screen and inside outline buttons and the active tab pill.
- **Cream Paper** (#fbf7f0; `card`, `popover`): cards, dialogs, sheets, the topbar and metric cells. It sits one step lighter than the canvas, so a surface reads as a sheet laid on the table.
- **Espresso Ink** (#2a2521; `foreground`; also `card-foreground`, `popover-foreground`, `secondary-foreground`): all primary text and icons. Warm near-black, never `#000`.
- **Taupe Pencil** (#897c6b; `muted-foreground`): secondary text, subtitles, list-row meta, placeholders, inactive tabs and neutral status.
- **Parchment** (#ece2d4; `secondary`, `muted`, `sidebar`): the sidebar, tab-list track, secondary buttons, neutral status chips, empty-state icon discs and dialog/card footers (at 50%).
- **Sand Hairline** (#e4d8c7; `border`, `input`, `sidebar-accent`, `sidebar-border`): every divider, input stroke and list-row rule, and the active sidebar item fill.

### Status (functional, not decorative)
- **Basil Green** (#15924c; `success`): Open / available / ready.
- **Cobalt Ticket** (#1f5fd6; `info`): In service / occupied / reservation.
- **Saffron Amber** (#b9760a; `warning`): Waiting / pending / mid-urgency.
- **Brick Red** (#c0392b; `destructive`): Needs you / overdue / error / cancelled / destructive actions.
- **Plum** (#8a5a9c; `chart-5`): the fifth chart series only. Charts use `chart-1`…`chart-5` (Terracotta, Basil, Cobalt, Saffron, Plum), in that order.

Status chips use a 12% tint of the hue as background with full-strength hue text (15% for warning), plus an optional 8–10px dot (`components/ui/status.tsx`).

### Alternate themes
`data-theme` on `<html>` selects the theme (`theme-provider.tsx` persists it to `localStorage`, and the inline script in `index.html` prevents a flash of the wrong theme). The `.dark` class is not used. Every alternate theme overrides **every colour token** above (surfaces, ink, accent, status, chart and sidebar). Monokai and Gruvbox also override `--radius`. All values are in `apps/web/src/index.css`.

- **Midnight** (`index.css:197-236`): near-black canvas `#0a0b0f`, card `#14161d`, indigo accent `#6366f1` (`primary` = `accent`), with the same `--radius` (0.625rem). Labelled "Dark premium tool". `direction.md` names it the dark / KDS theme. It is missing from `CLAUDE.md`'s theme list.
- **Monokai** (`index.css:115-154`): canvas `#272822`, card `#3e3d32`, sidebar `#1e1f1c`, accent `#fd971f`, success `#a6e22e`, warning `#e6db74`, destructive `#f92672`, info `#66d9e8`. `--radius` is 0.375rem (6px). `primary` is cream `#f8f8f2`, **not** the accent.
- **Gruvbox** (`index.css:156-195`): canvas `#282828`, card `#3c3836`, sidebar `#1d2021`, accent `#fe8019`, success `#b8bb26`, warning `#d79921`, destructive `#cc241d`, info `#83a598`. `--radius` is 0.375rem (6px). `primary` is cream `#ebdbb2`, **not** the accent.

### Named Rules
**The One Terracotta Rule.** Exactly one filled accent action per screen: the primary CTA, `bg-accent text-accent-foreground`. Everything else is outline, secondary or ghost. Toggles, active nav and selected rows use tints or Sand, never a solid accent fill. The sidebar brand tile is the only standing exception.

**The Tokens-Only Rule.** Components reference semantic utilities only (`bg-card`, `bg-accent`, `text-muted-foreground`, `border-border`, `bg-success|warning|info|destructive`). Literal hex lives only inside the `[data-theme]` blocks of `index.css`. If a value is not a token, it does not ship.

**The Status-Is-Semantic Rule.** A status hue always means the same state on every screen and in every theme: open = success, in service = info, waiting = warning, needs you = destructive, reservation = info. Never use a status hue for decoration.

## Typography

**Display Font:** Fraunces Variable (with `serif`)
**Body Font:** Inter Variable (with `sans-serif`)
**Label/Mono Font:** Inter for labels. `font-mono` (the Tailwind default stack) appears only for editable stock quantities in Inventory.

**Character:** A soft, slightly old-style serif for the things a maître d' would write by hand (the restaurant's name, screen titles, totals), paired with a neutral, highly legible grotesque for everything a hand has to operate. Both are self-hosted via `@fontsource-variable` and wired as `--font-sans`, `--font-serif` and `--font-heading` in `@theme inline`.

### Hierarchy
- **Display** (Fraunces 600, 2.25rem, line-height ≈1.11, tracking −0.025em): the brand wordmark on the login brand panel only.
- **Headline** (Fraunces 500, 1.5rem, line-height 1.25): the screen title in `PageHeader`, one per screen. The phone login wordmark uses the same size at 600.
- **Numeral** (Fraunces 400, 1.5rem, line-height 1): the KPI value in `MetricCell`. Numbers are a serif moment.
- **Title** (Fraunces 500, 1rem, line-height 1.375): card titles and dialog/sheet titles (`font-heading`). Card size `sm` drops to 0.875rem.
- **Body** (Inter 400, 0.875rem, line-height ≈1.43): the default text size inside cards, dialogs, tabs and tables.
- **Body-strong** (Inter 500, 0.875rem): buttons, tab triggers, nav items, list-row titles and the topbar title (600).
- **Label** (Inter 500, 0.75rem, line-height ≈1.33): status chips, badges, metric labels, list-row subtitle/meta (400) and helper text.
- **Overline** (Inter 500, 11px, uppercase, tracking 0.05em, 45% sidebar ink): nav group headings only.

Inputs render at 1rem below the `md` breakpoint and 0.875rem from `md` up. The 16px minimum on phones prevents iOS zoom-on-focus.

### Named Rules
**The Serif-For-Names-And-Numbers Rule.** Fraunces is reserved for the wordmark, screen titles, card/dialog titles and metric numerals. Never set a button, label, input, table cell or nav item in the serif.

**The No-Bold Rule.** The heaviest weight in the system is 600 (semibold), used only for the wordmark, the topbar title and the active nav item. Everything else is 400 or 500. Hierarchy comes from family, size and structure, not from bold.

## Layout

**Shell:**
- A fixed-height app shell: a 240px Parchment sidebar on the left, from `md` (48rem / 768px) up, and a 56px cream topbar above a scrolling main area.
- Below `md` the sidebar disappears. The topbar shows a menu button that opens the same navigation in a left sheet (256px), and notifications open in a right sheet (320px).
- The topbar pads 16px, and 24px from `sm` (40rem / 640px).

**Content:**
- Screens pad 24px and stack sections 24px apart.
- KPI rows are a 2-column grid that becomes 4 columns at `lg` (64rem / 1024px), with a 12px gap.
- Compact tile grids go 3 → 5 columns at `sm` with an 8px gap.
- `direction.md` asks for a two-column attention-queue-plus-floor layout on tablet and desktop that stacks on phone.

**Rhythm:**
- Built on Tailwind's 4px spacing unit.
- The steps actually used: 4, 6 and 8px inside controls; 10px control side padding; 12px row and small-card padding and grid gaps; 16px card and row padding; 24px page padding and section gaps.

**Density and touch:**
- Desktop (fine pointer) keeps the dense 32px control scale.
- On coarse-pointer devices (tablet/phone), buttons, inputs and select triggers get a minimum height of 44px (2.75rem), and buttons also get a minimum width of 44px (`index.css:260-271`). This is how the system honours "mobile/tablet-first" without bloating desktop.

**Motion:**
- Route changes fade and rise 6px over 180ms ease-out (`animate-page-in`).
- Dialogs and select popups fade and zoom from 95% over 100ms. Sheets slide 2.5rem and fade over 200ms, and their scrim fades over 150ms.
- `prefers-reduced-motion: reduce` collapses all animation and transition durations to 0.01ms.

### Named Rules
**The 44px Thumb Rule.** Anything tappable must reach 44px on touch. Use the shared `Button`, `Input` and `Select` (`data-slot`) so the coarse-pointer rule applies. Hand-rolled `<button>`s must meet it themselves.

**The No-Empty-Void Rule.** Density is a feature (`direction.md`). A screen should feel full and useful at every breakpoint: lists over oversized cards, and two columns where the width allows.

## Elevation & Depth

The system is flat and hairline-separated. Resting surfaces get their depth from tone (a cream card on a linen canvas) and a 1px edge, not from shadow. Cards and dialogs use a 1px ring of Espresso Ink at 10% opacity, while list rows, inputs and the sidebar use the Sand Hairline border. Shadows (Tailwind defaults) appear only on things that genuinely lift off the page.

### Shadow Vocabulary
- **Rest-lift** (`shadow-sm`: `0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)`): the active tab pill, floor-map table tiles, and menu item cards.
- **Hover-lift** (`shadow-md`: `0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)`): select popups, and the hover state of floor tiles and menu cards.
- **Overlay** (`shadow-lg`: `0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)`): sheets (drawers).
- **Scrim:** a 10% black wash with a 4px backdrop blur behind dialogs and sheets. Some route-local modals use 40–50% black; see Known inconsistencies.

### Named Rules
**The Hairline-First Rule.** Separate with a 1px line or a tone step before reaching for a shadow. A resting card never carries more than `shadow-sm`, and a shadow at rest needs a reason (it is draggable, or it is the selected pill).

## Shapes

The corners are softly rounded, all derived from one base `--radius` of 0.625rem (10px) in the default and Midnight themes. Monokai and Gruvbox tighten the base to 6px, which scales every step down proportionally.

- **Gently curved controls** (10px, `rounded.lg`): buttons, inputs, select triggers, the tab-list track, metric cells and empty-state frames.
- **Softer containers** (14px, `rounded.xl`): cards, dialogs, alert dialogs, and order-builder item tiles.
- **Tight inner pieces** (8px, `rounded.md`): status chips, tab triggers, sidebar nav items, and the `xs`/`sm` button sizes (capped at 8px).
- **Pill** (26px, `rounded.4xl`, which on a 20px-high badge reads as fully round): the shadcn `Badge`.
- **Full circle:** status dots, avatars and the empty-state icon disc.

Borders are always 1px (2px only on floor-map table tiles). The empty state uses a dashed 1px border.

## Components

The feel is quiet, compact and tactile: small and precise under a mouse, thumb-sized under a finger, and never glossy.

### Buttons
- **Shape:** gently curved (10px). The default size is 32px high, compact sizes are 28px and 24px, and icon buttons are square at 32, 28, 24 or 36px. All of them grow to 44px on touch.
- **Primary:** Terracotta fill with Cream Paper text, 14px medium Inter, 10px side padding, and a 6px icon gap. Icons are 16px Lucide. **One per screen.**
- **Hover / Focus / Active:**
  - Hover fades the fill to 80%.
  - Focus-visible shows a 3px Terracotta ring at 50% plus a Terracotta border.
  - Active (press) nudges down 1px.
  - Disabled is 50% opacity with no pointer events.
  - Invalid shows a Brick Red border and a 20% ring.
- **Outline:** Linen Canvas fill, Sand Hairline border, Espresso Ink text, and a Parchment hover. This is the default secondary action.
- **Secondary:** Parchment fill. Hover mixes in 5% ink.
- **Ghost:** no fill, with a Parchment hover. Used for toolbar and icon actions and dialog close buttons.
- **Destructive:** a soft 10% Brick Red tint with Brick Red text, deepening to a 20% tint on hover. It is never a solid red block.
- **Link:** accent-coloured text, underlined on hover.

### Chips (status)
- **Style:** `StatusBadge` is an 8px-radius chip with 2×8px padding and 12px medium text, on a 12% tint of its tone (15% for warning) with full-strength tone text. An optional leading `StatusDot` (8px, or 10px at `md`).
- **State:** the tones are success, info, warning, destructive and neutral (Parchment with Taupe text). The service statuses map to tones automatically (open, in-service, waiting, needs-you, reservation). The shadcn `Badge` (a 20px pill) is for counts and labels, not status.

### Cards / Containers
- **Corner Style:** softer containers (14px).
- **Background:** Cream Paper on Linen Canvas.
- **Shadow Strategy:** none at rest. A 1px ink ring at 10% opacity (see Elevation & Depth).
- **Border:** the ring stands in for the border. Footers carry a top hairline on a 50% Parchment wash.
- **Internal Padding:** 16px, or 12px for the `sm` size. Gaps between header, content and footer match the padding.
- **Metric cell:** a 10px-radius cream tile with a Sand Hairline border and 12px padding. The label is set in Label, the value in Numeral, and an optional sub-line in Label.

### Inputs / Fields
- **Style:** 32px high (44px on touch), 10px radius, Sand Hairline stroke, transparent fill (the surface shows through), 10px side padding, and Taupe placeholders.
- **Focus:** the border turns Terracotta, plus a 3px Terracotta ring at 50%.
- **Error / Disabled:** `aria-invalid` gives a Brick Red border and a 3px Brick Red ring at 20%. Disabled gets a 50% Sand fill at 50% opacity with a not-allowed cursor.

### Navigation
- **Sidebar (md+):**
  - 240px Parchment panel with a Sand Hairline right edge.
  - Brand row: a 36px Terracotta tile holding a Lucide `UtensilsCrossed`, next to the "RestoManager" wordmark in 14px semibold.
  - Groups are headed by overlines.
  - Items are 14px medium at 65% ink, with a 16px icon, 8×12px padding and an 8px radius. Hover and active fill with Sand Hairline at full ink, and the active item goes semibold.
  - The footer shows the user's initials avatar, email and role.
- **Topbar:** a 56px Cream Paper strip with a bottom hairline, holding the screen title (14px semibold), the notification bell (ghost icon button that opens a right sheet), the user email from `sm` up, and logout.
- **Mobile:** a hamburger in the topbar opens a 256px left sheet with the same groups. Active items there use a 10% Terracotta tint with Terracotta text.

### Tabs
- A Parchment track (32px, 10px radius, 3px inset). The active trigger becomes a Linen Canvas pill with Rest-lift and Espresso Ink text, and inactive triggers sit at 60% ink. A `line` variant drops the track and marks the active tab with a 2px ink underline.

### Dialogs & Sheets
- **Dialog:** a Cream Paper panel, 14px radius, 1px ink ring at 10%, 16px padding, 384px maximum width from `sm` (full width minus 32px on phones), with a ghost close button at top-right. The footer is a full-bleed 50% Parchment band with a top hairline. Its buttons stack in reverse on phones and align right from `sm`.
- **Sheet:** a Cream Paper drawer with Overlay shadow, 75% of the viewport wide and capped at 384px from `sm`. It slides in from the requested side.

### List Row (signature)
`ListRow` is the dense-ledger workhorse and should be preferred over a card grid.
- 12×16px padding and a Sand Hairline bottom rule (none on the last row).
- Leading slot (a dot, avatar or icon), then a truncating Body-strong title, a Label subtitle in Taupe, right-aligned Taupe meta, and a trailing action.

### Empty State
- A dashed Sand frame with 64px vertical padding, centred.
- A 48px Parchment disc holding a 24px Taupe Lucide icon, a Body-strong title, a 12px Taupe description (max 20rem), and an optional action.

## Do's and Don'ts

### Do:
- **Do** use semantic utilities only: `bg-background`, `bg-card`, `bg-accent`, `text-muted-foreground`, `border-border`, `bg-success|warning|info|destructive`. Put any new hex in every `[data-theme]` block of `index.css`, never in a component.
- **Do** give each screen exactly one filled Terracotta CTA (`bg-accent text-accent-foreground`, or `PageHeader`'s `action` slot). Make every other action outline, secondary or ghost.
- **Do** design at tablet first, then phone (single column, 44px targets), then desktop as the wide enhancement. Use the shared `Button`, `Input` and `Select` so the coarse-pointer 44px rule applies.
- **Do** use Lucide icons only, at 16px in controls and 24px in empty states, inheriting `currentColor`.
- **Do** express status as a tint chip or a dot plus a text label, using the fixed tone mapping (open → success, in service → info, waiting → warning, needs you → destructive).
- **Do** give every interactive element distinct hover, active, focus-visible (3px ring at 50%) and disabled states.
- **Do** check every new screen in all four themes. Themes change palette only. Density, hierarchy and components stay constant.
- **Do** keep motion short: 100ms for popovers and dialogs, 150ms for colour and scrim, 180ms for page-in, 200ms for drawers. Honour `prefers-reduced-motion`.

### Don't:
- **Don't** write `bg-white`, `bg-zinc-*`, `text-white`, `bg-black/*`, raw hex or inline `style={{ background }}` in route or feature code. The shadcn primitives' 10% black scrim is the one current exception until a semantic scrim token exists.
- **Don't** use the `.dark` class, or write `dark:` variants in new code. `data-theme` on `<html>` is the only theming mechanism. The shadcn primitives still carry `dark:` classes and need cleanup.
- **Don't** put a second solid Terracotta fill on a screen. That includes view toggles, active nav and selected rows, which use tints, Sand or Parchment instead.
- **Don't** use gradient text or decorative glassmorphism (archived design doc §3).
- **Don't** drift toward bright-POS, soft-native or the empty starter template (`direction.md` §Frame). Avoid oversized double-encoded cards and empty voids.
- **Don't** set controls, labels, inputs or table cells in Fraunces. Don't set screen titles or metric numerals in Inter.
- **Don't** use a status hue decoratively, or let one hue mean two states. Reservation is info (blue) everywhere.
- **Don't** add another icon library, or hand-inline SVG icons.

## Known inconsistencies

These are facts about the code as of 2026-10-18 that need fixing. They are not rules to copy.

- **Primary button color.** The repo rule is one `bg-accent text-accent-foreground` CTA per screen, but the shared `Button` default variant is `bg-primary text-primary-foreground` (`components/ui/button.tsx`).
  - In the default and Midnight themes `--primary` equals `--accent`, so nothing looks wrong.
  - In Monokai (`#f8f8f2`) and Gruvbox (`#ebdbb2`) `--primary` is cream. Every default-variant CTA (about 17, across floor, checkout, order, settings, inventory, reservations and login) renders cream instead of the accent orange.
  - A few CTAs hand-roll `bg-accent`, with `hover:bg-accent/90` where the default variant uses `/80` (`menu/index.tsx`, `floor/index.tsx`).
- **Four themes, not three.** The code ships `default`, `midnight`, `monokai` and `gruvbox` (`index.css`, `theme-provider.tsx`). `CLAUDE.md` lists three.
- **Reservation color.** `components/ui/status.tsx` maps reservation to `info` (blue). `routes/_app/floor/-floor-map.tsx` maps a `reserved` table to `warning` (amber).
- **Live `dark:` variants.**
  - The shadcn primitives (button, input, select, tabs, badge, dialog) carry `dark:` classes.
  - With no `@custom-variant dark` defined, Tailwind v4 resolves them to `prefers-color-scheme: dark`.
  - An OS in dark mode therefore restyles inputs and outline buttons inside the light Warm-canvas theme.
- **`index.html` theme-color** is `#09090b`, a leftover from the old zinc theme. It does not match the default canvas.
- **Page padding on phones.** Screens pad 24px (`p-6`) at every width. That is heavy for a 390px phone in a density-first system.
- **Literal values in components.**
  - `theme-selector.tsx` uses raw hex swatches and an inline SVG checkmark (not Lucide).
  - Route-local modals use `bg-black/40` and `bg-black/50` scrims (floor, inventory, menu).
