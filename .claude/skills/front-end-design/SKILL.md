---
name: front-end-design
description: Use when Armand is building any user-facing UI — landing page, app screen, dashboard, marketing site, component library. Forces aesthetic taste decisions BEFORE coding so output isn't generic "AI slop". Pairs with ui-ux-pro-max for color/font systems and ui-to-code for execution.
---

# Front-End Design

## Trigger
- "Design a landing page"
- "Build a UI for X"
- "Start a new screen / component / app"
- "Make this look better"

## Steps
1. **Read rules in order, stop when enough:** `.claude/rules/design_principles.md`, `.claude/rules/ui_guidelines.md`, `.claude/context/tech_stack.md`.
2. **Force three taste decisions** (one batch, ask Armand): **Mood** (pick one from `.claude/references/front-end-moods.md`), **Density** (same file), **Reference products** (name 1–2 like Linear / Vercel / Apple).
3. **Use `ui-ux-pro-max` skill** to derive an OKLCH palette + font pairing for the chosen mood. Cherry-pick 3–5 named patterns from its library that fit.
4. **ASCII-sketch the layout** before coding. Confirm with Armand. Iterate. **Don't skip — faster than rewriting components.**
5. **Define type scale and spacing rhythm** explicitly (h1/h2/h3 sizes + weights, body/caption, section padding, card padding).
6. **Hand off to `ui-to-code` skill** for component implementation.
7. **Final taste check:** ONE primary action per view? Type hierarchy obvious at 6ft? Spacing consistent? Empty/loading/error states exist? Mobile at 375px not broken?

## Rules
- No generic "modern, clean, professional" — force the mood decision.
- No emoji in UI unless brand calls for it.
- Max 2 typefaces, 1 accent color in v1.
- Reference shipped products, not Dribbble.
- See `.claude/references/front-end-moods.md` for detailed mood/density options.
