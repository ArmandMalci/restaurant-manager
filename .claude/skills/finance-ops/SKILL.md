---
name: finance-ops
description: "Use when the user says \"runway\", \"taxes\", \"bookkeeping\", \"quarterly filing\", or when the quarterly finance Routine fires. Not an accountant — a disciplined nag with a spreadsheet: (1) runway tracker — burn vs cash in one table, computed only from numbers the user provides in the session, never guessed or scraped, (2) filing-deadline calendar seeded by jurisdiction from .claude/context/business-profile.md (asks if absent; deadlines are jurisdiction-specific and the calendar says so — an accountant confirms dates), (3) the quarterly checklist: reconcile payouts, estimated-tax reminder, receipts sweep, one what-changed note. Every output carries the human-accountant-reviews flag. Report-only when run by the Routine — it never books, files, or moves money. NOT for pricing strategy (billing-pricing) and NOT for spend caps (cost-control)."
allowed_tools: [Read, Write, Bash, Glob, Grep]
---

# finance-ops — a disciplined nag with a spreadsheet, never an accountant

## Tool scope

`allowed_tools` is `[Read, Write, Bash, Glob, Grep]`. **`Write` is scoped to `docs/finance/`** —
this skill creates or edits `docs/finance/runway.md`, `docs/finance/filing-calendar.md`, and
`docs/finance/quarterly-checklist.md`, plus, with explicit consent only, the shared
`.claude/context/business-profile.md` (see Interview-or-profile). It never touches a real
accounting system, bank, payment processor, or tax authority — no booking, no filing, no money
movement, under any invocation. `Bash` is read-only: detecting the dependency manifest and
safe-grepping for the billing processor already in use (Stripe/Paddle/Lemon Squeezy) so the
reconcile-payouts step in the quarterly checklist asks about the right provider. `Read`/`Glob`/
`Grep` also pick up `docs/cost-control.md` and any prior `docs/finance/*` from a re-run.

## Interview-or-profile

Run this before anything else in the skill.

1. **Check for a saved profile first.** `Read` `.claude/context/business-profile.md`. If present,
   parse its five lines — `Entity:`, `Jurisdiction:`, `Data collected:`, `Processors:`, `Model:`
   (`B2B` or `B2C`) — this skill's own logic mainly draws on `Entity:` and `Jurisdiction:` (the
   filing-deadline calendar is seeded from `Jurisdiction:`; `Entity:` names who's filing), but
   read all five so nothing needs re-asking on a later run by another skill.
2. **No profile found → interview, one question at a time**, waiting for each answer before
   asking the next (the same five canonical profile fields every business-ops skill asks — question
   wording varies by skill — so whichever skill runs first fully seeds the shared file):
   1. "What's the legal entity for this product (name + type), or is one not yet formed?"
   2. "What jurisdiction — country, and state/province if the US — governs this entity's tax
      filings?"
   3. "What data does the product actually collect from users?"
   4. "Which third-party processors hold that data?"
   5. "Is this B2B or B2C?"
3. **Offer to save — never save without a yes.** Ask: "Save these answers to
   `.claude/context/business-profile.md` so `legal-kit` / `dsr-ops` / `billing-pricing` /
   `trust-safety` can read them instead of re-asking?" Write only on an explicit yes, in the
   five-line format above, unchanged.
4. **Never hardcode a jurisdiction fact.** Every deadline this skill's calendar states is an
   illustrative example tied to the profile's `Jurisdiction:` line, flagged for an accountant to
   confirm — never asserted here as this entity's actual, binding deadline.

## Overview

Three outputs, each report-only: a runway tracker, a filing-deadline calendar, and a quarterly
checklist. This skill is not an accountant and never behaves like one — it never books a
transaction, never files a return, never initiates a payment or transfer, in any invocation mode,
including when the `finance-quarterly` Routine fires it unattended. NOT for pricing strategy
(`billing-pricing`) and NOT for spend caps (`cost-control`).

Every one of the three artifacts below opens with the same literal banner line (the skill fills
the real date at run time — never a hardcoded date left over from a template):

```
> DRAFT — a human accountant reviews before use. Generated <YYYY-MM-DD> by finance-ops.
```

## 1. Runway tracker

Burn vs cash in one table — **computed only from numbers the user provides in this session**.
Never guessed, never scraped from a bank or processor API (this skill has no such access and
would not use it if it did). If a number is missing, ask for it and stop there rather than
estimating.

Ask, one at a time if not already given this session: current cash balance, average monthly burn
(or the last 1–3 months' burn if it varies), and any known one-off inflows/outflows this quarter.

Write to `docs/finance/runway.md`:

```markdown
# Runway Tracker

> DRAFT — a human accountant reviews before use. Generated <YYYY-MM-DD> by finance-ops.
> Report-only. Numbers below are exactly what the user provided this session — nothing scraped,
> nothing estimated.

| Metric | Value | As of |
|---|---|---|
| Cash on hand | $<from the user> | <date> |
| Avg monthly burn | $<from the user> | <date> |
| Runway (cash ÷ burn) | <computed> months | <date> |

Notes: <any one-off inflow/outflow the user named, e.g. "Q3 includes a one-time $X invoice payout">.
```

## 2. Filing-deadline calendar

Seeded by the profile's `Jurisdiction:` line (asks if absent — see Interview-or-profile).
**Every deadline is an illustrative example, not an assertion of this entity's actual legal
obligation** — the calendar states this in its own banner, not just in this skill's
documentation.

Write to `docs/finance/filing-calendar.md`:

```markdown
# Filing-Deadline Calendar

> DRAFT — a human accountant reviews before use. Generated <YYYY-MM-DD> by finance-ops.
> EXAMPLE deadlines only, seeded from jurisdiction "<Jurisdiction: value>". Regimes, forms, and
> cadences vary by entity type and change over time — nothing here is asserted as current law.

| Filing (illustrative) | Typical cadence | Illustrative next date | Accountant-confirmed? |
|---|---|---|---|
| <e.g. estimated income tax prepayment> | Quarterly | <example date> | [ ] |
| <e.g. VAT / sales-tax return> | <example cadence> | <example date> | [ ] |
| <e.g. annual entity return> | Annual | <example date> | [ ] |

Rows are named from common patterns for the stated jurisdiction — not a complete or authoritative
list. The user's accountant is the source of truth for what actually applies and when.
```

## 3. Quarterly checklist

The core of what the `finance-quarterly` Routine runs. Every item below is report-only — the
skill reconciles, reminds, and notes; it never executes a booking, filing, or transfer.

1. **Reconcile payouts.** Detect the billing processor already in use — safe-grep per
   `.claude/references/safe-grep-patterns.md`:
   ```bash
   grep -n "stripe\|paddle\|lemonsqueezy" package.json pyproject.toml requirements.txt 2>/dev/null
   ```
   Ask the user for this quarter's payout total from that processor's own dashboard (this skill has
   no API access to fetch it) and whether it matches their expectation. Record any mismatch as a
   flagged item — never silently resolve it.
2. **Estimated-tax reminder.** Point at the next illustrative date in the filing calendar above
   and remind the user it's approaching — never compute or suggest a specific amount to pay; that's
   the accountant's call.
3. **Receipts sweep.** Ask the user to gather this quarter's receipts (or confirm they're already
   filed somewhere); this skill has no mailbox or storage access to fetch them itself.
4. **What-changed note.** One line, in the user's own words if possible: what changed in the
   business this quarter (new plan, pricing change, entity change, new processor). Feeds
   `docs/finance/quarterly-checklist.md` and flags `legal-kit`/`billing-pricing` re-runs if the
   change touches their scope.

Write the completed pass to `docs/finance/quarterly-checklist.md`:

```markdown
# Quarterly Checklist — <YYYY-Qn>

> DRAFT — a human accountant reviews before use. Generated <YYYY-MM-DD> by finance-ops.

| Item | Outcome | Date |
|---|---|---|
| Reconcile payouts | <matched / mismatch flagged, with the number the user gave> | <date> |
| Estimated-tax reminder | <next illustrative deadline surfaced> | <date> |
| Receipts sweep | <gathered / confirmed already filed> | <date> |
| What-changed note | <one line, the user's words> | <date> |
```

## Report-only mode (the finance-quarterly Routine)

When this skill is invoked by the `finance-quarterly` Routine (or any other unattended/headless
run), it runs strictly in report-only mode: for every number in sections 1–3 above that isn't
already known from the session, it lists exactly what it needs from the user and **stops there** —
it never estimates, never carries over a stale number from a prior run as current, and never
books, files, or moves anything, regardless of how the run was triggered.

## Definition of Done

- Interview-or-profile ran first; profile read if present, or the five questions asked one at a
  time with a save offered (never assumed).
- Runway tracker in `docs/finance/runway.md` contains only numbers the user gave this session — no
  guessed or scraped figures — or explicitly lists what's still missing and stops.
- Filing calendar in `docs/finance/filing-calendar.md` is seeded from the profile's
  `Jurisdiction:` line, every row marked illustrative, every "Accountant-confirmed?" checkbox
  starts unchecked.
- All three artifacts (`runway.md`, `filing-calendar.md`, `quarterly-checklist.md`) open with the
  same literal `DRAFT — a human accountant reviews before use` banner, dated at run time.
- Quarterly checklist in `docs/finance/quarterly-checklist.md` covers all four items, each dated.
- No booking, filing, or money movement occurred under any invocation, including the Routine.
- No jurisdiction fact is hardcoded as this entity's actual, binding deadline anywhere in this
  file.

## Self-Improvement Loop

If `business-profile.md`'s five-line format changes, update the Interview-or-profile section here
to match — this skill and `legal-kit`/`dsr-ops`/`billing-pricing`/`trust-safety` must stay pointed
at the same file and format. If the `finance-quarterly` Routine's prompt wording changes, update
the Report-only mode section to match it exactly rather than letting the two drift apart. If a new
common billing processor emerges, add its grep pattern to the reconcile-payouts step.
