# SEO/Marketing Learning Path (2026)

> Source: `docs/superpowers/specs/2026-08-01-claude-setup-program-design.md` §7. Ten steps,
> dependency-ordered — each one only makes sense once the step before it is understood. `seo-audit`
> covers steps 1–5 directly (its checklist maps onto them); steps 6–8 are covered by `launch-kit`;
> steps 9–10 by `growth-review`. SKILL.md's Teaching Contract names whichever step the user hasn't
> seen covered yet at the end of every run — this file is what gets taught, in order.

## 1. The crawl → render → index → rank model

Before any individual checklist item makes sense, the four-stage pipeline every search engine
runs a page through has to click: a **crawler** fetches the raw HTTP response; a **renderer**
(Google uses a real Chromium instance, most other engines/AI bots do not) executes JavaScript to
produce the final DOM; the **indexer** decides whether the rendered result is worth storing and
under which canonical URL; and only indexed pages are eligible to **rank** for any query at all.
A page can fail at any stage — a robots.txt block fails at crawl, a client-side-only render fails
at render, a duplicate/thin page fails at index, and a page can be perfectly indexed yet never
rank if it loses on relevance/quality signals. Almost every checklist item (`checklist-2026.md`)
is really "which stage does this defect break." `metadataBase` and JSON-LD failures are
index-stage problems (the page is fetched and rendered fine, but the wrong or missing signals
are attached to it); the SSR pitfall (item 8) is a render-stage problem; a missing sitemap
(item 5) is a crawl-stage discovery problem.

**Why this is step 1:** every other step assumes this model as background. Skipping it means the
audit's findings read as an arbitrary checklist instead of a diagnosis.

## 2. Search intent

Once a page is crawlable/renderable/indexable, ranking depends on matching **search intent** —
the four canonical categories are navigational (user wants a specific known page/brand),
informational (user wants an answer), commercial-investigation (user is comparing options before
buying), and transactional (user wants to complete an action now). A page optimized for the
wrong intent bucket (e.g., a feature-comparison page written like a landing page) will not rank
even with perfect technical SEO, because the content doesn't match what searchers actually want
at that query. This is why "why isn't this page ranking" often isn't a checklist failure at all
— it's an intent mismatch, which the audit flags as a judgment item rather than a technical fail.

**Why it follows step 1:** intent-matching only matters for pages that are already
crawled/rendered/indexed — a page invisible to the index has no intent problem yet, it has a
step-1 problem.

## 3. The metadata + schema layer

With the pipeline and intent understood, the concrete on-page layer is: title, meta description,
canonical, Open Graph tags, Twitter card, and JSON-LD structured data (checklist items 1–3).
This layer is what tells the indexer (step 1) how to summarize and classify the page, and
increasingly — via JSON-LD `FAQPage`/`Article`/`Product` types — what AI assistants extract
directly as citable answer content. Get this layer wrong and even a perfectly crawlable,
correctly-intent-matched page shows up with a bad snippet, wrong preview image, or gets
misclassified.

**Why it follows step 2:** metadata is *how* a page communicates its intent match to both
crawlers and searchers scanning a results page — it depends on already knowing what intent the
page is even targeting.

## 4. Core Web Vitals as field data

Once content and metadata are right, CWV (checklist item 4) is the next layer: a real-user
performance signal, not a design nicety. The critical distinction is **field data** (real Chrome
users, CrUX, p75 over 28 days) vs. **lab data** (one synthetic Lighthouse run) — a page can be
perfectly optimized on paper (steps 1–3) and still underperform if real users on real networks
experience slow LCP/high INP/layout shift. This is deliberately sequenced after metadata because
CWV is a ranking *modifier*, not a prerequisite for being indexed at all — a slow page still gets
crawled and indexed, it just competes worse.

**Why it follows step 3:** it's meaningless to tune performance for a page whose metadata/schema
is still broken — fix what search engines see the page *as* before optimizing how fast it
delivers that content.

## 5. GEO/AEO as crawlability + strategy, not a new checklist

Generative Engine Optimization and Answer Engine Optimization (being cited/extracted by
ChatGPT/Perplexity/Claude-with-search rather than ranking in a traditional SERP) is **not** a
parallel discipline requiring new tools like `llms.txt` (checklist item 10 explains why that file
is a dead end). It is the same crawlable-HTML + correct-structured-data foundation from steps
1–3, pointed at a different consumer (an LLM instead of a ranking algorithm). Understanding this
collapses what looks like a 2026-specific new checklist into "steps 1–3, done well, already cover
this."

**Why it follows step 4:** this step's entire teaching point is that it does *not* introduce new
technical work beyond 1–3 — it needs those steps understood first so the "nothing new here" claim
lands as a synthesis, not a shortcut.

---

## 6. JTBD positioning (`launch-kit`)

Jobs-to-be-Done: what job is the user "hiring" this product to do, what alternative does it
displace, and what functional/emotional/social outcomes does the user actually want. `launch-kit`
runs this as an interview and **refuses to generate copy before it** — positioning has to exist
before words get chosen, or the words are decoration over a hollow claim.

**Why it starts the marketing-copy arc (steps 6–8):** it is the first step where the audit's
job (diagnose technical/content correctness) hands off to a different skill's job (craft
positioning and copy) — SEO makes a page findable and correctly summarized; positioning makes it
persuasive once found.

## 7. Copy frameworks (PAS)

Problem-Agitate-Solution: name the problem the JTBD interview (step 6) surfaced, agitate why it
hurts (make the cost of inaction concrete), then present the solution as the resolution. This is
the structural skeleton `launch-kit` writes hero copy against — it only works once step 6's
positioning inputs exist, otherwise PAS just agitates a problem nobody confirmed the audience
actually has.

## 8. Launch-channel mechanics

Each launch channel has its own unwritten rules that generic copy ignores: Product Hunt runs on
an hour-by-hour first-24-hours cadence, Show HN wants a specific title format plus a
first-comment from the founder, Reddit requires disclosure-first framing or gets removed, X
wants a demo-script format over a press-release tone. This is downstream of steps 6–7 — channel
mechanics shape *how* the positioning and PAS copy get packaged per-channel, not what the
underlying message is.

## 9. Instrumentation (`growth-review`)

Before any metric in step 10 means anything, events have to be tracked correctly — one clearly
named activation event (never a vague "logged in"), signup, and the funnel steps between them.
This is sequenced before pre-PMF metrics because a metrics review is only as trustworthy as the
underlying event instrumentation; garbage-in event names produce a growth report that looks
authoritative but measures the wrong thing.

## 10. Pre-PMF metrics (`growth-review`)

With instrumentation trustworthy (step 9), the actual health signals: D1/D7/D30 retention
cohorts (D30 retention ≥25–30% is roughly PMF territory for a B2B-ish product), channel
attribution via UTM, and the quarterly Sean Ellis "how would you feel if you could no longer use
this product" pulse survey (~40% "very disappointed" is the classic PMF threshold). This is
last because it's the outcome measure for everything above it — technical SEO (1–5) drives
discovery, positioning/copy/channels (6–8) drive conversion, and steps 9–10 are how you find out
whether any of it actually produced a retained, wanted product.
