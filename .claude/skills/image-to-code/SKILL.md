---
name: image-to-code
description: Thin orchestrator for visually-important website tasks. Does NOT design or build directly. It (1) generates premium section comps via the imagegen-frontend-web skill, (2) deeply analyzes its own generated comps as the design source of truth, then (3) hands the code build to the ui-to-code skill. Use for hero sections, landing pages, marketing/startup/editorial sites, product pages, portfolios, and redesigns where visual quality matters and you want art-directed reference images generated before any code is written.
---

# image-to-code (orchestrator)

> This skill is glue. It owns no design canon and no build loop of its own.
> - Art-direction + per-section image generation -> `imagegen-frontend-web` (which imports `~/shadow-monarchy/.claude/references/imagegen-art-direction.md`).
> - Component build + Playwright visual-verify -> `ui-to-code` (see `~/shadow-monarchy/.claude/references/ui-to-code-rules.md`).
> Its only unique contribution is the **image-first → deep-analyze → build-faithfully (anti-drift)** sequence that connects the two.

## Trigger

Use when the request is mainly about visual frontend quality and you want reference comps generated first:
- "make me a beautiful hero / premium landing page / creative website"
- "redesign this / make it more modern / more aesthetic"
- "polished marketing page", "portfolio site", "multi-section website concept"
- anything described mainly in visual terms

Prefer going straight to `ui-to-code` (skip the comp-generation step) only when the task is mostly technical: a bug fix, a structural change, or when the user already provides a precise design system / Figma file.

## Workflow

1. **Infer scope.** Determine site type, primary conversion goal, and section count (default: landing page = 6, full website = 8). Confirm the target `~/code/<slug>/` and file path; if it's a new project, run `new-project` first.

2. **Generate section comps via `imagegen-frontend-web`.** Hand the brief to that skill and let it own all art direction: one horizontal image per section, hero scale, composition anchors, background modes, palette, anti-slop. Do not re-derive design rules here. If a section's text/components are too small to read, ask imagegen-frontend-web for a closer extraction render or a fresh standalone regeneration of that section — **never crop** a region out of a previously generated image (cropping destroys spacing, type scale, and proportions).

3. **Deeply analyze your own generated comps — they are the design source of truth.** Before any code, treat the comps as a specification and extract:
   - visible text (hero headline, subheadline, CTA labels, section headings, nav/footer labels, pricing/feature names)
   - typography (size/weight relationships, line count, line-height + tracking feel, serif vs sans, display vs body contrast)
   - spacing (headline↔sub, text↔buttons, card gaps, section top/bottom, side gutters, padding, overall cadence)
   - buttons/components (shape, radius, fill vs outline, icon use, primary vs secondary hierarchy, dividers, shadows, borders)
   - color (background, panels, accents, button fills, text hierarchy, border logic, image grade, gradient restraint)
   - layout (grid logic, section ordering, density, visual rhythm, repeated motifs)
   Analyze cleanly and specifically — no vibe-only glances. If something stays unclear, get another render from imagegen-frontend-web before coding.

4. **Build via `ui-to-code`, passing the analyzed comps as the source.** ui-to-code owns the component writing, the Playwright screenshot self-correct loop (375 / 768 / 1280, max 3 iterations), and the final typecheck / lint / no-console-errors checks per `~/shadow-monarchy/.claude/references/ui-to-code-rules.md`. Tell it: the comps are the source of truth, match them faithfully.

## Anti-drift rule (the one thing this orchestrator enforces)

The common failure mode: the generated comps look strong, but the coded result drifts generic. When you hand off to ui-to-code, require it to **stay faithful to the comps** — preserve layout logic, spacing rhythm, section ordering, text/image balance, typography mood, component style, and palette. Do not "improve" the design into a default template, compress generous spacing, flatten strong typography into plain hierarchy, or reintroduce nested-box / card-in-card complexity that the comps avoided. The goal is "visually faithful to the comps, translated into real frontend" — not "loosely inspired by".

When the comps leave a detail ambiguous, resolve it by: preserving the visible design language → preserving layout/spacing logic → preserving the component family → preserving mood/polish → getting an extra render from imagegen-frontend-web → only then choosing the most implementation-friendly faithful version. Do not fill ambiguity with generic defaults too quickly.

## Example

**"design me an 8-section landing page"** ->
1. confirm site type + target project; section count = 8.
2. `imagegen-frontend-web` generates 8 separate horizontal section comps (+ extra extraction renders where text/components are too small).
3. deeply analyze all 8 comps; extract text, type, spacing, buttons, colors, structure.
4. hand the comps to `ui-to-code` to build the full site, holding the anti-drift rule so the coded result still reads as the same site as the comps.
