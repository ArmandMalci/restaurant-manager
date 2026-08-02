---
name: legal-kit
description: "Use when Armand says \"terms of service\", \"privacy policy\", \"DPA\", \"cookie banner\", \"legal pages\", or before a product's public signup opens. EVERY artifact carries a hard flag: DRAFT — a human lawyer reviews before publish; this skill assists, it never signs off. Interview-or-profile first: reads .claude/context/business-profile.md when present, else asks one question at a time (entity, jurisdiction, data collected, processors, B2B/B2C) and offers to save the answers there. Generates: ToS and Privacy Policy drafts matched to what the product ACTUALLY collects (cross-references analytics-setup choices — Plausible's cookieless design often removes the consent-banner need), a DPA template for B2B customers, and a records-of-processing skeleton. Every clause carries a plain-English why. NOT for the deletion/export mechanics (dsr-ops) and NOT for entity-formation advice (lawyer/accountant territory, flagged as such)."
allowed_tools: [Read, Write, Bash, Glob, Grep]
---

# legal-kit — draft legal pages grounded in what the product actually does

## Tool scope

`allowed_tools` is `[Read, Write, Bash, Glob, Grep]`. **`Write` is scoped to two places:**
(1) `docs/legal/` in the target repo — this skill only creates or edits `docs/legal/tos.md`,
`docs/legal/privacy-policy.md`, `docs/legal/dpa-template.md`, and
`docs/legal/records-of-processing.md`; (2) `.claude/context/business-profile.md` — the shared
interview-profile file also read/written by `dsr-ops` and later business-ops skills — and only
after Armand explicitly says yes to saving (see Interview-or-profile below). This skill never
writes anywhere else: no application source, no `.env`, no actual publish target (a marketing
site's `/terms` route, a CMS). Publishing a drafted page live is a separate, human-reviewed step
this skill does not take. `Bash` is read-only here — detecting the dependency manifest
(`package.json` / `pyproject.toml` / `requirements.txt`) and running safe-grep for processor SDKs;
it never installs anything or calls an external API. `Read`/`Glob`/`Grep` find
`docs/analytics-setup.md`, the dependency manifest, and any prior `docs/legal/*` from a re-run.

## Interview-or-profile

Run this before anything else in the skill.

1. **Check for a saved profile first.** `Read` `.claude/context/business-profile.md`. If present,
   parse its five lines — `Entity:`, `Jurisdiction:`, `Data collected:`, `Processors:`, `Model:`
   (`B2B` or `B2C`) — and use them for the rest of this run. Don't re-ask what the profile already
   answers.
2. **No profile found → interview, one question at a time**, waiting for each answer before
   asking the next:
   1. "What's the legal entity for this product (name + type), or is one not yet formed?"
   2. "What jurisdiction — country, and state/province if the US — is the entity in, and where do
      most users live?"
   3. "What data does the product actually collect from users?" (cross-check against the
      Prerequisite check's evidence below — flag anything named here that the codebase doesn't
      evidence, and anything evidenced that isn't named here)
   4. "Which third-party processors hold that data?" (every vendor — analytics, email, billing,
      hosting — the mined list below is a starting point, not a replacement for confirmation)
   5. "Is this B2B or B2C?"
3. **Offer to save — never save without a yes.** After the interview, ask: "Save these answers to
   `.claude/context/business-profile.md` so the next skill run (`dsr-ops` / `finance-ops` /
   `billing-pricing` / `trust-safety`) can read them instead of re-asking?" Write the file in the
   five-line format above only on an explicit yes. A "no" or no answer means the answers are used
   for this run only and are never persisted.
4. **Never hardcode a jurisdiction fact.** Every regime name or deadline this skill's output
   mentions comes from the profile or the interview above, never from an assumption baked into
   this file — this file describes a process, not a jurisdiction's law.

## Overview

Every legal artifact this skill produces is a draft for a human lawyer to review — never a
publishable final. Its actual job is narrower and more mechanical than "write a privacy policy":
ground every data-collection claim in what the codebase and the profile actually show, so the
draft a lawyer reviews reflects the real product instead of a boilerplate template with the wrong
clauses. NOT for the deletion/export mechanics — that's `dsr-ops`. NOT for entity-formation
advice — forming an LLC or corporation is lawyer/accountant territory, flagged as such if asked.

## Prerequisite check — ground the data-collection claims

Run before drafting anything. The rule this exists to enforce: **never boilerplate-list a
data-collection or processing practice the product doesn't evidence.**

1. `Read` `docs/analytics-setup.md` if present (the `analytics-setup` skill's handoff note) — it
   names the signup event, the activation event, whether Plausible and/or PostHog are wired, and
   where. This is the primary evidence for analytics-related clauses; a product with nothing
   wired gets no analytics clause, and a product with PostHog wired gets a clause naming PostHog,
   not a vague "we may use cookies" placeholder.
2. Detect the dependency manifest and grep for known processor SDKs — safe-grep per
   `.claude/references/safe-grep-patterns.md`:
   ```bash
   grep -n "stripe\|paddle\|lemonsqueezy" package.json pyproject.toml requirements.txt 2>/dev/null
   grep -n "resend\|postmark\|sendgrid\|nodemailer" package.json pyproject.toml requirements.txt 2>/dev/null
   grep -n "posthog\|@sentry\|plausible" package.json pyproject.toml requirements.txt 2>/dev/null
   ```
   Each hit is evidence a processor is actually integrated — payments, email delivery,
   analytics/error-tracking. No hit for a category means no clause for that category, unless the
   profile's `Processors:` line names something the manifest scan can't see (e.g. a processor
   used only server-side via a raw HTTP call with no SDK dependency).
3. Reconcile the profile's `Data collected:` / `Processors:` lines against steps 1–2. Where they
   disagree, ask Armand which is authoritative before drafting — never silently pick one side.

## Generating the artifacts

Every artifact begins with the literal banner line (skill fills the real date at run time —
never a hardcoded date left over from a template):

```
> DRAFT — a human lawyer reviews before publish. Generated <YYYY-MM-DD> by legal-kit.
```

Every clause below that banner carries a one-line **why** — the reader (Armand, or the lawyer
reviewing it) should never have to guess what a clause is protecting against.

**`docs/legal/tos.md`** — Terms of Service. Sections scaled to the profile's `Model:` (B2B adds
usage-license and liability-cap language a pure B2C consumer app usually doesn't need) — service
description, acceptable use, account termination, liability limitation, governing law (the
jurisdiction from the profile, never assumed). Each clause: one line of legal text, one line of
why (e.g. "Liability cap — why: bounds exposure to the amount actually paid, standard SaaS
practice; a lawyer confirms the number and enforceability in the stated jurisdiction.").

**`docs/legal/privacy-policy.md`** — matched line-for-line to the Prerequisite check's findings:
a "What we collect" section listing only evidenced categories, a "Third parties" section naming
only processors found in steps 1–2 of the Prerequisite check (or profile-confirmed ones), and a
consent-banner call-out: if Plausible is the only analytics tool wired (cookieless by design),
say so and note a banner is often unnecessary for it specifically — worded as an observation for
the reviewing lawyer, never as legal advice this skill is qualified to give.

**`docs/legal/dpa-template.md`** — Data Processing Agreement template, generated only when the
profile's `Model:` is `B2B` (a DPA governs the relationship between this product as a processor
and a business customer as controller, or vice versa — it has no B2C analogue). If `Model:` is
`B2C` and Armand asks for one anyway, generate it but flag that a DPA's usual trigger (a B2B
customer requesting one contractually) doesn't apply here — needs-your-call whether it's still
useful.

**`docs/legal/records-of-processing.md`** — a records-of-processing skeleton (the
Article-30-style register some regimes require): purpose of processing, categories of data,
categories of recipients (the processors from the Prerequisite check), retention period
(placeholder — a real number is a business decision, ask rather than invent one), and transfers
outside the jurisdiction (flagged if any processor's data center location is known to be
elsewhere).

## Definition of Done

- Interview-or-profile ran first; the profile was read if present, or the five questions were
  asked one at a time and a save was offered (never assumed) before drafting began.
- Prerequisite check ran: `docs/analytics-setup.md` checked, dependency manifest grepped for
  known processor SDKs, and any profile/evidence mismatch was surfaced to Armand rather than
  silently resolved.
- Every generated file in `docs/legal/` opens with the literal DRAFT banner, dated at run time.
- Privacy Policy's "What we collect" and "Third parties" sections list only evidenced or
  profile-confirmed items — no boilerplate category the product doesn't actually have.
- Every clause carries a one-line why.
- `dpa-template.md` was generated only for a `B2B` profile, or its mismatch was flagged if
  generated anyway for `B2C`.
- No jurisdiction fact (deadline, regime name, governing-law choice) is hardcoded anywhere in
  this file — every instance in the output traces back to the profile or the interview.

## Self-Improvement Loop

If `analytics-setup`'s handoff-note format at `docs/analytics-setup.md` changes shape, update
step 1 of the Prerequisite check to match — this skill and that one must stay pointed at the same
file and format. If a new processor category becomes common (a new payments or email provider),
add its SDK name to the grep patterns in step 2 rather than missing it silently on future runs.
If Armand corrects a drafted clause's substance repeatedly across runs, fold the correction into
the relevant artifact section here so the next draft doesn't repeat the same lawyer-flagged issue.
