# Domain Routing — design / product-project / data-analytics

Shared reference for three routing packs. No new skills are introduced here — every row
points at a tool that already exists. Use the legend to know whether a row's tool is
reachable from wherever this file was synced to.

## Location legend

- **hub-only** — lives in shadow-monarchy's `.claude/skills/` or `.claude/rules/`. Not
  synced into this repo. Open a shadow-monarchy session to use it.
- **user-level** — lives under `~/.claude/skills/` on Armand's machine. Works in ANY repo
  session, including this one — check this repo's own `.claude/skills/` first, some Krea
  repos ship a repo-local version and that one wins.
- **plugin-provided** — a marketplace plugin skill (`plugin-name:skill-name`). Only
  callable if that plugin is enabled for the current session; it is not a file in this repo.
- **MCP** — an MCP server tool. Only callable if that server is configured for the
  current session; it is not a file in this repo.
- **pack-synced** — a hub skill that also travels via a pack. Present at the path shown
  in this repo only if that pack is installed here; otherwise falls back to hub-only.

## Design

| Trigger phrase | Tool | Where it lives |
|---|---|---|
| Palette / type scale / spacing / motion / a11y rules | `design_principles.md`, `ui_guidelines.md` | in this repo's `.claude/rules/` (synced by this pack) |
| "design a UI" / "build a landing page" | `front-end-design` skill | hub-only |
| "set the design direction" / "pick a vibe" / "make it not look like AI slop" | `design-taste` skill | hub-only |
| "critique / audit / polish / refine this UI" | `impeccable` skill | hub-only |
| "turn this design into code" | `ui-to-code` skill (sole executor) | hub-only |
| "redesign this screen via UX Pilot" | `ux-pilot` skill | hub-only |
| "generate UI mockup images" | `imagegen-frontend-web` / `imagegen-frontend-mobile` skills | hub-only |
| "make a brand identity / logo board" | `brandkit` skill | hub-only |

No shadow-monarchy session available? The `design` plugin (`design:design-critique`,
`design:accessibility-review`, `design:ux-copy`) covers a subset — critique, a11y, and copy
review — but not taste-direction or brand generation.

## Product / project

| Trigger phrase | Tool | Where it lives |
|---|---|---|
| "plan this feature first" | `feature-plan` skill | hub-only |
| "start a new project" | `new-project` skill | hub-only |
| "work on KREA-4092" / "start ticket X" | `work-on-ticket` skill | user-level (`~/.claude/skills/work-on-ticket`) — Krea core-service and frontend-apps ship their own repo-local version; prefer that one when present |
| "wave-execute the plan" | `wave-execute` skill | hub-only |
| "summarize my last meeting" | `transcript-to-actions` skill | hub-only |
| "write a spec / PRD" | `product-management:write-spec` | plugin-provided |
| "plan the sprint" | `product-management:sprint-planning` | plugin-provided |
| "update the roadmap" | `product-management:roadmap-update` | plugin-provided |

## Data / analytics

| Trigger phrase | Tool | Where it lives |
|---|---|---|
| "audit our tracking" / "design a tracking plan" / "instrument this feature" / "model the product" / "make the business case" | `product-tracking-skills` plugin (`product-tracking-audit-current-tracking`, `-design-tracking-plan`, `-instrument-new-feature`, `-model-product`, `-business-case`, `-generate-implementation-guide`, `-implement-tracking`) | plugin-provided |
| "run my weekly roundup" | `weekly-analyst` skill (Stripe + GitHub + Linear + YouTube → markdown recap) | hub-only |
| "query X" / "build a dashboard" | metabase MCP | MCP — needs the metabase server configured for this session |
| "run a growth review" | `growth-review` skill | pack-synced via the `seo-marketing` pack — present at this repo's `.claude/skills/growth-review` if that pack is installed here, else hub-only |

## Linear / Notion connectors (shared)

Any row above that touches Linear or Notion (`work-on-ticket`, `transcript-to-actions`,
tracking-plugin ticket creation) needs one-time auth by Armand — via claude.ai connector
settings, or `/mcp` in an interactive session. Until that's done, these tools must degrade
gracefully: state what's blocked, don't fail silently and don't fabricate ticket IDs.
