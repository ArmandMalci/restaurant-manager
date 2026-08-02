# ui-to-code — Detailed Rules

> Routed from `.claude/skills/ui-to-code.md`. Read when the skill triggers and Armand wants the full discipline checklist.

## Source identification rules

- **Figma URL** → use Figma MCP if enabled (extract auto-layout, spacing tokens, color variables, type styles). Do NOT eyeball-measure when the real file is available.
- **Screenshot only** → reference `ui_guidelines.md` defaults; results are approximate.
- **Sketch / wireframe** → ask for tone (minimalist / playful / etc.) before designing; reference `ui-ux-pro-max`.

## Component writing rules

- TypeScript + Tailwind + shadcn/ui (per `tech_stack.md`).
- Server Component by default; `'use client'` only when state/effects/browser APIs needed.
- Semantic color tokens (`bg-card`, `text-muted-foreground`) — not raw hex.
- Project's spacing scale only — no custom px.
- Accessibility: keyboard nav, focus states, alt text, semantic HTML.

## Visual verification loop

Use Playwright MCP:
1. Start dev server.
2. Navigate to component preview route.
3. Screenshot at 375px, 768px, 1280px.
4. Compare to source design.
5. Self-correct loop (max 3 iterations): diff spacing / alignment / font weight / color contrast, fix the largest visible mismatch, re-screenshot. After 3 iterations with no convergence, STOP and tell Armand which element is wrong.

## Final checks

- Typechecker (`pnpm tsc --noEmit` or project command).
- Linter.
- No browser console errors.

## Hard rules

- No emoji in UI unless source design has them.
- No fake interactivity — build the dropdown for real, don't `alert("clicked")`.
- No magic numbers — every `pt-7` justifies itself against source.
- Stop and surface uncertainty rather than ship "close enough but wrong".
