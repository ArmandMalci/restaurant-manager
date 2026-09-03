---
name: idea-mining
description: Use when Armand wants fresh content ideas backed by real audience signals (not vibes). Spawns parallel sub-agents to scan YouTube comments on his + competitor channels and to surface emerging web trends, cross-references signals, and outputs ranked ideas with the source signal cited.
model: sonnet
allowed_tools: [Read, Write, Edit, Bash, Glob]
---

# Idea Mining

## Trigger
- "Run idea mining"
- "Find me content ideas"
- "What should I post about?"

## Prerequisites
- `YOUTUBE_API_KEY` in `.env` (Google Cloud Console → YouTube Data API v3)
- Optionally: X/Twitter or Reddit API access for broader signal mining

## Steps

1. **Confirm scope.** Ask Armand in ONE batch:
   - Which channels to mine (his own + 2–3 competitors)
   - Topic / niche the ideas should fall in
   - Format target (video, short, carousel, post)
   - How many ideas to return (default: 10)

2. **Dispatch two sub-agents in parallel** via the Agent tool:
   - **youtube-analyzer**: read the last 50 comments on the top 10 most-viewed videos of each channel. Extract recurring themes, questions, complaints, and gaps the audience is asking about.
   - **web-researcher**: search web + X for emerging conversations in the niche. Surface 5–10 specific signals (article URLs, tweet excerpts, search-trend deltas).

3. **Synthesize.** Cross-reference the two streams: which YouTube-comment themes match emerging web trends? Rank by signal strength (occurrence count + recency).

4. **Output** to `wiki/ideas/YYYY-MM-DD-ideas.md`:
   ```markdown
   # Content ideas — YYYY-MM-DD

   ## Top 10

   ### 1. <title>
   - **Format:** <video / short / carousel>
   - **Hook:** <opener sentence>
   - **Why now:** <signal>
   - **Source:** YouTube comment on <channel>/<video> OR web trend <url>

   ### 2. ...
   ```

5. **Update** `wiki/hot.md` with a one-liner pointing at today's ideas file.

## Rules
- Don't fabricate signals. If a "trend" comes from only one comment, mark it `weak signal`.
- Always cite the source (channel name, comment ID excerpt, or URL).
- Cap output at the requested count. Quality > quantity.
- Skip the synthesis step if both sub-agents return <3 signals each — flag that the niche has insufficient public signal and recommend manual exploration instead.
