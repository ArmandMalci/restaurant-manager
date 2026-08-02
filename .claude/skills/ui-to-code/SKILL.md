---
name: ui-to-code
description: Use when the user wants to convert a design (Figma file, screenshot, or sketch) into working code. Pulls design tokens via Figma MCP when available, builds the component, screenshots with Playwright, and self-corrects until visually matched.
---

# UI to Code

## Trigger
- "Build this design"
- "Convert this Figma to code"
- "Turn this screenshot into a component"

## Steps
1. **Identify the source** (Figma URL / screenshot / sketch) — see `references/rules.md` for what to do per source type.
2. **Confirm target project.** Which `~/code/<slug>/`? If new, run `new-project` skill first.
3. **Identify target file path.** Default: `~/code/<slug>/components/<component-name>.tsx`. Match the project's existing patterns.
4. **Write the component.** Follow the writing rules in `references/rules.md`.
5. **Visual verification via Playwright MCP** if shipping web UI. Follow the self-correct loop in the reference (max 3 iterations, then surface uncertainty).
6. **Final checks** — see the reference for exact commands.

See `references/rules.md` for full discipline checklist.
