---
name: research-brief
description: Use when Armand asks a research question that needs a sourced answer — "research X", "what does the evidence say about Y", "write me a brief on Z", or before citing any external claim in a skill, rules file, or product decision. Produces a short brief where every substantive claim carries an author, venue, year, and link, or is explicitly marked UNVERIFIED. NOT for quick lookups Claude can answer directly from training knowledge with no citation need, and NOT for internal repo/codebase questions (use code-explorer or Grep).
allowed_tools: [WebSearch, WebFetch, Read, Write]
---

# research-brief

Written directly against a failure mode found and verified 2026-09-03: `Leonxlnx/taste-skill`'s
`research/laziness/findings/references.md` cited "LazyBench", "2025 Controlled Laziness
Experiments (December 2025, three-part academic study)", and the "Winter Break Hypothesis" —
none with an author, venue, or link. It reads as a real literature review. It is not one.
This skill exists so nothing in shadow-monarchy ever ships that pattern.

## The citation contract (non-negotiable)

Every substantive claim in the output brief is one of exactly two things:

1. **Sourced** — carries `[Author/Org, "Title", Venue, Year](URL)`. The URL resolves to
   something that actually contains the claim, not a homepage or a search results page.
2. **UNVERIFIED** — flagged inline as `**UNVERIFIED:**` with one sentence on why (couldn't
   find a primary source, only saw it repeated secondhand, etc.).

There is no third category. A claim with a vague attribution ("a 2025 study found...", "researchers
have shown...") is not sourced — it goes to UNVERIFIED or gets cut. If the brief would be thin
without the unsourced claims, say so explicitly rather than padding it with confident-sounding
filler citations.

## Workflow

1. **Scope the question.** One sentence restating what's actually being asked. If ambiguous,
   ask one clarifying question rather than guessing scope.
2. **Search.** `WebSearch` for the claim space; prefer primary sources (the paper, the repo,
   the original post) over aggregator summaries. For anything that smells like an academic
   claim, look for the actual paper — a title alone (no authors, no venue) is a red flag, not
   a citation.
3. **Verify each candidate source** with `WebFetch` before citing it — confirm the page
   actually says what you're about to attribute to it. Don't cite a URL you haven't opened.
4. **Write the brief:**
   - One-paragraph summary answering the question directly.
   - Numbered findings, each ending in its citation or its UNVERIFIED flag.
   - A "Confidence" line: high (multiple independent primary sources agree), medium (one
     primary source, or several secondary sources agreeing), low (mostly UNVERIFIED, or
     sources conflict).
5. **Never round UNVERIFIED up to sourced** because the rest of the brief would look more
   authoritative. The failure mode this skill guards against is exactly that temptation.

## Output shape

```md
# Brief: <question>

**Confidence:** high | medium | low

<one-paragraph direct answer>

## Findings

1. <claim>. [Author, "Title", Venue, Year](url)
2. <claim>. **UNVERIFIED:** <why — e.g. "widely repeated but no primary source found">

## Sources consulted, not cited
<links that were checked and didn't support a claim strongly enough to cite — keeps
the search auditable>
```

## Definition of Done

Every numbered finding is either cited with a working, content-matching URL, or explicitly
marked UNVERIFIED with a reason. Zero findings with a vague or absent attribution.

## Self-Improvement Loop

If a citation later turns out to be wrong (the source doesn't say what was attributed to it,
or the URL rotted), record the failure here with the date, so the pattern that let it through
gets named and closed.
