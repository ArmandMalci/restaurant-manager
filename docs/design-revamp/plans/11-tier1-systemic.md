# Plan 11 — Tier 1 Systemic Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> Part of [Plan 10 — Finalization Roadmap](10-finalization-roadmap.md), Tier 1. Findings: [product review](../review-2026-07-10/PRODUCT-REVIEW-appendix.md).

**Goal:** Land the two highest-leverage systemic fixes from the review — make the shared UI primitives touch-safe on tablet/phone, and move the floor tile colors onto semantic tokens — so ~10 findings across the app are cleared by two central changes instead of per-screen edits.

**Architecture:** (1) Touch targets are reconciled with the *intentional* dense-productivity aesthetic via a single `@media (pointer: coarse)` rule in `index.css` that raises the shared primitives (`button`, `input`, `select-trigger`) to a 44px minimum hit-area on touch devices only — fine-pointer desktop stays dense. (2) The floor map's hardcoded `bg-emerald-*/sky-*/amber-*` palette (with retired `.dark` variants) is replaced by classes derived from the existing `--success/--info/--warning` semantic tokens, reusing the `STATUS_TONE` map already present in the file.

**Tech Stack:** React 19 + Vite 7 + Tailwind v4 (`@theme inline` tokens in `apps/web/src/index.css`), `@base-ui/react` primitives with `data-slot` attributes, Vitest + Testing Library, Playwright/preview tools for computed-style verification.

## Global Constraints

- **Semantic Tailwind tokens only — zero literal palette values.** Use `bg-success|info|warning` / `border-*` tokens, never `bg-emerald-*` / raw hex.
- **Multi-theme via `data-theme` on `<html>` (`default`/`monokai`/`gruvbox`); the `.dark` class is NOT used** — remove any `dark:` variants encountered in changed lines.
- **Touch-target minimum: 44px** on coarse-pointer (tablet/phone) devices; desktop keeps the dense scale.
- **Do not modify Orval-generated files under `apps/web/src/api/`.**
- Run `pnpm typecheck` + affected tests before marking any task done (per project CLAUDE.md).

---

### Task 1: Touch-safe shared primitives (`@media (pointer: coarse)`)

**Files:**
- Modify: `apps/web/src/index.css` (append a `@media (pointer: coarse)` block)
- Verify (no edit): `apps/web/src/components/ui/button.tsx`, `input.tsx`, `select.tsx` already emit `data-slot="button"|"input"|"select-trigger"`

**Interfaces:**
- Consumes: the `data-slot` attributes already rendered by the three primitives.
- Produces: no API change — purely a presentational floor. Downstream tasks/screens rely on these primitives now being ≥44px on touch without any per-usage change.

**Why this shape:** the compact scale (`h-8`/`h-7`) is deliberate (dense-productivity aesthetic, locked in the direction doc). Bumping the base heights globally would reflow every screen and fight the aesthetic. `@media (pointer: coarse)` gives touch devices a safe hit-area while leaving mouse/desktop dense. `min-width` on buttons only enforces a floor, so it is safe on text buttons (already wider) and fixes icon-only buttons (`size-8` = 32px).

- [x] **Step 1: Add the coarse-pointer rule to `index.css`**

Append at the end of `apps/web/src/index.css`:

```css
/* Touch-safe hit areas on coarse-pointer (tablet/phone) devices only.
   Desktop/fine-pointer keeps the dense productivity scale. 44px = 2.75rem. */
@media (pointer: coarse) {
  [data-slot='button'],
  [data-slot='input'],
  [data-slot='select-trigger'] {
    min-height: 2.75rem;
  }
  [data-slot='button'] {
    min-width: 2.75rem;
  }
}
```

- [x] **Step 2: Typecheck + build the stylesheet**

Run: `pnpm --filter @restaurant/web typecheck`
Expected: PASS (CSS-only change; no TS impact).

- [x] **Step 3: Verify in-browser under an emulated touch device**

Start the app (`run-web` skill / preview tools). Emulate a coarse-pointer viewport (e.g. tablet 768×1024 with touch) and navigate to `/order?tableId=<occupied>` and `/settings`.
Assert on a rendered `[data-slot='input']` and a `[data-slot='button']` that computed `min-height` ≥ 44px (`preview_inspect` styles: `['min-height']`, or Playwright `getComputedStyle`).
Then load the same screen at a desktop (fine-pointer) width and confirm the control is still the compact height (rule did NOT apply) — this proves density is preserved.
Expected: touch ≥44px, desktop unchanged.

- [x] **Step 4: Commit**

```bash
git add apps/web/src/index.css
git commit -m "fix(web): touch-safe primitives on coarse-pointer devices (Tier 1)"
```

---

### Task 2: Floor tile colors → semantic tokens

**Files:**
- Modify: `apps/web/src/routes/_app/floor/-floor-map.tsx:24-28` (the `STATUS_BG` map)
- Test: `apps/web/src/routes/_app/floor/-floor-map.test.tsx` (create)

**Interfaces:**
- Consumes: existing `STATUS_TONE: Record<TableStatus, Tone>` (`available→success`, `occupied→info`, `reserved→warning`) already defined in the file; the `--success/--info/--warning` theme tokens in `index.css`.
- Produces: `STATUS_BG` keeps the same shape (`Record<TableStatus, string>`) so all call sites are unchanged — only the class values change to token-based.

- [x] **Step 1: Write the failing test**

Create `apps/web/src/routes/_app/floor/-floor-map.test.tsx`:

```tsx
import { describe, expect, it } from 'vitest';
import { STATUS_BG } from './-floor-map';

describe('floor tile status colors', () => {
  it('uses semantic tokens, never literal palette or .dark', () => {
    for (const cls of Object.values(STATUS_BG)) {
      expect(cls).not.toMatch(/emerald|sky|amber|slate|zinc|gray/);
      expect(cls).not.toMatch(/\bdark:/);
      expect(cls).toMatch(/success|info|warning/);
    }
  });
});
```

- [x] **Step 2: Export `STATUS_BG` and run the test to see it fail**

In `-floor-map.tsx`, change `const STATUS_BG` to `export const STATUS_BG` (line 24).
Run: `pnpm --filter @restaurant/web test -- -floor-map`
Expected: FAIL — current values contain `emerald`/`sky`/`amber` and `dark:`.

- [x] **Step 3: Replace the hardcoded map with token classes**

Replace `-floor-map.tsx:24-28` with:

```tsx
// Tailwind classes for each status background — derived from semantic tokens
// (success/info/warning); dark handled per-theme via data-theme, not `.dark`.
export const STATUS_BG: Record<TableStatus, string> = {
  available: 'bg-success/10 border-success/30',
  occupied: 'bg-info/10 border-info/30',
  reserved: 'bg-warning/10 border-warning/30',
};
```

- [x] **Step 4: Run the test — verify it passes**

Run: `pnpm --filter @restaurant/web test -- -floor-map`
Expected: PASS.

- [x] **Step 5: Verify in-browser across themes**

Load `/floor` (map view). Confirm available/occupied/reserved tiles render with distinct, on-brand tinted backgrounds. Switch `data-theme` (default → monokai → gruvbox via Settings) and confirm tiles recolor per theme and stay legible (token-driven).
Expected: distinct, theme-aware tile colors; no regression vs the old palette.

- [x] **Step 6: Typecheck + commit**

Run: `pnpm --filter @restaurant/web typecheck`
Expected: PASS.

```bash
git add apps/web/src/routes/_app/floor/-floor-map.tsx apps/web/src/routes/_app/floor/-floor-map.test.tsx
git commit -m "fix(web): floor tile colors use semantic tokens, drop .dark (Tier 1)"
```

---

## Self-review notes

- **Spec coverage:** Tier 1 items T1.1 (touch targets) → Task 1; T1.2 (floor tokens) → Task 2. Complete.
- **Scope boundary:** Task 1 fixes the *shared primitives* systemically. Raw ad-hoc `<button>` icon controls that don't use the `Button` primitive (e.g. some inventory/KDS rows noted in the review) are NOT covered here — those are folded into their per-screen Tier 2/3 tasks, where converting them to the primitive also picks up this rule.
- **Token availability:** `bg-success/info/warning` map to `--success/--info/--warning`, defined for every theme in `index.css` (verified). `/10` and `/30` opacity modifiers are valid Tailwind v4 syntax against CSS-variable colors.
