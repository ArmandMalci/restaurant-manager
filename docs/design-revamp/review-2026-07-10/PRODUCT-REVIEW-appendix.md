# Product Review — Per-Screen Appendix

_Full finding detail for all 12 screens. Companion to [PRODUCT-REVIEW.md](PRODUCT-REVIEW.md). Each finding was produced by an independent Sonnet reviewer reading the tablet+phone screenshot and the route source against the `docs/PRODUCT.md` design system._


---


## 01 · Login

**Screens:** [tablet](screenshots/01-login-tablet.png) · [phone](screenshots/01-login-phone.png)


Token discipline and one-CTA rule are followed cleanly, and the Fraunces-serif wordmark plus real error/loading states show genuine craft rather than a templated AI scaffold. But the screen has one outright layout bug and one design-system violation that hit exactly the devices this app is built for: below the `lg` (1024px) breakpoint — i.e. on every tablet and phone, the entire target audience — the sign-in panel is not vertically centered, so the card sits pinned near the top of the viewport with a large dead cream void filling the rest of the screen; and both text inputs render at 32px tall (h-8) against a stated 44px touch-target minimum. The desktop split-panel treatment that got the design attention is invisible on portrait tablets, the primary device class, leaving them with an under-finished phone layout stretched over more canvas.


**What works**

- Zero raw-hex/palette leakage in the route: bg-sidebar, bg-background, text-muted-foreground, bg-destructive/10, text-destructive, bg-accent-driven Button — full semantic-token compliance.
- Exactly one primary CTA ('Sign in', bg-accent equivalent via Button default variant); every other element is plain text or a bare icon mark — the one-CTA rule is genuinely followed, not just claimed.
- Error state is actually implemented, not just designed: login.isError renders a bg-destructive/10 / border-destructive/20 message block with the real server error text, falling back to a sensible default.
- Loading state is real: inputs and button both disable during login.isPending and the button label swaps to 'Signing in…', preventing duplicate submits — solid engineering polish most 'redesign' passes skip.
- Brand wordmark uses a licensed variable serif (Fraunces Variable via --font-serif/--font-heading), not a generic system-serif fallback or gradient-text trick — reads as an intentional boutique-hospitality mark rather than generic SaaS/AI-slop.
- Copy is consistent between the desktop brand panel and the mobile footer ('Access restricted to authorized staff only.') — small but deliberate polish detail.
- Lucide-only iconography (UtensilsCrossed) with consistent stroke weight, per the design-system rule.


**Findings**

- **🔴 Critical** · _design_ — **Sign-in card is pinned near the top of the screen on tablet and phone, leaving a huge dead void below**  
  Evidence: Both screenshots (tablet 01-login-tablet.png and phone 01-login-phone.png) show the logo + card ending at roughly the upper half of the viewport, with a large blank cream area filling the remainder — on phone this is more than half the screen with nothing in it. Source confirms why: the outer wrapper is `fixed inset-0 flex flex-col lg:grid lg:grid-cols-2` (login.tsx line 45). Below `lg` the brand panel is `hidden` and only the sign-in panel renders; that panel (line 65) has `flex flex-col items-center justify-center` but no `flex-1`/`h-full`, so in a column flex container it sizes to its own content height instead of stretching to fill the viewport — `justify-center` then only centers its children within that shrunken box, which sits at the flex-start (top) of the fixed full-height parent. At `lg`+ the parent becomes a CSS grid, whose default `stretch` alignment fixes this by accident — the bug only exists below the breakpoint, i.e. on every tablet and phone.  
  Fix: Add `flex-1` (or `min-h-full`) to the sign-in panel div so it fills the fixed-inset container on the flex-col (pre-lg) path the same way grid stretch does on desktop; then justify-center will actually center the card vertically on tablet and phone.
- **🟠 High** · _design_ — **Email/password inputs render at 32px tall, below the stated 44px touch-target minimum**  
  Evidence: apps/web/src/components/ui/input.tsx sets the base Input class to `h-8` (32px) with `py-1`; login.tsx uses this Input unmodified for both Work Email and Password. The Sign-in button is explicitly bumped to `h-10` (40px) via `className="mt-1 h-10 w-full"` in login.tsx line 121 — evidence the touch-size gap was already noticed for the CTA but not for the two fields the user has to tap first on a touch keyboard.  
  Fix: Bump the login inputs (or the shared Input default, since every form in the app inherits h-8) to at least h-11 (44px) to meet the app's own touch-target rule, and take the Sign-in button the rest of the way from h-10 to h-11.
- **🟡 Medium** · _design_ — **The tablet-first app's considered split-panel treatment is invisible on portrait tablets, its primary device class**  
  Evidence: The desktop brand panel (terracotta bg-sidebar column with wordmark, tagline, and footer) only renders at `lg:flex` (1024px+). The tablet screenshot is a portrait tablet viewport (well under 1024px CSS width) and shows the bare single-column mobile layout — identical structure to the phone shot, just more empty canvas around it. For an app whose own CLAUDE.md/PRODUCT.md states 'staff use this on tablets and phones... design every screen for touch and small viewports first; desktop is the enhancement,' the one visually rich layout variant is gated behind a breakpoint most tablets in portrait orientation never cross.  
  Fix: Design an intermediate tablet treatment (e.g. at `sm`/`md`) instead of jumping straight from mobile-stacked to `lg` two-column — or accept the single-column layout as intentional for tablet and fix its vertical-centering bug (finding above) so it at least looks finished.
- **🟡 Medium** · _completeness_ — **No password visibility toggle**  
  Evidence: Password Input in login.tsx (lines 99-108) is a plain `type="password"` field with no show/hide affordance. On a touch keyboard — the only input method on the tablets/phones this app targets — staff can't visually confirm what they typed before submitting, and there's no autocomplete/passkey affordance either.  
  Fix: Add a Lucide Eye/EyeOff toggle button inside the password field to flip `type` between 'password' and 'text', matching the touch-first mandate.
- **🟡 Medium** · _completeness_ — **No account-recovery path when sign-in fails**  
  Evidence: The only feedback on failed login is the inline destructive message block (line 112-118); there is no 'Forgot password' link, no contact-manager/IT hint, and no rate-limit or lockout messaging. A waiter who mistypes or forgets a password mid-shift has no in-app next step besides retrying blindly.  
  Fix: Add a low-emphasis 'Forgot password? Ask your manager' (or equivalent) link/text under the form — secondary, not a second CTA — pointing to whatever real-world recovery process exists (e.g., an admin resetting it from Staff settings).
- **⚪ Low** · _design_ — **Field validation relies entirely on native browser tooltips, inconsistent with the app's own styled error pattern**  
  Evidence: Both inputs only carry `required`/`type="email"` (lines 88, 103) with no client-side inline message; the only styled error state is the server-driven destructive block. Submitting empty fields will trigger the browser's native validation bubble, whose styling/position varies across Chrome/Safari/PWA webviews and doesn't match the app's own destructive-token treatment already built two lines below it.  
  Fix: Low priority — optionally add lightweight inline field errors using the same bg-destructive/10 pattern already coded for the server error, for visual consistency across all failure states.

---

## 02 · Service home

**Screens:** [tablet](screenshots/02-service-tablet.png) · [phone](screenshots/02-service-phone.png)


The Service home screen is structurally sound and token-clean — a warm, editorial KPI strip, a properly-stated empty state, and working loading skeletons — but it has one real bug (three inconsistent minute-formatting paths in the same file, with the urgent queue getting the ugliest one) and two real interaction gaps that matter a lot for a touch-first, mid-shift tool: the queue's only action button is well under the 44px touch minimum, and the floor-status tiles look tappable but do nothing and hide their only detail behind a hover-only tooltip. None of this looks broken at a glance — the screen reads calm and premium-adjacent — but a waiter tapping fast during a rush will mis-tap the Run button and get nothing from the floor grid, and the numbers in the queue will look wrong even once the demo data is fresh. Fix the formatter and the touch targets first; the rest is polish."


**What works**

- Semantic token discipline is clean throughout the route file — Card/MetricCell/ListRow/StatusDot all use bg-card, border-border, text-muted-foreground, etc.; no raw hex or palette classes found in index.tsx.
- The empty state for Needs attention (CircleCheck icon, 'All clear', 'No alerts right now.') is a real, designed state, not a blank gap — matches the design system's empty-state component.
- Loading skeletons are implemented for both the KPI strip and the attention list, shaped to match the real content instead of a generic spinner.
- Zero bg-accent elements compete on this screen, so the one-primary-CTA rule is never at risk of violation here — all actions read as clearly secondary.
- Serif numerals on the KPI values (6 / 48, 1 / 10) give the dashboard a slightly editorial, non-generic feel versus a typical all-sans SaaS metric strip.
- Null-state handling is thoughtful in one place at least — Avg turn renders an em dash via formatMins rather than '0m' or 'NaN' when there's no data.
- Responsive degradation is sensible: floor grid goes grid-cols-3 (phone) to sm:grid-cols-5, and the persistent labeled sidebar collapses to a compact hamburger + bell + logout row on phone.


**Findings**

- **🟠 High** · _design_ — **Attention-queue timestamps bypass the app's own hour/minute formatter**  
  Evidence: index.tsx defines two different minute renderers: formatMins (lines 19-23) converts to "Xh Ym" and IS used for the Avg turn KPI (line 143, renders '—' cleanly when null). But the Needs-attention age uses formatAge (lines 39-44, used at line 177), which just returns `${ageMin}m` with no hour conversion — same raw-minutes problem hits the Kitchen-load 'oldest' sub-value (line 148, inline template `${...}m oldest`, no helper at all). Result on both screenshots: the two most urgent rows in the queue show '7734m' and '7233m' sitting right next to a KPI strip that already proves the app knows how to format hours cleanly. This isn't the demo data being old — it's three inconsistent minute-rendering paths in one file, and the one place that needed it most (the urgent queue) got the raw one.  
  Fix: Route formatAge (and the kitchen 'oldest' sub-label) through formatMins so every elapsed-time value in the file renders identically, e.g. 'Table 1 · order ready — 128h 54m'. Delete formatAge or fold its 'now'/'in Xm' cases into formatMins as options.
- **🟠 High** · _design_ — **"Run" button — the only actionable control on the queue — is well under the 44px touch minimum**  
  Evidence: Tablet & phone screenshots: the Run button on each Needs-attention row is visibly smaller than the row's own text block. Source (lines 179-186): `className="... rounded-md border border-border bg-background px-3 py-1 text-xs font-medium ..."` — py-1 (4px vertical padding) + text-xs (12px/16px line-height) + 1px border yields roughly a 26-28px tall hit target, against the 44px minimum this app's own review criteria call out. This is the primary tap target on the screen a waiter uses most during rush.  
  Fix: Bump to at least py-2.5 (or a fixed min-h-11/h-11) with text-sm on this button; it's used on a screen whose whole premise is fast triage under time pressure.
- **🟠 High** · _completeness_ — **Floor mini-grid tiles look tappable but are inert**  
  Evidence: Lines 200-209: each floor tile is a plain `<div>` (bordered, rounded-lg, same chip styling as the interactive Run buttons and nav items) with only a `title` attribute for tooltip — no onClick, no Link, no button role. On both screenshots the tiles are visually indistinguishable from other tappable chips on the page, but tapping T2/T4/T10 (amber, needing attention) does nothing.  
  Fix: Either wire the tile to navigate to that table in Floor/Order (matching the pattern already used for attention-row actions), or restyle it as clearly non-interactive (drop the border/card treatment) so it doesn't visually promise an action it can't deliver.
- **🟡 Medium** · _completeness_ — **Floor-tile detail (status name, age) is hover-only — unreachable on the target devices**  
  Evidence: Line 203: `title={\`Table ${t.number} — ${t.status}${t.ageMin != null ? \` (${t.ageMin}m)\` : ''}\`}` is a native HTML tooltip, which never fires on touch. Combined with finding above (tile isn't even tappable), the floor grid's only color-coded dots (green/amber/blue, no legend anywhere on screen) are the sole signal — a waiter has to already know the color convention, and there's no way to drill into 'why is T4 amber' on a tablet or phone.  
  Fix: Surface status/age as visible text (even abbreviated) or make the tile open a detail sheet on tap; add a one-line legend near the FLOOR label for new staff.
- **🟡 Medium** · _completeness_ — **Queue action buttons deep-link to a generic section, not the specific ticket**  
  Evidence: handleAttentionAction (lines 90-107): 'order-ready' → navigate to `/order` (whole Order page), 'table-waiting' → `/floor`, 'reservation-due' → `/door`, 'low-stock' → `/inventory` — none pass the table/order id. Tapping 'Run' on 'Table 1 · order ready' lands on the generic Order list, requiring the waiter to re-find Table 1 among all open orders.  
  Fix: Pass the alert's table/order id as a route param/search so the action lands directly on the specific ticket, matching what the button label ('Run', 'Seat') promises.
- **⚪ Low** · _design_ — **Card borders have too little contrast against the cream page background**  
  Evidence: Tablet screenshot: the four KPI cards and the Needs-attention panel use `border-border` against the warm-canvas background, but the line is faint enough that card boundaries nearly disappear — the eye has to work to tell where one metric cell ends and the page begins. The warm monochrome palette itself is deliberate per the design brief; it's specifically this border's contrast that's too low, not the palette choice.  
  Fix: Nudge `--border` a step darker in the default theme, or add a subtle shadow/bg-card distinction so card edges read without hover.
- **⚪ Low** · _design_ — **Attention-row subtitles truncate mid-list with no way to see the rest**  
  Evidence: Both screenshots show the item list cut with an ellipsis ('... — ru…' on phone, '...Sparkling ...' on tablet) — the exact information (which dishes are ready to run) a waiter needs most is the part getting clipped, and there's no tap-to-expand or wrap.  
  Fix: Wrap to two lines instead of truncating, or make the row expandable/tappable to reveal the full item list.
- **⚪ Low** · _design_ — **Page repeats its own title immediately below the app bar**  
  Evidence: Both screenshots: the top bar already shows 'Service' as the section title, then the page body opens with a large serif H1 'Service' again before the date subtitle — on phone this doubled title plus the date line consumes a meaningful chunk of the first screen before any real content (KPIs) appears. Likely comes from the shared PageHeader/shell pattern rather than something specific to this route.  
  Fix: If PageHeader is used across all routes, address at the shell level (e.g. drop the H1 when the app-bar title already states the page, keep PageHeader only for the date/subtitle) rather than patching this screen alone.
- **⚪ Low** · _completeness_ — **No staleness/refresh indicator despite silent polling**  
  Evidence: ServicePage polls every 12s (`refetchInterval: 12_000`, line 83) with no visible last-updated time, subtle spinner, or manual refresh control — a waiter glancing at the screen mid-rush has no way to tell 'is this current' vs 'has this frozen'.  
  Fix: Add a small last-updated timestamp or a brief pulse/spinner on refetch, even if subtle.

---

## 03 · Floor / spatial map

**Screens:** [tablet](screenshots/03-floor-tablet.png) · [phone](screenshots/03-floor-phone.png)


The default map view is a genuinely nice idea for a waiter-first app — pastel status tiles sized by seat count, a glanceable status-count summary, and a well-organized action sheet that fuses status-cycling with the running bill in one tap-target — and it mostly reads as premium rather than templated on tablet. But the phone layout is broken today (the page title is overlapped by the view-toggle control because the header's action cluster never wraps), the one-primary-CTA rule is undermined by the view toggle sharing the exact accent fill used for 'Add table', and the tile status colors are hardcoded literal Tailwind palette classes with dead `dark:` variants that will visibly clash once monokai/gruvbox themes are used — a direct violation of this repo's own non-negotiable token rule. On the completeness side, the screen is thinner than it needs to be for a live shift: reserved tables carry no reservation context, newly-added tables can vanish invisibly until someone enters Edit-layout, and there's no occupied-duration or server-assignment signal anywhere, all of which a host or manager would reach for constantly mid-service.


**What works**

- Variable tile sizing by seat count (h-14/h-16/h-20) gives an at-a-glance capacity cue without extra text, a nice information-density win for a busy floor.
- Status-count summary chips (Available/Occupied/Reserved) give a fast shift-level read of the room before scanning individual tiles.
- Table action sheet consolidates status-cycling and the running bill/order into one sheet, avoiding an extra navigation hop for the most common host action.
- Tile touch targets (56-80px) comfortably clear the 44px minimum, and the map/grid view toggle is a sensible affordance for different working styles.
- Serif title, cream canvas, soft borders/shadows and restrained color use read as intentional and reasonably premium on tablet, not generic AI-slop.
- Loading skeleton and zero-table EmptyState are both implemented, so the screen doesn't dead-end on first load or an empty venue.


**Findings**

- **🔴 Critical** · _design_ — **Phone: page title is visually overlapped/obscured by the view-toggle control**  
  Evidence: 03-floor-phone.png — the serif H1 'Floor' is clipped to 'Floo' with the 'r' hidden directly behind the orange/cream map-grid toggle button; all of the toggle, 'Edit layout', and '+ Add table' sit crammed into the same row as the title with no wrapping. Root cause in code: PageHeader (apps/web/src/components/ui/page-header.tsx) is `flex items-start justify-between` with the title wrapper `min-w-0` and the action wrapper `shrink-0`; on floor/index.tsx the action node always renders 3-4 controls (view toggle ×2, Edit layout, Add table) in one un-wrapped row. On a ~390px phone viewport that action cluster's natural width plus the title exceeds the container, and since 'Floor' is a single word it can't wrap, so it overflows visually into the shrink-0 action box instead of being clipped.  
  Fix: On narrow viewports, stack the header (title row, then a full-width action row below) or move secondary controls (view toggle, Edit layout) into an overflow/kebab menu on phone, keeping only 'Add table' inline with the title.
- **🟠 High** · _design_ — **Two accent-filled controls compete for primary-CTA attention**  
  Evidence: Both screenshots show the active 'map' view-toggle button rendered with the same `bg-accent text-accent-foreground` fill as the '+ Add table' button (floor/index.tsx lines ~450-466: `effectiveView === 'map' ? 'px-2.5 py-1.5 bg-accent text-accent-foreground' : ...`). Two solid rust-orange elements sit side by side in the header on both tablet and phone.  
  Fix: Give the selected segmented-toggle state a secondary treatment (e.g. `bg-muted text-foreground` or an outlined/underlined selected state) and reserve `bg-accent` exclusively for 'Add table', per the one-primary-CTA rule.
- **🟠 High** · _design_ — **Table-tile status colors are hardcoded literal palette values, not theme tokens**  
  Evidence: apps/web/src/routes/_app/floor/-floor-map.tsx STATUS_BG: `available: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'`, similarly sky/amber for occupied/reserved. This bypasses the 'zero literal palette values' mandate (docs/PRODUCT.md §2.2) entirely, and the `dark:` variants are dead code — the app switches themes via `data-theme` on `<html>`, never a `.dark` class (per CLAUDE.md). In monokai/gruvbox, every tile will keep these fixed light pastel fills against a dark canvas/card instead of adapting via `bg-success/emerald` etc. tokens the app already defines and uses elsewhere (StatusBadge uses `bg-success/12 text-success`).  
  Fix: Replace STATUS_BG with the same semantic tone tokens StatusBadge already uses, e.g. `bg-success/10 border-success/40`, `bg-info/10 border-info/40`, `bg-warning/10 border-warning/40`, and drop the `dark:` variants.
- **🟠 High** · _completeness_ — **Reserved tables carry zero reservation context anywhere on this screen**  
  Evidence: -table-action-sheet.tsx's only content for any table is a Status cycle (available/occupied/reserved) and the running bill/order — there is no party name, time, or guest count for a 'Reserved' table, and no link out to the separate Calendar module where reservations presumably live. 4 of 10 tables are 'Reserved' in the sample data with no way to see who or when from Floor.  
  Fix: Surface the linked reservation (time, party name, size) in the action sheet for reserved tables, with a deep link into Calendar/reservation detail.
- **🟠 High** · _completeness_ — **A newly-created table can be invisible on the map after using the one primary CTA**  
  Evidence: '+ Add table' (floor/index.tsx) creates a table via TableFormDialog with no posX/posY. In read-only map view, FloorMap only renders `placed` tables (`getPos(t) !== null`); unplaced tables only appear in the 'Unplaced' tray, which is gated behind `editMode` (-floor-map.tsx line 240). So tapping the screen's single primary action, saving, and closing the dialog updates the table count in the subtitle but shows nothing new on the canvas until staff separately enters Edit-layout mode and manually drags the tile in.  
  Fix: Either auto-drop new tables at a default/available canvas position, or show an explicit 'N tables not yet placed — Edit layout to add them' banner on the read-only map so the CTA doesn't feel like a dead end.
- **🟡 Medium** · _design_ — **Empty-label StatusBadge renders as an unlabeled colored bar on every tile**  
  Evidence: Tile component in -floor-map.tsx renders `<StatusBadge tone={...} label="" />` for every placed table. StatusBadge (components/ui/status.tsx) with no text still renders the full badge shell (`px-2 py-0.5` span), producing the small blank colored line visible under the seat count on every tile in both screenshots. It duplicates the color already conveyed by the tile's own border/fill and has no `aria-label`, so it adds no information to sighted or screen-reader users and reads like a stray/unfinished skeleton fragment rather than an intentional element.  
  Fix: Drop the empty badge from the tile (the border+fill already signals status), or give it a real accessible label (e.g. `aria-label={STATUS_LABELS[status]}`) if it's meant to be a discrete status chip.
- **🟡 Medium** · _design_ — **Status-count chips look like tappable filters but are inert**  
  Evidence: 'Available 5 / Occupied 1 / Reserved 4' (floor/index.tsx ~line 498) render as StatusBadge pills — same rounded, colored chip affordance used for interactive filter controls elsewhere in this design language — but carry no onClick/href. On a busy floor a host will likely tap 'Occupied 1' expecting the map to filter/highlight and nothing will happen.  
  Fix: Either wire these to filter/highlight the map (toggle dimming of non-matching tiles) or restyle them as plainly non-interactive text+dot summaries so they don't invite a tap.
- **🟡 Medium** · _design_ — **Tiles sit edge-to-edge with near-zero gap on phone, raising mis-tap risk**  
  Evidence: Tile pixel sizes are fixed (`h-14/h-16/h-20` = 56/64/80px, tileSizeClass in -floor-map.tsx) while position is percentage-of-canvas-width; on the narrower phone canvas (03-floor-phone.png) T1/T2 and T8/T9 borders touch directly with no visible buffer, versus a small but present gap on tablet. Each tile individually clears the 44px touch minimum, but two adjacent full-size touch targets with no separation is a real fat-finger risk during fast service.  
  Fix: Add a minimum rendered gap between tiles at small viewports (e.g. collision-nudge on layout save, or clamp effective tile size down slightly on narrow canvases) so neighboring tiles never touch.
- **🟡 Medium** · _completeness_ — **No occupied-since / turn-time signal anywhere on the floor map**  
  Evidence: Neither the tile (-floor-map.tsx Tile component) nor the action sheet header shows how long a table has been in its current status. 'Occupied 1' tells a manager a table is busy but not for how long — core information for managing table turns during service.  
  Fix: Show elapsed time since last status change on occupied tiles (e.g. a small duration label) and/or in the action sheet header.
- **🟡 Medium** · _completeness_ — **No assigned-server indicator on tiles or in the action sheet**  
  Evidence: For a stated 'waiter-first' app, nothing on the Floor screen shows which staff member owns a given table — not on the tile, not in TableActionSheet's status/order sections.  
  Fix: If server assignment exists elsewhere in the data model, surface an initials/avatar chip on the tile and in the action sheet; if it doesn't exist yet, flag as a likely near-term gap for real service use.
- **⚪ Low** · _completeness_ — **Map has no zones/sections and no merge/split path for large parties**  
  Evidence: The canvas (03-floor-tablet.png) is a single blank cream rectangle with floating tiles — no patio/bar/dining labels or landmarks, so it's a freeform position board rather than a true spatial floor plan. Table capacities range 2–10 with no action to combine two tables for an oversized party.  
  Fix: Lower priority for a 10-table venue; worth a zone-label/section-divider feature and a merge-tables action if the product targets larger multi-room venues.

---

## 04 · Order entry (POS)

**Screens:** [tablet](screenshots/04-order-tablet.png) · [phone](screenshots/04-order-phone.png)


Direct answer to the flagged question: starting blank is wrong. Table 6 has an in-progress order in the data, but -builder.tsx initializes `lines` to `[]` and never fetches or references any existing order for the selected table — the title reads 'New order' unconditionally and the table `<select>` gives zero signal that a table is already occupied. Whatever the intended model (one order per table vs. round-based tickets), the frontend currently can't tell the difference, which for a waiter mid-shift means either silently orphaning the in-progress ticket or firing a second, duplicate order to the kitchen for the same table. Beyond that core gap, the screen is a clean, competently built two-pane POS (grid + live ticket) with correct semantic-token usage, sensible line-merging, and good disabled-state messaging, but it has real gaps in touch-target sizing, failure feedback, and destructive-action confirmation that would surface fast in a live service.


**What works**

- Fire order button is correctly disabled until a table is selected and at least one line exists, with a clear inline hint ('Select a table to fire') rather than a silent dead button.
- Required modifier groups gate the Add-to-order button (disabled={!requiredSatisfied}) — can't add an incomplete configuration to the ticket.
- Identical item+modifier combinations merge into one line with an incremented quantity instead of duplicating rows in the ticket.
- Exactly one filled primary CTA on screen (Fire order); category pills, Add/Cancel, and the mobile Ticket button all use secondary/outline/tinted treatments, so the one-CTA rule is respected in practice.
- Genuine tablet vs. phone responsive strategy, not just a squeeze: tablet keeps a persistent two-pane grid+ticket layout; phone collapses to a 2-column grid with the ticket moved into a bottom Sheet behind a persistent 'Ticket' trigger — appropriate for one-handed use.
- Visual language (warm cream canvas, card treatment, spacing) is restrained and reads as a real product, not templated AI-slop — no gradients, no decorative icons, no raw hex in the reviewed source.


**Findings**

- **🔴 Critical** · _completeness_ — **Builder always starts blank, never loads the table's existing order**  
  Evidence: apps/web/src/routes/_app/order/-builder.tsx: `const [lines, setLines] = useState<LineItem[]>([])` with no query against the table's current order; only useOrderControllerCreate is wired up (no get/update-existing-order path). Both screenshots show the header 'New order' and Ticket 'No items yet' for Table 6 despite the task setup stating Table 6 already has an in-progress order, and the Table <select> shows table numbers only, with no occupied/order-count indicator, on tablet.  
  Fix: On open, look up whether the selected table has an open order; if so, load its existing lines into the builder (or clearly label the flow as 'Add to Table 6's order' vs 'New order') instead of always starting from empty state. At minimum, flag occupied tables in the table selector so a waiter can see before they start typing.
- **🟠 High** · _completeness_ — **Firing an order has no failure feedback**  
  Evidence: -builder.tsx handleFire(): `createOrder.mutate({...}, { onSuccess: () => {...} })` — no onError handler anywhere in the mutate call or component. If the POST fails, the button just stops showing 'Firing…' with zero toast/error message.  
  Fix: Add an onError handler that surfaces a visible error (toast/inline banner) and keeps the ticket lines intact so the waiter can retry, instead of failing silently.
- **🟠 High** · _design_ — **Closing the builder discards the whole ticket with no confirmation**  
  Evidence: -builder.tsx top bar: the X button calls `onClose` directly with no guard. Contrast with index.tsx's OrderCard.handleDelete, which uses `window.confirm('Delete order?')` before removing an order — the same app is inconsistent about protecting in-progress work.  
  Fix: Prompt for confirmation before closing when `lines.length > 0`, mirroring the confirm pattern already used for order deletion elsewhere in this feature.
- **🟠 High** · _design_ — **Several interactive controls are well under the 44px touch-target minimum**  
  Evidence: -ticket-panel.tsx: quantity stepper buttons are `h-5 w-5` (20px) and the remove/trash button is an icon (`h-3.5 w-3.5`) wrapped in only `p-0.5` (~18-20px hit area). -builder.tsx category filter pills use `px-3 py-1 text-xs` (roughly 26-28px tall). This is a tablet/phone-first app used by staff moving quickly during service.  
  Fix: Bump qty-stepper and remove-icon buttons to at least 44x44px hit areas (padding can be invisible/transparent beyond the visible icon), and increase category pill vertical padding to clear 44px.
- **🟡 Medium** · _design_ — **Hover-fill state makes the price unreadable on menu cards**  
  Evidence: Tablet screenshot: the 'Branzino al Forno' card is shown mid-hover with a solid rust (`bg-accent`) fill; its price '28.00' is barely visible against that fill. In -builder.tsx the card button has `hover:bg-accent hover:text-accent-foreground`, but the price `<p>` hardcodes `text-muted-foreground` (a color tuned for the cream card background), so the hover text-color intent never reaches it — reproducible on every card, every hover/press.  
  Fix: Either drop the explicit `text-muted-foreground` on the price when the parent is hovered (e.g. via a group-hover text color), or apply the hover fill only as a subtle border/ring instead of a full-bleed background swap.
- **🟡 Medium** · _completeness_ — **No currency symbol anywhere on prices or total**  
  Evidence: Every menu item price ('9.50', '28.00', '34.00'), every ticket line price, and 'Total 0.00' render as bare numbers in both the tablet and phone screenshots — no $/€/£ prefix or suffix visible anywhere on the screen.  
  Fix: Prefix prices with the venue's configured currency symbol (or at least a consistent one) so totals are unambiguous, especially important once split-bill/checkout (already built per recent commits) hands this same money off downstream.
- **🟡 Medium** · _completeness_ — **Per-item notes are modeled but never exposed in the UI**  
  Evidence: -ticket-panel.tsx `LineItem.notes` field exists and is sent to the backend in -builder.tsx handleFire (`notes: l.notes || null`), but no input anywhere in TicketPanel lets a waiter set it — only the order-level 'Order notes' field is rendered. The per-item notes capability is data-modeled but dead in the UI.  
  Fix: Add a small per-line notes affordance (e.g. tap-to-add note chip) so allergy/prep requests ('no onion', 'well done') can be attached to a specific item, not just the whole order.
- **⚪ Low** · _completeness_ — **No loading state while the builder's own data fetches**  
  Evidence: -builder.tsx destructures `tables = []`, `categories = []`, `menuItems = []`, `allGroups = []` from their respective hooks with no isLoading branch — unlike the kanban page (index.tsx) which renders `OrdersSkeleton` while orders load. On a slow connection the builder would show an empty grid with no skeleton/spinner.  
  Fix: Add a lightweight skeleton or spinner state for the menu grid while categories/items are loading, consistent with the pattern already used on the kanban page.
- **⚪ Low** · _completeness_ — **No menu search, only category pills**  
  Evidence: Both screenshots show ~20 items reachable only via 6 category pills plus scrolling; there is no text search/filter input in -builder.tsx.  
  Fix: For venues with larger menus, add a simple search box above the grid so a waiter can type a few letters instead of scrolling categories mid-service.

---

## 05 · Kitchen Display (KDS)

**Screens:** [tablet](screenshots/05-kds-tablet.png) · [phone](screenshots/05-kds-phone.png)


The KDS board has real design-system discipline — semantic tone tokens throughout (success/warning/destructive borders and badges via the shared Tone system), a considered warm-canvas serif/sans pairing that avoids generic AI-slop aesthetics, and thoughtful domain UX like dimming out-of-station items instead of hiding them. But it's not shift-ready: the tablet view (the primary target device) is paradoxically more cramped than the phone view because a fixed grid breakpoint squeezes a single ticket into a half-width column, the shared 'isBumping' flag freezes every button on the board during any single tap with no optimistic update, and there is no way to undo an accidental bump once made — three real, code-confirmed problems on the screen's core interaction loop. Secondary gaps (no audible alerts, no aggregate counts, no staleness indicator, sub-44px touch targets) are the kind of thing that will surface in week-one real service rather than in a demo.


**What works**

- Full semantic-token discipline in the route and status component: every tone (age border/badge escalation, active filter state) routes through bg-success/warning/destructive and the shared Tone system — no raw hex or palette classes found.
- Age-based border + badge escalation (neutral → warning → destructive past 5/10 minutes) gives at-a-glance triage without reading text.
- Station filter dims (not hides) items belonging to other stations, so a cook filtered to 'Grill' still sees full ticket context without being able to accidentally bump another station's item — a genuinely kitchen-aware interaction choice.
- Both loading (skeleton grid) and empty ('Kitchen's clear', with icon) states are explicitly designed, not afterthoughts.
- Serif display heading + clean card typography reads as a considered, on-brand look rather than generic template styling.
- The shell itself is responsive-aware: sidebar correctly collapses to a hamburger + icon-only header on the phone viewport.


**Findings**

- **🟠 High** · _design_ — **Tablet layout is more cramped than phone — contradicts the tablet-first mandate**  
  Evidence: TABLET screenshot: the single ticket card stops at roughly half the content area's width, leaving the entire right half of the screen as empty cream space, and every item name wraps to two lines ('1× Burrata &' / 'Prosciutto', '2× Branzino al' / 'Forno', '1× Risotto ai' / 'Funghi'). PHONE screenshot: the same card spans the full screen edge-to-edge and every item name fits on one line. Root cause in code (kds/index.tsx line 74/261): the board is a fixed `grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4` grid, so once the `sm` breakpoint is crossed a lone ticket is squeezed into one half-width column instead of taking the full row.  
  Fix: Size columns by content, not just breakpoint — use `grid-template-columns: repeat(auto-fill, minmax(340px, 1fr))` (or compute column count from `visibleTickets.length`) so a single ticket always fills available width and never wraps text it doesn't have to.
- **🟠 High** · _design_ — **One in-flight bump disables and appears to freeze the entire board**  
  Evidence: kds/index.tsx line 268 passes a single shared `isBumping={updateItemStatus.isPending}` to every `TicketCard`, and every item button is `disabled={isBumping}` (line 172). There's no optimistic update — `onSuccess` just invalidates the query (lines 209–211) — so the tapped item doesn't cross out until the refetch round-trips, and every other button on every other ticket is inert for that whole window.  
  Fix: Scope the pending flag per-item (track the mutating itemId, not a global boolean) and apply an optimistic update (flip the tapped item to ready immediately, roll back on error) so the rest of the board stays interactive and the tapped item gives instant feedback — this matters most on the flaky kitchen wifi this screen has to tolerate.
- **🟠 High** · _completeness_ — **No way to undo an accidental bump — dead end once an item is marked ready**  
  Evidence: kds/index.tsx line 126–144: once `item.status === 'ready'`, the row renders as a plain `<div>` (not a button) with strikethrough + checkmark — there is no tap target, no long-press, no 'undo' affordance anywhere on the card to send it back to pending.  
  Fix: Make the ready row tappable again to revert status (e.g. tap to un-bump within a short grace window, or a small undo icon), since mis-taps on a touch board under time pressure are routine and currently unrecoverable without a manager/FOH intervention.
- **🟡 Medium** · _design_ — **The bump button reads as a status label, not the action it performs**  
  Evidence: Pending items show a small bordered pill reading 'Ready' (line 186–188) as the tap target — visually identical in style to a status badge. But tapping it doesn't mean 'this is ready', it means 'mark this ready'. A cook glancing at the board could reasonably read the pill as already reporting the current state rather than as a call to action.  
  Fix: Use an unambiguous verb for the tappable state, e.g. 'Bump' or 'Mark ready', and/or give it a filled/button-like treatment (vs. the outlined badge look) so it's visually distinct from the crossed-out done state.
- **🟡 Medium** · _design_ — **Bump row and station-filter pills have no enforced minimum touch height**  
  Evidence: Item bump button is `px-2 py-1.5` around single-line `text-base` content (line 174) — roughly 36px tall with no `min-h`. Station filter pills are `px-4 py-1.5 text-sm` (line 240) — roughly 32px tall, also no `min-h`. Both fall short of the 44px touch-target minimum this app's own tablet/phone-first mandate calls for, and the bump button is the single most frequently repeated tap on this screen.  
  Fix: Add `min-h-11` (44px) to both the per-item bump row and the station filter buttons.
- **🟡 Medium** · _completeness_ — **No audible or attention-grabbing alert for new or aging tickets**  
  Evidence: The board relies solely on a silent 6s poll (`refetchInterval: 6_000`, line 204) plus a color-coded border/badge (success → warning → destructive past 5/10 min, lines 47–58). Nothing plays a sound or otherwise interrupts when a new ticket fires or an existing one crosses the destructive threshold.  
  Fix: Add an audible chime on new-ticket arrival and/or when a ticket crosses the destructive age threshold — kitchen staff are rarely staring at the screen continuously.
- **🟡 Medium** · _completeness_ — **No aggregate view — can't gauge overall load at a glance**  
  Evidence: The board only ever renders individual ticket cards; there's no count of open tickets per station, no total-items-in-flight, no average ticket age. A kitchen lead has to count cards manually to gauge how backed up a station is.  
  Fix: Add a lightweight summary strip (e.g. ticket count and oldest-ticket age per station tab) above or within the filter row.
- **🟡 Medium** · _completeness_ — **No staleness/connectivity indicator if polling fails mid-shift**  
  Evidence: `isLoading` (line 203, 252) only covers the very first fetch; there's no UI state for a failed or stalled refetch after that, so if the 6s poll starts failing (wifi drop, API hiccup) the board just silently stops updating with no visual cue that data may be stale.  
  Fix: Surface `isError`/`dataUpdatedAt` from the query — a small 'last updated Xs ago' or an offline banner when a refetch fails — so staff know to check the connection rather than trust a frozen board.
- **⚪ Low** · _design_ — **Bump pill misaligns on two-line wrapped item names**  
  Evidence: TABLET screenshot: 'Burrata & Prosciutto' wraps to two lines, but the adjacent 'Ready' pill (items-start, line 174) stays pinned to the first line only, leaving the second line ('Prosciutto') floating with nothing beside it.  
  Fix: Vertically center the pill against the full name block (`items-center` on the row, or center the badge within its own flex column) so it doesn't visually orphan on wrapped names — this also becomes moot if the grid-width fix above stops the wrapping.
- **⚪ Low** · _design_ — **Full app sidebar competes for space on what's typically a kiosk-mounted screen**  
  Evidence: TABLET screenshot: the full Service/Floor/Order/Door/Checkout/Menu/Inventory/Reports/Calendar/Settings nav occupies roughly a third of the screen width even on the KDS route, which in most venues runs on a dedicated wall/counter-mounted display rather than as one tab among many.  
  Fix: Consider a focused/kiosk layout option for KDS (collapsed or hidden sidebar) if this screen is expected to run unattended on a mounted display; low priority if it's always accessed through the shared shell on a handheld tablet.
- **⚪ Low** · _completeness_ — **No course, seat, or rush/allergy flags on tickets**  
  Evidence: The ticket model rendered here only exposes table number, fired-at time, and item name/quantity/modifiers (KdsTicketItem/KdsTicket types, lines 83–97) — no course or seat number, no rush/VIP/allergy tagging.  
  Fix: Lower priority than the items above, but worth a product decision: if multi-course pacing or allergy visibility matters for this venue, it needs a data model addition, not just a UI tweak.

---

## 06 · Door / Host

**Screens:** [tablet](screenshots/06-door-tablet.png) · [phone](screenshots/06-door-phone.png)


The tablet layout is clean, on-token, and follows the one-CTA rule, but the screen does far too little for a real host stand: three reservations occupy the top ~25% of the viewport and the rest is bare canvas, with no search/lookup, no walk-in flow, and no table-assignment affordance from the list itself; reservation status is entirely inferred client-side from clock math rather than a real lifecycle. On phone the guest name and contact/table subtitle are completely squeezed out of the row — the exact information a host needs to greet a guest by name is invisible on the device hosts actually carry, which is a functional break, not just a polish gap.


**What works**

- Tablet view respects the one-primary-CTA rule cleanly: single accent 'Add reservation' button top-right, everything else (edit/delete icons, tab pills) is secondary/ghost.
- Semantic token discipline looks correct end-to-end: StatusBadge tones map to bg-success/bg-info/bg-warning/bg-destructive with /12 opacity tints (verified in status.tsx), no raw hex spotted in either screenshot.
- Serif display heading + warm cream canvas gives the 'Door' title real hierarchy and matches the stated warm-canvas theme direction, reads more premium than a generic admin table.
- Today / This Week / All segmented control is a sensible, low-chrome way to scope a host's view without a separate filter panel or date picker.
- Avatar initials (BC, J&, TO) are a nice touch for fast visual scanning of a reservation book.
- Edit and delete icon buttons are reasonably sized ghost-variant controls, and delete is gated by a native confirm rather than firing silently.


**Findings**

- **🔴 Critical** · _design_ — **Guest name and contact info disappear entirely on phone**  
  Evidence: In 06-door-phone.png every row shows only avatar initials, party-size icon+count, date/time, status pill, and the two icon buttons — the ListRow title (guest name, e.g. 'Becker Corp...') and subtitle (email/table) are completely absent, not just truncated. list-row.tsx puts title/subtitle in a `min-w-0 flex-1` column while leading, meta, and action are all `shrink-0`; on a ~390px viewport the shrink-0 meta cluster (person-icon+count, full date string, status badge) plus two icon buttons exceeds available width, so the flex-1 column collapses to ~0px and the truncated text renders invisible.  
  Fix: On narrow viewports, stack the row: name+status on line 1, party/time/table as a secondary line 2 beneath it, and drop or icon-only the date/party into that second line instead of forcing everything into one nowrap row. At minimum, mark date/party-size as droppable/abbreviated before the guest name so the name is never the thing sacrificed.
- **🟠 High** · _completeness_ — **No way to identify or search a guest already in view — every action requires opening the edit sheet**  
  Evidence: Route source shows the row has no expand/detail affordance beyond the pencil (edit) icon; there's no tap-to-expand, no phone/email quick actions (call/email icons), and truncated fields ('events@beckergr...', 'Becker Corp...') have no way to see the full value short of opening the full edit form.  
  Fix: Add a tap target on the row (not just the pencil) that opens a read-only detail view or expands the row, and surface full guest name/contact somewhere reachable without entering edit mode.
- **🟠 High** · _completeness_ — **No seat/arrival action from the list — a host can't mark a party as seated or a no-show from Door**  
  Evidence: deriveStatus() computes 'seated' purely from a time-window heuristic (`diffMins < 30 && diffMins > -120`) with no backing field on ReservationDto and no UI control to set it; there is no 'Seat now', 'No-show', or 'Cancel' action in ListRow's `action` slot, only Edit and Delete.  
  Fix: Add explicit host actions (Seat / No-show / Cancel) that write real status, and stop deriving a guest's seated state from wall-clock math — it will silently mislabel a table if turnover runs long or a guest is early/late outside the hardcoded window.
- **🟠 High** · _completeness_ — **No walk-in path and no table-conflict feedback in the reservation form**  
  Evidence: The only entry point is 'Add reservation' which opens the full ReservationForm requiring name, party size, table, and date/time all as a multi-field sheet; there's no 'walk-in' shortcut, and the table `<select>` has no indication of which tables are already booked or occupied at the requested time (no conflict warning), so a host could double-book a table blind.  
  Fix: Add a quick walk-in action (skip date/time, default to now), and filter or flag tables already reserved/occupied at the selected time in the table dropdown.
- **🟡 Medium** · _design_ — **Cavernous unused canvas below the list on tablet**  
  Evidence: In 06-door-tablet.png the reservation card ends around y=760 out of a 2048px-tall viewport — roughly 3/4 of the screen is flat empty cream background with nothing: no upcoming-reservation preview, no floor/table availability glance, no stats (covers booked, no-show rate).  
  Fix: Use the reclaimed space for a host-relevant secondary panel — e.g. a compact floor-availability strip or 'next up' countdown — rather than leaving a mostly-empty page on the primary device size this app targets.
- **🟡 Medium** · _design_ — **Name/email truncation is unnecessarily aggressive even on tablet where space is available**  
  Evidence: On tablet, 'Becker Corp...' and 'events@beckergr...' both truncate hard well before the meta/status column begins — there is a visible gap of blank space between the truncated subtitle and the party/date/status cluster (e.g. row 1 in 06-door-tablet.png), meaning the truncate width isn't actually constrained by real content collision, just a narrow flex-basis.  
  Fix: Let the title/subtitle column claim more of the available width before meta kicks in (e.g. give meta a max-content width instead of an oversized gap, or right-align meta in a narrower fixed column) so guest names aren't clipped when there's clearly room.
- **🟡 Medium** · _completeness_ — **'This Week' and 'All' tabs have no visible loading/empty differentiation shown, and 'All' has no date grouping**  
  Evidence: Route code confirms three tab panels share one ReservationList with only copy differences; 'All' shows every reservation ever created in one flat list with no date-section headers (e.g. 'Today', 'Tomorrow', 'Jul 15'), so as bookings accumulate over weeks the All tab becomes an unsorted, unscannable wall of rows.  
  Fix: Group the 'All' (and arguably 'This Week') list by date with sticky section headers rather than one flat list.
- **⚪ Low** · _design_ — **Status badge is always green 'Confirmed' in both screenshots, so the multi-tone status system is unverified visually**  
  Evidence: All 3 seed rows in both screenshots show 'Confirmed' (success/green); pending (warning), seated (info), and cancelled (destructive) tones defined in STATUS_TONE are never exercised in the captured states.  
  Fix: Not a bug, but worth a follow-up screenshot pass with a pending/unassigned-table and a same-day-soon reservation to confirm the warning/info tones read correctly against the warm-cream canvas.

---

## 07 · Checkout / split bill

**Screens:** [tablet](screenshots/07-checkout-tablet.png) · [phone](screenshots/07-checkout-phone.png)


Both the tablet and phone screenshots only capture the unselected list state — 'Ready for checkout' queue plus the 'Select a check to settle' empty panel — so none of this screen's actual purpose (creating a bill, splitting it, printing a receipt) is directly visible in the provided images; those flows are assessed from apps/web/src/routes/_app/checkout/-split-panel.tsx, -split-controls.tsx, -split-row.tsx, and -receipt-block.tsx plus the NestJS billing service, and each finding below says explicitly whether it's screenshot-visible or source-derived. What is visible reads clean and on-brand: warm cream canvas, serif page title, consistent status-tone badges, disciplined token usage. But the deeper dive surfaces one critical money-safety bug (the full-payment path doesn't satisfy the split panel's own 'settled' check, so both UIs can be active simultaneously), a high-severity data-lifecycle gap (paid orders have no terminal status and never leave the queue), and a responsive-design miss squarely inside this app's stated tablet/phone-first mandate (the two-pane layout requires a 1024px+ desktop breakpoint that the actual tablet screenshot — a 768px-wide portrait iPad — never reaches, with no scroll-into-view to compensate). Touch targets throughout (Settle, stepper, payment-method selects) sit at 28px, well under guideline, and the queue row's cursor-pointer styling promises a tap target the row doesn't actually provide. This is a screen with good bones and real craft in the math/print/empty-state details, but it has not yet been exercised end-to-end on the devices it's meant for, and the settlement-state bug would be a real incident on a live floor.


**What works**

- Zero raw palette/hex usage found in any of the five checkout component files — every surface, border, and status color goes through semantic tokens (bg-card, bg-muted, text-muted-foreground, bg-success/10, text-destructive, border-border).
- evenShares() cents-rounds and hands the rounding remainder to the last share, so an even split always sums back to the bill total exactly — the classic 'splits are off by a cent' bug is deliberately avoided.
- Print isolation for the receipt is handled with a scoped #receipt visibility toggle + .no-print class (SplitPanel's inline <style>) — no separate print route or extra dependency, and it only hides chrome instead of trying to re-lay the whole page out.
- Both a loading skeleton (three shimmer rows) and two distinct, purpose-written empty states ('No orders ready for checkout' vs 'Select a check to settle') are implemented rather than a generic spinner or blank panel.
- Small but real accessibility touches: aria-label on the icon-only stepper +/- buttons, and a properly wired <label htmlFor="discount-pct"> on the discount input.
- Status badges (Ready/Served/In progress) route through one consistent tone system (success/warning/neutral) instead of ad hoc per-screen colors.


**Findings**

- **🔴 Critical** · _completeness_ — **"Mark as Paid" and the split-payment panel are two contradictory settlement UIs shown at once, and the first doesn't satisfy the second**  
  Evidence: Source-only (not visible in either screenshot, since neither shows a selected/billed order). In apps/web/.../checkout/index.tsx lines 340-364, once a bill exists BillResult (full 'Mark as Paid' button) and SplitPanel (split-into-N, per-split 'Record payment') render together with no explanation of how they relate. Verified in apps/api/src/billing/billing.service.ts: pay() (line 80-90) only sets `bill.paid = true` — it never creates a Payment row and never touches amountPaid/remaining. findOne() (lines 75-77) derives `remaining = total - amountPaid`, where amountPaid is summed from actual Payment records. So after tapping 'Mark as Paid', remaining is still equal to the full total. SplitPanel's own gate `isSettled = remaining === 0` (-split-panel.tsx line 65) stays false, so the split UI keeps rendering fully live — mode toggle, share stepper, 'Record payment' buttons — directly under a green 'Paid' checkmark. A waiter can then record additional split payments on a bill the UI just told them was paid.  
  Fix: Pick one settlement model as canonical for a given bill, or make pay() authoritative: have it either write a Payment covering the full remaining amount, or have the UI hide/disable SplitPanel entirely once bill.paid is true instead of relying on the remaining===0 side effect. At minimum, gate SplitPanel's render on `!bill.paid`, not just `remaining !== 0`.
- **🟠 High** · _completeness_ — **Paid orders have no terminal status, so settled tables never leave the checkout queue**  
  Evidence: Source-only. prisma/schema.prisma OrderStatus enum (lines 280-286) is `draft | sent | in_progress | ready | served` — there is no paid/closed/settled value. billing.service.ts pay() and recordPayment() (lines 80-118) only ever update the Bill/Payment tables, never `order.status`. index.tsx's queue filter is `BILLABLE_STATUSES = served | ready | in_progress` (line 29). A fully paid, receipt-printed order therefore keeps matching that filter and stays in 'Ready for checkout' indefinitely.  
  Fix: Add a terminal OrderStatus (e.g. `closed`) set by pay()/recordPayment() once remaining hits 0, and exclude it from BILLABLE_STATUSES — otherwise the queue only grows for the rest of the shift and a manager can no longer tell open tables from closed ones.
- **🟠 High** · _design_ — **Queue + detail split-view never engages on the actual tablet screenshot; selecting an order gives no visible feedback**  
  Evidence: Screenshot-visible + source-derived. The tablet screenshot is 1536×2048px, i.e. a 768×1024 CSS-px portrait iPad — the layout wrapper is `grid gap-6 lg:grid-cols-[1fr_380px]` (index.tsx line 294), and Tailwind's `lg:` only activates at 1024px+. At 768px CSS width the grid never splits into two columns; both screenshots show the queue card and the (empty) detail panel stacked full-width, one above the other, confirming this. There is no `scrollIntoView` anywhere in the checkout route files (grepped index.tsx, -split-panel.tsx, -split-row.tsx, -split-controls.tsx, -receipt-block.tsx — zero hits). On a queue longer than a screenful, tapping 'Settle' replaces an off-screen empty state with an off-screen bill panel — nothing visibly changes above the fold.  
  Fix: Lower the split-view breakpoint to `md:` (or design a dedicated stacked-portrait pattern), and add `scrollIntoView({behavior:'smooth'})` (or push a mobile-style detail route) when selectOrder() fires, so tapping Settle visibly does something on the device this app is built for.
- **🟠 High** · _design_ — **Every actionable control on this screen is under the touch-target minimum, and the queue rows waste the touch area they do have**  
  Evidence: Source-derived (button.tsx/select.tsx sizing) + corroborated by both screenshots showing visibly small pill buttons. Settle/Cancel row buttons use `size="sm"` → `h-7` = 28px (button.tsx line 26). The split-count stepper +/- buttons are hardcoded `h-7 w-7` = 28px squares (-split-controls.tsx lines 82-95). Every Select trigger used here (payment method in SplitRow, split-assignment in by-item mode) is also `size="sm"` → `h-7` = 28px (select.tsx line 42). None reach the ~44px guideline for touch. Compounding this: CheckoutRow's ListRow wrapper carries `cursor-pointer` styling (index.tsx line 66-69) but ListRow (list-row.tsx) accepts no onClick at all — the row itself is inert, so the whole ~60px-tall row (per ListRow's `py-3` padding) is dead space except for the 28px Settle button nested inside it.  
  Fix: Bump interactive controls used in checkout to the default/lg Button and Select sizes (32-36px) at minimum, ideally 44px for the primary Settle action, and make the entire ListRow tappable (wire onClick through to onSelect) instead of only its small trailing button — drop the misleading `cursor-pointer` or make it real.
- **🟡 Medium** · _completeness_ — **Switching to a different order mid-split silently abandons the in-progress bill view with no warning**  
  Evidence: Source-only. `selectOrder()` in index.tsx (lines 244-253): if the tapped order differs from the current selection it does `setSelectedOrderId(newId); setActiveBillId(null)` unconditionally — there's no check for whether the currently active bill still has `remaining > 0`. A waiter mid-split-payment on Table 8 who taps Table 3 in the queue loses the split view for Table 8 with zero confirmation; the underlying payments are safe server-side, but nothing in the UI tells the waiter that, and they have no fast way back other than re-tapping the original row.  
  Fix: Guard the deselect/switch path: if the active bill has `remaining > 0`, show a lightweight confirm ('Table 8 still has $X remaining — leave anyway?') before switching selection.
- **🟡 Medium** · _completeness_ — **Queue rows surface no bill amount, and there's no way to search/sort/prioritize at real dinner-rush scale**  
  Evidence: Screenshot-visible: both shots show only table label, item count ('2 items' / '7 items'), and a status badge per row — no dollar amount anywhere in the list. Only 3 demo rows are shown; the component maps `billableOrders` with no sort, search input, or filter (index.tsx lines 303-316).  
  Fix: Surface an estimated total per row (even a rough subtotal from order.items) so a manager can eyeball outstanding revenue, and add a simple sort (oldest/longest-waiting first) or table-number filter once the list realistically holds 10+ concurrent checkouts.
- **⚪ Low** · _design_ — **Discount % field has no client-side range clamp**  
  Evidence: Source-only. The input has HTML `min={0} max={100}` (index.tsx lines 133-134), which only affects the native spinner arrows, not typed input. `onDiscountChange` stores the raw string with no clamp, and `handleCreateBill` sends `Number(discountPct) || 0` straight through — a typed '-20' or '500' hits the API with no inline validation or error shown before submit.  
  Fix: Clamp the value on change (Math.min(100, Math.max(0, n))) and show inline validation text rather than relying entirely on server-side rejection.
- **⚪ Low** · _design_ — **CTA buttons on this screen default to `bg-primary`, which only equals the accent token in 2 of 4 themes**  
  Evidence: Source-only, not visible in the provided (default-theme) screenshots since neither shows Create Bill/Mark as Paid/Print receipt rendered. Button's default variant is `bg-primary` (button.tsx line 11), used unstyled for Create Bill, Mark as Paid, and Print receipt. In apps/web/src/index.css, `--primary` and `--accent` are identical in the default theme (#c2562f/#c2562f) but diverge in monokai (#f8f8f2 vs #fd971f) and gruvbox (#ebdbb2 vs #fe8019) — so in those themes these CTAs would render off-brand, not in the mandated accent color.  
  Fix: Point checkout's primary actions at an explicit accent-styled variant rather than the Button default, so the 'one accent CTA' rule holds across all three themes, not just the default cream one.

---

## 08 · Menu management

**Screens:** [tablet](screenshots/08-menu-tablet.png) · [phone](screenshots/08-menu-phone.png)


Visually the Menu screen is one of the more resolved screens in the revamp: warm cream canvas, a serif display heading, consistent card radii/shadows, strict semantic-token discipline (no raw hex or bg-white/zinc-* found in the file), thoughtful empty/loading states for every list, a confirm-before-delete guard, and a nicely authentic '86'd' label instead of a generic 'inactive' badge. The core weakness is that its touch-first mandate isn't actually honored at the interaction layer: category edit/delete affordances are hover-only and thus invisible on a tablet/phone, the screen's single CTA and every icon-button are sized well under the 44px minimum, and the categories-above-items stacked layout (triggered because the split only kicks in at `lg`/1024px) buries almost the entire item grid below the fold on both captured viewports. It reads as a competent, on-brand build that hasn't yet been touch-tested — the polish is real, but the primary interaction model for its stated audience (waiters/managers on tablets) is only partially wired up.


**What works**

- Strict semantic-token discipline: bg-card/bg-background/border-border/text-muted-foreground/bg-success/bg-destructive used throughout, zero raw hex or bg-white/zinc-* found in the route file
- Full loading-skeleton and empty-state coverage for categories, items, and modifier groups (not an afterthought)
- Confirm-before-delete dialog guards both category and item deletion from accidental taps
- Domain-authentic microcopy — '86'd' badge for unavailable items instead of a generic label
- Category item-counts as pill badges and a consistent card grid give a clean, scannable structure
- Structurally only one filled/primary-styled button appears per tab (Add item / New group), respecting the one-CTA rule at the component level even though its token is wrong


**Findings**

- **🔴 Critical** · _design_ — **Category edit/delete controls are hover-only — unreachable by touch**  
  Evidence: Tablet screenshot (768x1024 logical / 1536x2048 capture): the 'Desserts' category row shows pencil and trash icons, but every sibling row (Starters, Pasta & Risotto, etc.) shows none — because the source wraps them in `hidden group-hover:flex` (apps/web/src/routes/_app/menu/index.tsx:918) with 24px `icon-xs` buttons. Same forced-hover row appears identically in the phone capture. There is no `:hover` state on a touchscreen, so on the app's primary device class a waiter/manager has no way at all to open the edit dialog or delete a category — the affordance literally never renders.  
  Fix: Make category row actions always-visible (as item cards already do), sized to at least 44x44px, e.g. reuse the ItemCard pattern of a persistent icon-button pair instead of group-hover reveal.
- **🟠 High** · _design_ — **The screen's one primary CTA uses the wrong token and fails the touch-target minimum**  
  Evidence: Both screenshots show 'Add item' / 'New group' as the only filled button on the screen. It's rendered via the shared `<Button>` (no variant/size override, apps/web/src/routes/_app/menu/index.tsx:827,832), whose 'default' variant is `bg-primary text-primary-foreground` (button.tsx:11) and 'default' size is `h-8` (32px, button.tsx:23-24) — not the documented `bg-accent text-accent-foreground` CTA token, and 12px under the 44px touch minimum. It only reads as 'accent orange' because `--primary` and `--accent` happen to coincide in the default theme (apps/web/src/index.css:81,87); in monokai `--primary:#f8f8f2` vs `--accent:#fd971f` and in gruvbox `--primary:#ebdbb2` vs `--accent:#fe8019` — so in 2 of 4 themes this 'primary CTA' would render pale/cream instead of accent-colored.  
  Fix: Give the Add item/New group buttons an accent-token variant and size='lg' (or a dedicated touch-safe size), matching the documented CTA spec rather than the generic shadcn default.
- **🟠 High** · _design_ — **Item card edit/delete/availability controls are cramped, undersized, and visually identical at rest**  
  Evidence: Tablet screenshot bottom row of each item card: the 'Available' pill, pencil (edit) and trash (delete) icons sit in one row with `gap-0.5` (2px) and `icon-sm` buttons (28px, button.tsx:31-32) — all well under the 44px target. Delete only turns red via `hover:text-destructive` (index.tsx:712), which never fires on touch, so at rest Edit and Delete are the same muted-gray icon separated by 2px of dead space next to a destructive action.  
  Fix: Increase hit area to >=44px, add a permanent (not hover-only) destructive tint to the delete icon, and add more horizontal separation or a divider before the delete control.
- **🟡 Medium** · _design_ — **Categories panel eats the entire first screen on tablet and phone before any item appears**  
  Evidence: The Items-tab layout is `flex-col lg:flex-row` (index.tsx:870), so it only goes side-by-side at >=1024px CSS width. At the tablet capture (1536x2048 @2x = 768 CSS px, below `lg`) the Categories card (header + 6 rows + Add Category) fills essentially the whole viewport, leaving room for only ~2 rows of item cards (Bruschetta...Zuppa) with a 3rd row clipped — 6 of 20 items visible after already scrolling past the full category list. On the phone capture the same stack consumes the entire 780x1688 viewport and only 2 of 20 items are even partially visible.  
  Fix: Drop the split-layout breakpoint to `md` (768px) so tablet gets the two-pane view, and/or collapse categories into a horizontal scrollable chip row on narrower viewports instead of a tall vertical list.
- **🟡 Medium** · _completeness_ — **No station or modifier-group indicator on the item card**  
  Evidence: The ItemSheet lets you assign a kitchen `station` (grill/cold/bar/pass, index.tsx:594-608) and attach modifier groups, but ItemCard (index.tsx:654-720) renders only name/price/description/available — nothing shows which station an item routes to or how many modifiers it has. A manager scanning the 20-item grid in the tablet screenshot can't verify KDS routing or modifier setup without opening every item individually.  
  Fix: Add a small station chip and modifier-count badge to the card footer, next to the Available pill.
- **⚪ Low** · _completeness_ — **No search/filter on the item list**  
  Evidence: Both screenshots show only a category filter (sidebar list with counts) and no search input, unlike the Inventory screen's 'Search items...' box seen in the same review set. At 20 items this is fine, but there's no way to find an item by name once the menu grows.  
  Fix: Add a search box above the item grid, consistent with the Inventory screen pattern already in the codebase.
- **⚪ Low** · _completeness_ — **Category reordering requires typing a raw sort-order integer**  
  Evidence: CategoryDialog (index.tsx:148-160) exposes a numeric 'Sort order' input as the only way to reorder categories — no drag handle or up/down control, on a touch-first app where dragging a category chip would be the natural interaction.  
  Fix: Replace with drag-to-reorder in the category list, or at minimum up/down arrow buttons.
- **⚪ Low** · _completeness_ — **Can't create a modifier group from inside the item editor**  
  Evidence: ItemSheet's modifier section (index.tsx:610-630) only lists and checks existing groups fetched via useMenuControllerGetModifierGroups — there's no inline 'New group' action, so adding an item that needs a not-yet-created modifier group forces the user to cancel, switch to the Modifiers tab, create it, then reopen the item sheet.  
  Fix: Add a small '+ New group' link inside the modifier picker that opens ModifierGroupSheet without leaving the item form.

---

## 09 · Inventory

**Screens:** [tablet](screenshots/09-inventory-tablet.png) · [phone](screenshots/09-inventory-phone.png)


The inventory list is legible, correctly tokenized (bg-card/bg-muted/text-muted-foreground throughout, single bg-accent CTA on 'Add item'), and reads as calm and premium on tablet thanks to the serif page title and warm-cream palette — clearly not a generic gray admin table. But it breaks on the device class the product brief calls out first: on phone the table clips Status and Actions off the right edge of the viewport with zero scroll affordance, so editing or deleting an item is impossible without accidentally discovering horizontal scroll. Even on tablet, the interactive controls (edit/delete icon buttons, the click-to-adjust stock number) are 26–32px targets, well under the 44px touch minimum this app's own review criteria demand, and the delete action drops out of the design system entirely into a native browser confirm() popup. The screen is functional and good-looking at a glance but under-built for its stated primary use case (staff on tablets/phones mid-shift).


**What works**

- Exactly one primary CTA (bg-accent 'Add item') on both viewports — correct adherence to the one-CTA rule.
- Zero raw hex/palette classes in the row/table markup — bg-muted/40, text-muted-foreground, text-warning, text-destructive used correctly throughout inventory-index.tsx.
- EmptyState component is properly wired with distinct copy for 'no items yet' vs 'no items match your search' rather than one generic blank message.
- Serif display type on the 'Inventory' H1 plus the warm-cream surface gives the screen an editorial, non-templated feel that reads as premium rather than 'AI slop'.
- The click-to-adjust stock quantity (opens a themed modal capturing delta + reason) is a genuinely nice workflow idea — avoids a full edit-form round trip just to log a delivery or waste event.
- Responsive column-hiding for Par/Unit (`hidden sm:table-cell`) correctly declutters the table at narrower widths, and does so cleanly on the tablet capture with no layout shift.


**Findings**

- **🔴 Critical** · _design_ — **Table content is clipped off-screen on phone with no scroll affordance**  
  Evidence: Phone screenshot (390pt-equivalent viewport): the table shows only Item and Stock in full; the Status header is at the very edge and Actions is cut down to a sliver of the letter 'A', with the whole table's right border hard-clipped at the viewport edge — no scrollbar, no fade, no 'swipe for more' cue. Source confirms why: the table wrapper at index.tsx line ~283 (`<div className="rounded-lg border">`) has no `overflow-x-auto`, and only Par/Unit carry `hidden sm:table-cell` — Status and Actions have no responsive treatment at all, so they simply overflow the viewport.  
  Fix: Wrap the table in `overflow-x-auto` at minimum so the cut-off columns are swipeable, but better: collapse to a card/list layout below `sm` (name + stock prominent, status badge inline, edit/delete as a single overflow menu button) so phone users never need horizontal scroll to manage stock.
- **🟠 High** · _design_ — **Row action and stock-adjust touch targets are roughly half the 44px minimum**  
  Evidence: Edit/Delete buttons (index.tsx lines 345–363): raw `<button>` with `p-1.5` (6px) padding around a `h-3.5 w-3.5` (14px) Lucide icon → ~26px hit target. The stock-quantity adjust button (lines 324–331) uses `px-1.5 py-0.5` around text-sm — roughly 24px tall. Even the shared Button component's default size is `h-8` (32px, button.tsx line 24), so the single 'Add item' CTA itself sits under the 44px bar.  
  Fix: Bump row-action buttons to the existing `icon-sm` (28px) or better a new `icon` variant sized to 44px for touch contexts, and give the stock-adjust control real padding (e.g. `px-3 py-2`) so it's a comfortably tappable chip, not a text clip.
- **🟠 High** · _design_ — **Delete confirmation drops out of the design system into a native browser dialog**  
  Evidence: index.tsx line 356: `window.confirm(`Delete "${item.name}"?`) && deleteItem.mutate(...)`. This renders the OS's unstyled confirm popup — no theme, no warm-cream surface, no Lucide iconography — directly contradicting the polish of the adjacent AdjustDialog (lines 128–198) which IS a properly themed modal in the same file. PRODUCT.md §5.3 explicitly lists a Dialog component as 'Needed by: Delete confirmations', so this wasn't an oversight of scope — it just wasn't used here.  
  Fix: Reuse the same modal pattern as AdjustDialog (or the shadcn Dialog already scoped for this) for delete confirmation instead of window.confirm().
- **🟡 Medium** · _design_ — **Status column renders completely blank for every row in both screenshots**  
  Evidence: All 10 seeded items in both the tablet and phone captures have stock well above par (e.g. 00 Flour 25 vs par 5, Eggs 120 vs par 24), so `isOut`/`isLow` are false for every row and the Status cell is empty for all 10/10 rows. There is no 'in stock/OK' badge — only the exception states have any visual representation (lines 339–342).  
  Fix: Either seed at least one low/out-of-stock demo row so the column's purpose is visible in review artifacts, or add a quiet 'OK' state badge (e.g. `bg-success/10 text-success` dot + label) so an all-empty column doesn't read as broken when nothing is exception-flagged.
- **🟡 Medium** · _design_ — **Stock number's click-to-adjust interaction has no discoverable affordance**  
  Evidence: index.tsx lines 324–331: the only signal that '25' or '8' is clickable is a `title` attribute tooltip and a `hover:bg-accent` background — neither works on a touch device (no hover, no long-press tooltip). Visually in both screenshots the quantity renders as plain monospace text indistinguishable from a static number.  
  Fix: Add a persistent visual cue for a tappable numeric cell — a subtle underline, a small pencil/adjust icon inline, or a bordered chip — so touch users know it opens the adjust dialog without trial-and-error tapping.
- **🟡 Medium** · _completeness_ — **Loading state is a bare text line, not a skeleton**  
  Evidence: index.tsx line 231: `if (isLoading) return <div className="text-muted-foreground p-6 text-sm">Loading…</div>;` — no layout-matching skeleton, despite PRODUCT.md §5.3 reserving a Skeleton component specifically for 'Loading states'.  
  Fix: Swap in a skeleton table (header + a few shimmering rows) matching the real layout so the screen doesn't flash from bare text to a full table.
- **⚪ Low** · _design_ — **Modal backdrop uses a literal color instead of a semantic token**  
  Evidence: AdjustDialog line 149: `<div className="fixed inset-0 bg-black/40" onClick={onClose} />` — a hard-coded black value, which is a literal palette value under the repo's own 'zero literal palette values anywhere' rule (PRODUCT.md §2.2).  
  Fix: Introduce (or reuse if one exists) a semantic overlay token, e.g. `bg-foreground/40`, so scrims stay theme-aware across monokai/gruvbox instead of a fixed black.
- **⚪ Low** · _completeness_ — **Create/Edit forms use raw HTML inputs/selects, not the app's shadcn form components**  
  Evidence: InventoryForm (lines 43–124) hand-rolls `<input>`/`<select>` with inline Tailwind instead of the shadcn Input/Select the design system doc calls out as needed for 'all forms' (PRODUCT.md §5.3). Not visible in either provided screenshot since the form wasn't opened for capture, so this is a source-level flag, not a confirmed visual defect.  
  Fix: Swap in the shared Input/Select components once added, both for visual consistency and to avoid native `<select>` chrome clashing with the warm-cream theme on mobile Safari/Chrome.
- **⚪ Low** · _completeness_ — **No way to filter to 'low stock only' from the list**  
  Evidence: The header computes and displays `{lowStockCount} low stock` as a static text summary (lines 225, 240–242) but it isn't a clickable filter — the only filtering mechanism on the page is the free-text name search (lines 262–271). With only 10 seeded rows this isn't yet painful, but a manager triaging a real multi-dozen-SKU list mid-shift has no quick way to jump straight to what needs reordering.  
  Fix: Make the '· N low stock' text clickable to toggle a low-stock-only filter, or add a small segmented filter (All / Low / Out) above the table.

---

## 10 · Reports

**Screens:** [tablet](screenshots/10-reports-tablet.png) · [phone](screenshots/10-reports-phone.png)


A clean, on-brand read-only dashboard: serif numerals, warm cream cards, and a tasteful custom bar-chart-as-list for top items keep it feeling bespoke rather than templated. But it doesn't survive contact with a real shift: the date-range selector is a decorative no-op wired to nothing, two of five order-status color variants have a text/background contrast bug that makes their numbers nearly unreadable, both header controls are under the touch-target minimum, and the highest-value data for a host (table availability) is buried at the very bottom of the stack on phone.


**What works**

- Serif display numerals + label-above-value MetricCell pattern is consistent with the rest of the app (matches Inventory's header treatment) and reads premium, not like a generic admin template.
- 'Top Ordered Items' is a custom rank+name+count+progress-bar list using bg-chart-1 for the fill — a nicely restrained bar-chart substitute that avoids pulling in a charting library for five rows.
- Table Status uses semantic colored dots (bg-success/bg-info/bg-warning) consistent with status colors used elsewhere (Floor/table views), reinforcing the color language across screens.
- Loading states are handled for all three sections independently (MetricCellSkeleton, row skeletons, tile skeletons) and each also has its own explicit empty-state copy ('No order data yet.', 'No tables yet.') rather than one blanket spinner.
- Zero primary (bg-accent) CTAs on the page — correctly reserves the accent color for the progress bar as a data element rather than competing with a CTA, satisfying the one-CTA rule by having none where none is needed.


**Findings**

- **🔴 Critical** · _completeness_ — **Date-range selector is fully decorative — selecting a period changes nothing**  
  Evidence: apps/web/src/routes/_app/reports/index.tsx line 56: `useReportsControllerGetSummary()` is called with zero arguments, and the `dateRange` state set by the Select (lines 57, 66) is never read anywhere else in the file — not passed to the query, not part of the query key. The generated Orval hook itself (apps/web/src/api/reports/reports.ts) takes no query params at all, so there is no server-side handle for a period even if the client tried. docs/PRODUCT.md line 156 documents this Select as 'Reports (date range)', confirming it was meant to filter data.  
  Fix: Either wire dateRange into the query (pass it as a param, thread it through the NestJS controller/service and Orval-regenerate), or remove the Select and the 'today ⌄' chrome entirely until the backend supports it — a control that visibly changes to 'This month' while every number on screen stays frozen on today's data is worse than no control, because a manager will trust the wrong number.
- **🟠 High** · _design_ — **Two of five Order Status tiles have broken text contrast**  
  Evidence: Code: lines 33-35 pair a 10%-opacity tint background with full-strength foreground text — `sent: 'bg-accent/10 text-accent-foreground'`, `in_progress: 'bg-warning/10 text-warning-foreground'`, `ready: 'bg-success/10 text-success-foreground'` — while draft/served correctly pair a full-strength bg with its matching foreground (`bg-muted text-muted-foreground`, `bg-secondary text-secondary-foreground`). Screenshots (tablet and phone) show it: the '2 Ready' tile and '1 Sent' tile render with washed-out, low-contrast numerals/labels against their pale backgrounds, while 'Draft' and 'Served' are crisp and dark. in_progress isn't in the current fixture data but shares the same broken pairing and will render the same way.  
  Fix: Swap `text-*-foreground` for the plain token on the /10 variants (e.g. `text-success`, `text-warning`, `text-accent`) so the text is the saturated color on a light tint, matching the pattern draft/served already use correctly. One-line-per-variant fix to ORDER_STATUS_CLASSES.
- **🟠 High** · _design_ — **Both header controls are well under the 44px touch-target minimum**  
  Evidence: apps/web/src/components/ui/button.tsx line 26: size="sm" is `h-7` (28px). apps/web/src/components/ui/select.tsx line 42: `data-[size=sm]:h-7` (28px). The Reports page uses exactly these two controls as its only interactive elements — `<SelectTrigger size="sm">` (line 67) and `<Button size="sm">Refresh</Button>` (lines 77-86) — both 28px tall, well below the 44px floor this app's own tablet/phone-first standard requires, on the one screen where they're the only things to tap.  
  Fix: Drop size="sm" for these two controls on this route (use default/h-8+ or a taller custom size) or add vertical padding so the tap target reaches ~44px, even if the visual chip stays compact.
- **🟡 Medium** · _completeness_ — **Table Status — arguably the most actionable data for a host — sits last, below three other cards, and is off-screen on phone without scrolling**  
  Evidence: Phone screenshot (390×844 logical / 780×1688 captured): content ends with the 'Order Status' card's 4th tile ('1 Sent'); 'Table Status' (Available/Occupied/Reserved pills) is not visible in the frame at all, meaning it sits below at least one more screen-height of scrolling. On tablet it's visible but still the last section, beneath two KPI rows and a 5-row list.  
  Fix: For a host glancing at this screen mid-shift, 'how many tables are free right now' is typically more time-critical than the top-5 dish list. Consider promoting Table Status (or an 'Available X' chip) into the KPI row, or reordering sections so it isn't the one requiring the most scroll on the narrowest device.
- **🟡 Medium** · _design_ — **KPI grid never reaches its 4-column layout on tablet, undercutting the tablet-first intent**  
  Evidence: Line 95: `grid-cols-2 lg:grid-cols-4` — the 4-column variant only activates at the `lg` (1024px) breakpoint. The tablet screenshot is captured at iPad-portrait logical width (768px, i.e. 1536px physical at 2x DPR), which is below 1024, so it renders the cramped 2×2 layout instead of a single readable row of 4 compact tiles, despite 768px logical width having comfortable room for 4 cards.  
  Fix: Given this app's stated tablet-first priority, consider dropping the KPI grid's 4-column breakpoint to `md` (768px) or a custom breakpoint so iPad portrait — presumably a primary target device — gets the denser, more scannable single-row layout instead of falling back to the same 2-column stack used on phone.
- **🟡 Medium** · _completeness_ — **No export, print, or share action for a 'reports' screen used for shift handover/accounting**  
  Evidence: The only header actions are the (currently non-functional) date-range Select and a Refresh button (lines 64-88); there is no CSV/PDF export, print, or 'send to accounting' affordance anywhere in the component.  
  Fix: If this summary is meant to support end-of-shift handover or bookkeeping (implied by having a date-range concept at all), add a lightweight export/print action — even a simple print-stylesheet trigger — before calling this feature-complete.
- **⚪ Low** · _completeness_ — **'Top Ordered Items' is a dead list — no drill-down and no way to see beyond the top 5**  
  Evidence: Rows (lines 143-159) are plain `<div>`s with no onClick/Link, and the API only ever returns enough for a top-5 render (`data.topItems`); there's no 'view all' or link to a fuller menu-performance report.  
  Fix: Low priority for a v1 summary widget, but worth a 'View full menu report →' link once a real per-item report page exists, so this list doesn't read as a permanent dead end.
- **⚪ Low** · _design_ — **Reservations Today tile keeps a hardcoded 'Today' framing regardless of the (non-functional) date-range selector**  
  Evidence: Line 113: `<MetricCell label="Reservations Today" .../>` — the label text is static regardless of `dateRange` state, so even if the date filter is later wired up, this one tile's copy will contradict whatever period is actually selected (e.g. showing 'Reservations Today' while the value reflects 'This week').  
  Fix: Once/if the date-range control is made functional, derive this label from the selected range (e.g. 'Reservations (This week)') rather than a hardcoded 'Today'.

---

## 11 · Calendar

**Screens:** [tablet](screenshots/11-calendar-tablet.png) · [phone](screenshots/11-calendar-phone.png)


Visually the screen is on-brand — warm canvas palette, serif display headline, clean tab strip, and the hamburger-collapse works cleanly on phone — but it's the weakest-built screen reviewed so far: react-big-calendar is dropped in with only cosmetic token overrides and no interaction wiring, so it renders a read-only, frequently illegible grid rather than an operational tool. Overlapping bookings and phone-width day columns produce genuinely unreadable event labels, the Shifts tab has no create/edit/delete path anywhere in the app, toolbar buttons fall well under the touch-target minimum, and the reservation count in the header is computed from an unfiltered, all-time dataset so it misreports "this week" as soon as data grows or the user pages to another week. This reads like a library integration that got token-themed but not product-finished.


**What works**

- PageHeader + serif 'Calendar' display headline is consistent with the rest of the app's editorial visual language (matches Settings, etc.)
- Sidebar collapses to a hamburger icon on phone cleanly; the top bar stays legible and uncluttered at 780px
- Reservations/Shifts tab strip has a large touch target, single clear accent-underline active state, no ambiguity
- Today's column is tinted with accent/30 for quick at-a-glance orientation without introducing a new color
- Event color-coding (reservations vs shifts) is implemented with real semantic tokens (--info/--info-foreground and --success/--success-foreground are defined per-theme in index.css) rather than raw hex, even though 'info' isn't called out explicitly in PRODUCT.md's status-color bullet
- Toolbar reflows to three stacked rows on phone instead of overflowing or getting clipped horizontally — a sensible fallback given react-big-calendar's rigid toolbar markup


**Findings**

- **🔴 Critical** · _completeness_ — **Shift scheduling is entirely unbuilt — the Shifts tab is permanently read-only**  
  Evidence: apps/web/src/api/shifts/shifts.ts (Orval-generated) only exports useShiftControllerGetAll and useShiftControllerGetOne — no create/update/delete hook exists. A repo-wide search found zero routes or components calling any shift-mutation hook. There is no screen anywhere in the app where a manager can create, edit, or remove a staff shift.  
  Fix: Add POST/PATCH/DELETE shift endpoints with full Swagger decorators, regenerate the Orval client, and add at least a slot-tap → create-shift flow (or a dedicated staff-scheduling screen) before this tab ships — right now half of this screen's stated purpose is unreachable.
- **🟠 High** · _design_ — **Overlapping bookings render as illegible slivers with mid-word text wrapping**  
  Evidence: Tablet screenshot, Friday evening: two simultaneous reservations ('9:30 PM Julia & ...' and '10:00 ... Th...') are laid out as two narrow side-by-side columns with clipped, unreadable labels. The single 2:30 PM 'Becker' event above it wraps mid-word into 'Becke' / 'r' on two lines inside its own block. No truncation-with-ellipsis, tooltip, or '+N more' affordance is used.  
  Fix: Cap event block text to a single truncated line (ellipsis + native title tooltip, or a details popover on tap) and use react-big-calendar's built-in event limit / 'show more' for overlapping slots instead of letting the library's default overlap layout squeeze text into unreadable columns.
- **🟠 High** · _completeness_ — **No event or slot interactivity — the calendar is display-only**  
  Evidence: The <Calendar> element in apps/web/src/routes/_app/calendar/index.tsx only sets localizer, events, defaultView, views, date, onNavigate, scrollToTime, style, and eventPropGetter — no onSelectEvent, onSelectSlot, or selectable prop. Tapping a reservation block or an empty time slot does nothing.  
  Fix: Wire onSelectEvent to open a detail view (party size, phone, notes for reservations; staff/role/time for shifts) and, where the create flow lives elsewhere (reservations are created on /door), at minimum deep-link a tapped reservation event to its /door record so the calendar isn't a dead end.
- **🟠 High** · _completeness_ — **'N reservations this week' is computed from the entire reservations table, not the visible week**  
  Evidence: useReservationControllerGetAll() is called with no arguments even though ReservationControllerGetAllParams supports from/to filtering (confirmed in apps/web/src/api/reservations/reservations.ts) — exactly the pattern used correctly for shifts (useShiftControllerGetAll({ from, to })). eventCount = reservationEvents.length therefore reflects every reservation ever created, mislabeled as 'this week,' and won't change when the user pages Back/Next to a different week.  
  Fix: Pass { from, to } into useReservationControllerGetAll the same way shifts already do, and derive the header count from events actually falling inside the current week range.
- **🟠 High** · _design_ — **Week grid doesn't adapt to phone width — all 7 columns survive, crushed and illegible**  
  Evidence: Phone screenshot (780px logical): day headers truncate to '05 St', '06 M', '07 Tu', '08 W', '09 Tl', and event labels shrink to 2-3 characters ('2:30 Be ck', '8:00 Na'). No day-view fallback or horizontal-scroll-per-day is used at this breakpoint — the same fixed 7-column week grid from tablet is just squeezed.  
  Fix: Below a width threshold, default to Day view (already available via the Week/Day toggle) or make the week grid horizontally scroll one/two days at a time instead of rendering all 7 columns at a width that can't fit legible text.
- **🟡 Medium** · _design_ — **Toolbar buttons (Today/Back/Next/Week/Day) are under the 44px touch-target minimum**  
  Evidence: The toolbar is restyled via arbitrary-value Tailwind selectors targeting react-big-calendar's internal classes: '[&_.rbc-toolbar_button]:px-3 [&_.rbc-toolbar_button]:py-1 [&_.rbc-toolbar_button]:text-sm' — py-1 (4px) + text-sm line-height gives an effective control height well under 44px, and it bypasses the app's normal Button component entirely.  
  Fix: Bump vertical padding to at least py-2.5/py-3 (or wrap the toolbar in the shared Button component) so Today/Back/Next/Week/Day meet the same touch-target floor as every other primary control in the app.
- **⚪ Low** · _completeness_ — **No Month view**  
  Evidence: views={[Views.WEEK, Views.DAY]} — only Week and Day are enabled; there's no way to see a month-at-a-glance reservation/staffing load.  
  Fix: Low priority for a waiter/host-first tool, but worth adding a Month view for the manager persona who plans staffing/covers further ahead — react-big-calendar supports it with one more entry in the views array.
- **⚪ Low** · _design_ — **No loading state while reservations/shifts/staff are fetching**  
  Evidence: All three queries destructure with default empty-array fallbacks (data: reservations = [], etc.) and there's no isLoading/skeleton branch, so the subtitle briefly reads '0 reservations this week' and the grid is empty until data arrives.  
  Fix: Add a lightweight skeleton or muted 'Loading…' state for the header count and grid so the empty flash doesn't read as 'no reservations exist.'

---

## 12 · Settings

**Screens:** [tablet](screenshots/12-settings-tablet.png) · [phone](screenshots/12-settings-phone.png)


A clean, on-brand three-section settings page (Restaurant Info, Appearance/theme picker, Notifications) that reflows correctly from tablet to phone and respects the one-primary-CTA rule and semantic-token discipline. It reads as intentional and warm rather than generic. But it is thinner than it looks: the touch targets on every input and button in this dense form are well under the 44px tablet minimum, there's no error state if the profile fails to load, and — most damaging for trust — the Restaurant Info a manager saves here (name/address/phone) is never actually read anywhere else in the app; the printed checkout receipt hardcodes a different restaurant name. The /staff redirect this screen also serves as a landing pad for is an unexplained dead end with no staff-management content anywhere in the product.


**What works**

- Exactly one primary CTA in view: 'Save changes' is the only bg-accent button; the notification Enable/Disable action correctly uses the outline/secondary style.
- Responsive reflow is genuinely solid: the 2-column Restaurant Info grid collapses cleanly to a single full-width column at 780px with no cramped or overlapping fields.
- Theme selector is well-built: swatch + label + description + accent ring + checkmark gives an unambiguous 'this is currently active' state, and covers 4 themes (default/midnight/monokai/gruvbox) with legible copy.
- Visual identity (serif headings, terracotta accent, card/separator rhythm on warm paper) is consistent and reads premium, not templated 'AI slop'.
- Good conditional logic: the 'Install App' card only renders when canInstall && !installed, and a blocked notification permission surfaces a clear inline error instead of failing silently.


**Findings**

- **🟠 High** · _completeness_ — **Restaurant Info is saved but never actually used anywhere — receipt hardcodes a different name**  
  Evidence: Settings' Restaurant Info card (tablet + phone screenshots) is captioned 'Update your restaurant's public-facing details' and edits Name/Description/Phone/Email/Address (currently 'La Bella Tavola'). But apps/web/src/routes/_app/checkout/-receipt-block.tsx line 8 declares `const RESTAURANT_NAME = 'RestoManager';` and prints that constant on the customer-facing receipt — it never reads useSettingsControllerGet or the saved name/address/phone at all.  
  Fix: Wire the printable receipt (and any other customer-facing surface) to read the saved Settings values instead of a hardcoded constant, or relabel the Restaurant Info section so it doesn't over-promise 'public-facing' impact it doesn't have yet.
- **🟠 High** · _design_ — **Every interactive control on this form is under the 44px touch-target minimum**  
  Evidence: apps/web/src/components/ui/input.tsx sets `h-8` (32px) on all text inputs — all 5 fields in Restaurant Info (Name, Description, Phone, Email, Address) plus Opening Hours use it. button.tsx's default size is also `h-8` (32px, used by 'Save changes') and the `sm` size is `h-7` (28px, used by the Enable/Disable notification toggle). This is the densest form-heavy screen in the app, so the shortfall is most visible here.  
  Fix: Bump Input/Button minimum height to ~44px (h-11) at least for default/sm sizes used in form contexts on tablet/phone, or add a touch-optimized size variant used by Settings and other data-entry screens.
- **🟡 Medium** · _completeness_ — **/staff redirects here silently with zero staff-management content anywhere in the app**  
  Evidence: apps/web/src/routes/_app/staff/index.tsx is just `beforeLoad: () => { throw redirect({ to: '/settings' }) }` with no message. The Settings screen (both viewports) has no staff/user/role content, and the sidebar in the screenshots has no Staff nav item at all — so a stale link/bookmark to /staff dead-ends on unrelated Restaurant Info/Appearance/Notifications with no explanation of what happened to staff management.  
  Fix: Either delete the vestigial /staff route entirely (if staff management is intentionally gone under the shared-login model) or restore a minimal staff view — a silent, unexplained redirect is worse than a 404.
- **🟡 Medium** · _design_ — **No error state for a failed settings load — a network hiccup renders a blank form with no warning**  
  Evidence: apps/web/src/routes/_app/settings/index.tsx line 26: `const { data, isLoading } = useSettingsControllerGet();` — only isLoading is checked (line 113); there's no isError/error branch. If the GET fails, every field silently falls back to '' via the effect at line 80-89, and the manager sees an apparently-empty-but-editable form with no banner explaining why.  
  Fix: Add an isError branch with a retry affordance before rendering the form, so a failed load can't be mistaken for 'my restaurant info got wiped' and accidentally overwritten with blanks on Save.
- **🟡 Medium** · _completeness_ — **Opening Hours is unstructured free text with no day-by-day model**  
  Evidence: index.tsx lines 184-194: `<textarea>` bound directly to a single openingHours string (current value 'Mon–Fri 11:00–23:00, Sat–Sun 10:00–23:30'), with a differently-formatted multi-line placeholder example. There's no per-day open/close/closed structure, so nothing else in the app (e.g. an 'open now' indicator) can consume it, and formatting consistency depends entirely on whoever types it.  
  Fix: Model opening hours as structured per-day data (even a simple 7-row open/close/closed picker) if anything downstream is meant to read it; otherwise keep it as a clearly-labeled free-text note and don't imply structure via the placeholder.
- **⚪ Low** · _design_ — **'Description' is public-facing copy crammed into a single-line input that visibly truncates it**  
  Evidence: Both tablet and phone screenshots show the Description field clipped mid-word: 'Modern Italian cuisine with a cozy atmos…' — it's a `<Input type="text">` (line 141-147), not a textarea, so there's no way to review the full saved text without clicking in and scrolling horizontally.  
  Fix: Use a small textarea (like Opening Hours) or an expand-to-view affordance for Description so staff can actually read what they saved.
- **⚪ Low** · _design_ — **Loading state is a bare sentence that discards the page identity**  
  Evidence: Line 113: `if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;` replaces the entire page — including the 'Settings' heading and subtitle — with unstyled muted text, a noticeable step down from the card-based skeletons this design system's polish elsewhere implies.  
  Fix: Render the PageHeader plus skeleton cards during load instead of swapping the whole page for a text string.
- **⚪ Low** · _completeness_ — **No tax rate, service charge, currency, or receipt/printer configuration despite checkout now needing them**  
  Evidence: Recent commits ('feat(web): checkout split payments + printable receipt') added tax computation and a printed receipt (bill.tax in checkout/-receipt-block.tsx), yet Settings — the only configuration surface in the app — has no field for tax rate, service charge %, currency, or which printer/receipt template to use.  
  Fix: Add a Billing/Receipt section to Settings once these values need to be venue-configurable rather than hardcoded/backend-only.

---