---
name: billing-pricing
description: "Use when Armand says \"set up billing\", \"Merchant of Record\", \"pricing review\", \"subscriptions\", \"dunning\", or before a product charges its first customer. Two halves: (1) BILLING PLUMBING — the MoR decision first: a Paddle/Lemon-Squeezy-class Merchant of Record offloads global sales-tax/VAT nexus, the compliance trap solo founders miss; Stripe-direct only with that trade-off stated plainly. Then the webhook-handler checklist for the subscription lifecycle, including failed-payment dunning — recovered revenue routinely beats new marketing spend. (2) PRICING REVIEW — a periodic pass over tiers vs unit economics, consuming cost-control's cost-to-serve note; usage-vs-seat trade-offs stated in plain English. All account/console steps NEEDS YOUR HANDS; pricing decisions needs-your-call. NOT for tax filing or runway (finance-ops)."
allowed_tools: [Read, Write, Bash, Glob, Grep]
---

# billing-pricing — MoR decision, subscription plumbing, and a pricing review grounded in unit economics

## Tool scope

`allowed_tools` is `[Read, Write, Bash, Glob, Grep]`. **`Write` is scoped to
`docs/billing-pricing.md`** — this skill creates or edits that single file (the MoR decision
record, the webhook-handler checklist, dunning notes, and the pricing review) plus, with explicit
consent only, the shared `.claude/context/business-profile.md` (see Interview-or-profile). It
never creates a Stripe/Paddle/Lemon Squeezy account, never registers a real webhook endpoint, and
never changes a live price — every account/console step is NEEDS YOUR HANDS and every pricing
change is needs-your-call, Armand's decision recorded here, never auto-applied. `Bash` is
read-only: detecting the stack and dependency manifest, and safe-grepping for a billing SDK
already integrated so the MoR/webhook advice matches what's actually there, not a guess.
`Read`/`Glob`/`Grep` also read `docs/unit-economics.md` (the seam `cost-control` writes) for the
Pricing Review.

## Interview-or-profile

Run this before anything else in the skill.

1. **Check for a saved profile first.** `Read` `.claude/context/business-profile.md`. If present,
   parse its five lines — `Entity:`, `Jurisdiction:`, `Data collected:`, `Processors:`, `Model:`
   (`B2B` or `B2C`). This skill's own logic mainly draws on `Jurisdiction:` (sales-tax/VAT nexus
   shapes the MoR-vs-Stripe-direct call) and `Model:` (B2B leans seat-based, B2C leans
   usage-based — see Pricing Review), but read all five so nothing needs re-asking on a later run.
2. **No profile found → interview, one question at a time**, the same five canonical questions
   every business-ops skill asks, waiting for each answer before asking the next:
   1. "What's the legal entity for this product (name + type), or is one not yet formed?"
   2. "What jurisdiction — country, and state/province if the US — is the entity in, and where do
      most paying customers live?"
   3. "What data does the product actually collect from users?"
   4. "Which third-party processors hold that data?"
   5. "Is this B2B or B2C?"
3. **Offer to save — never save without a yes.** Ask: "Save these answers to
   `.claude/context/business-profile.md` so `finance-ops` / `legal-kit` / `dsr-ops` /
   `trust-safety` can read them instead of re-asking?" Write only on an explicit yes, in the
   five-line format above, unchanged.
4. **Never hardcode a jurisdiction fact.** The nexus/VAT reasoning below names the trade-off in
   general terms — it never asserts a specific tax rate or registration threshold as current or
   binding; that's confirmed with an accountant, same discipline as `finance-ops`.

## Overview

Two halves, always in this order: BILLING PLUMBING first (the MoR decision gates everything
downstream — deciding a webhook shape before picking Stripe-direct-vs-MoR is backwards), then
PRICING REVIEW. NOT for tax filing or runway (`finance-ops`).

## Prerequisite check

1. Detect the stack the same way `cost-control` and `dsr-ops` do — Next.js (`next.config.*` or an
   `app/` route-handler directory) vs FastAPI (`pyproject.toml`/`requirements.txt` listing
   `fastapi`, or `from fastapi import` in an entry file).
2. Detect an existing billing SDK — safe-grep per `.claude/references/safe-grep-patterns.md`:
   ```bash
   grep -n "stripe\|paddle\|lemonsqueezy" package.json pyproject.toml requirements.txt 2>/dev/null
   ```
   A hit here means a billing decision may already be made — reconcile it with the MoR call below
   rather than re-litigating from zero. No hit means this is a from-scratch decision.

## 1. BILLING PLUMBING

### The MoR decision, first

State the trade-off plainly, every time, before any webhook detail:

- **Merchant of Record (Paddle, Lemon Squeezy-class)** — the MoR becomes the seller of record and
  handles global sales-tax/VAT registration and remittance across every jurisdiction a customer
  might be in. This offloads the compliance trap solo founders most often miss: crossing a
  registration threshold in a country or US state without knowing it, then owing back taxes and
  penalties with no accountant watching for it. Trade-off: the MoR takes a materially larger cut
  than a payment processor's raw fee, and Armand gives up some checkout/branding control.
- **Stripe-direct (or an equivalent PSP)** — cheaper per-transaction, full control over checkout
  and branding, but Armand's entity is the seller of record and owns sales-tax/VAT registration
  and remittance everywhere it applies. This is viable only with that obligation genuinely
  understood and, ideally, an accountant or tax-automation add-on in the loop — never silently
  assumed away.

**Default recommendation for a solo founder with no dedicated finance/tax function: MoR first,
Stripe-direct only as a deliberate, informed trade-off** — record which Armand picked and why in
`docs/billing-pricing.md`; this is a needs-your-call decision, never auto-selected.

### Webhook-handler checklist (subscription lifecycle)

Advisory shape only — written into `docs/billing-pricing.md`, never applied to real source; the
provider dashboard/webhook-registration step is NEEDS YOUR HANDS regardless of which route is
chosen:

| Event | What it must do |
|---|---|
| `checkout.completed` / `subscription.created` | Provision access, record the plan + billing ID |
| `subscription.updated` (plan change) | Update the account's entitlements to match the new plan |
| `invoice.payment_failed` | Enter dunning (see below) — never revoke access on the first failure |
| `invoice.paid` | Clear any dunning state, confirm access remains active |
| `subscription.canceled` / `deleted` | Revoke access at period end, not immediately, unless the provider's cancellation semantics say otherwise |

```ts
// advisory shape — adapt to this repo's real webhook-signature verification + DB layer
export async function POST(req: NextRequest) {
  const event = await verifyWebhookSignature(req); // provider SDK, never skip verification
  switch (event.type) {
    case 'invoice.payment_failed':
      await enterDunning(event.data.customerId); // schedule retries, don't revoke yet
      break;
    // ...other cases per the table above
  }
  return NextResponse.json({ received: true });
}
```

**Dunning**, stated plainly because it's the highest-leverage line in this checklist: a real retry
schedule plus a customer-facing "update your card" email recovers a meaningful share of failed
payments — **recovered revenue on existing customers routinely beats the cost of acquiring new
ones**, so dunning is not an edge case to skip for later. Minimum shape: 2–3 automatic retries over
~1–2 weeks (provider-native retry logic where available), a dunning email at first failure and
again before final cancellation, and access held (not revoked) until retries are exhausted.

## 2. PRICING REVIEW

Reads **`docs/unit-economics.md`** (the exact path `cost-control` writes) — its literal header
row is this review's ground truth, quoted verbatim from `cost-control`'s own template:

```
| Plan | Price / user / month | Cost-to-serve estimate | Margin | Judgment calls |
```

If that file doesn't exist yet, say so and stop — a pricing review with no cost-to-serve data is
a guess, not a review, same discipline `cost-control` applies to its own unit-economics note.

For each plan row: is price comfortably above cost-to-serve, or is margin thin/negative? Flag any
plan where margin looks wrong given what `docs/unit-economics.md`'s judgment calls already admit
are estimates, rather than treating a thin-margin plan as settled fact.

**Usage-vs-seat, stated in plain English:** seat-based (price per named user) is simpler to
explain and predict but rewards low-usage customers and punishes high-usage ones on the same
plan; usage-based (price per unit consumed) tracks cost-to-serve more accurately but is harder to
predict and can surprise customers with variable bills. The profile's `Model:` line is a starting
signal — B2B seat licenses are a familiar procurement shape, B2C usage-based can align price with
value more directly — but this is Armand's call, never this skill's default.

**Every pricing change coming out of this review is needs-your-call** — the skill states the
trade-off and the unit-economics evidence; it never edits a live price, plan, or checkout
configuration itself.

## Definition of Done

- Interview-or-profile ran first; profile read if present, or the five questions asked one at a
  time with a save offered (never assumed).
- Prerequisite check ran: stack detected, existing billing SDK (if any) reconciled with the MoR
  decision rather than ignored.
- The MoR-vs-Stripe-direct trade-off is stated plainly and a choice (with reasoning) is recorded
  in `docs/billing-pricing.md` — never silently defaulted without the trade-off being shown.
- Webhook-handler checklist covers the full subscription lifecycle table above, including a
  dunning flow that holds access instead of revoking on first failure.
- Pricing Review reads `docs/unit-economics.md` at that exact path and those exact columns, or
  stops and says the file is missing rather than guessing numbers.
- Every account/console step is marked NEEDS YOUR HANDS; every pricing decision is marked
  needs-your-call; nothing here creates an account, registers a live webhook, or changes a live
  price.
- No jurisdiction-specific tax rate or threshold is hardcoded as current or binding anywhere in
  this file.

## Self-Improvement Loop

If `cost-control`'s `docs/unit-economics.md` format or path changes, update the Pricing Review's
read here to match — this seam must not drift. If `business-profile.md`'s five-line format
changes, update the Interview-or-profile section to match. If a provider's dunning/retry defaults
change materially, update the webhook-handler checklist's minimum shape rather than leaving a
stale recommendation in place.
