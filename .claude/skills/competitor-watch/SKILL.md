---
name: competitor-watch
description: Use when Armand wants a structured snapshot of competitors in a market (e.g., AI image gen, design tooling, his own niche). Discovers competing companies via web search, scrapes pricing/features/positioning via Firecrawl, and outputs a branded markdown report with a comparison table. Run quarterly or before a positioning decision.
model: sonnet
allowed_tools: [Read, Write, Edit, Bash, Glob]
---

# Competitor Watch

## Trigger
- "Run a competitor analysis on [market]"
- "Who's competing with [product / Krea]?"
- "Pull a competitor snapshot"

## Prerequisites
- `FIRECRAWL_API_KEY` in `.env` (scraping)
- `PERPLEXITY_API_KEY` in `.env` (discovery + summarization)

## Steps

1. **Confirm scope** (one batch). Ask Armand:
   - Market / category (e.g., "AI image generation for designers")
   - Our positioning angle (so the report contrasts the right dimensions)
   - Number of competitors (default: 5–8)
   - Output destination (default: `wiki/research/competitor-<slug>-<date>.md`)

2. **Discover competitors** via Perplexity API. Prompt: "List the top N companies competing in [market] in 2026. For each: name, URL, one-line positioning." Capture raw list.

3. **For each competitor in parallel** (Agent tool, Haiku):
   - Scrape their pricing page + landing page via Firecrawl
   - Extract: tagline, pricing tiers, key features list, target user, recent funding/launch news
   - Cache raw at `wiki/raw/competitor-<slug>-<comp>.md`

4. **Synthesize** into a comparison table:
   - Columns: Name, Positioning, Pricing (cheapest plan), Key differentiator, Target user, Last notable update
   - Highlight where competitors converge (table stakes) vs diverge (their unique angle)

5. **Add an Armand-perspective section:**
   - Where we already match the leaders
   - Where we're behind
   - Where there's whitespace (no one is here yet)
   - Recommended positioning moves (2–3 bullets max)

6. **Output** the full report. Append a one-liner to `wiki/log.md`.

## Rules
- Don't fabricate pricing. If Firecrawl can't reach a paywalled pricing page, mark it `(not public)` instead of guessing.
- Skip competitors you can't get at least 3 data points on. Quality > quantity.
- Reference real launch dates / announcements, not vibes.
- Never auto-share or post the report — it's internal.
