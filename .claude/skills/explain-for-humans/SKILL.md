---
name: explain-for-humans
description: Use when Armand needs a NON-technical, plain-language explanation of code, a system, a feature, a bug, or a technical decision — for a stakeholder, PM, designer, founder, customer, or himself stepping back. Triggers on "explain X for non-devs / in plain English / for a PM / to a stakeholder / to my boss", "ELI5 this", "what does this service/feature actually do", "summarize this codebase for someone non-technical", "why does this matter for the business", "turn this into a release note". NOT for developer-facing explanations or onboarding (answer normally / use code-explorer for that).
---

# Explain for Humans

Translate technical reality into language a smart non-engineer gets — accurate, jargon-free, focused on **what it does and why it matters**, not how it's built.

## When to use
- A stakeholder / PM / designer / founder asks what a system, feature, or service does.
- Writing a release note, a Loom/demo script, or a Linear/Notion/Slack summary for non-devs.
- Explaining a bug's impact, a tradeoff, or "why is this taking so long" without code.

## When NOT to use
- Developer-facing explanation or onboarding → answer normally or use the `code-explorer` sub-agent.
- Anything where the reader needs the code itself.

## Process

### 1. Understand the real thing (accuracy is the whole point)
- For a codebase/feature: use the `code-explorer` sub-agent (or read the relevant files) to learn what it actually does — entry points, data flow, what it produces, who depends on it.
- For a bug: confirm the actual behaviour + blast radius before translating.
- Pin down the 1–3 things that genuinely matter; discard implementation detail.

### 2. Identify the audience + the "so what"
Ask or infer: who is this for, and what decision or understanding do they need? A founder needs business impact; a designer needs user-facing behaviour; a support lead needs "who is affected and what do I tell them."

### 3. Translate
- Lead with the **one-sentence plain answer** (BLUF) before any detail.
- Use a concrete everyday **analogy** where it helps — but never let the analogy distort the truth.
- Kill the jargon, define-in-place: "endpoint" → "the address the app calls"; "migration" → "a change to how data is stored"; "race condition" → "two things happening at once and tripping over each other"; "cache" → "a saved copy kept nearby so it's faster."
- Frame around **what it does / why it matters / what it affects** — not the mechanism.
- Quantify impact in human terms where possible ("affects ~X% of loan applications", "adds ~2s to checkout").

### 4. Shape the output to the channel
- Quick question → 2–5 sentences, no headers.
- Stakeholder doc / release note → short sections: **What changed · Why it matters · What to watch.**
- Always offer a one-line TL;DR they can paste into Slack/Linear.

## Rules
- **Accuracy first.** Simple-but-wrong is worse than slightly-technical-but-right. If you simplified away a real caveat, name it in one plain sentence.
- **No jargon survives** unless defined in plain words immediately.
- **No code** in the output — that's the entire point of this skill.
- **Plain ≠ dumbed-down.** Respect the reader's intelligence; just drop the engineering vocabulary, don't condescend.
- **Say what you don't know.** If the code is ambiguous, say "this part isn't clear from the code" rather than inventing.

## Optional composition
- `code-explorer` sub-agent — to understand an unfamiliar area before explaining.
- claude-mem `timeline-report` / `pathfinder` — for "explain how this project evolved / its architecture" at a higher altitude.
