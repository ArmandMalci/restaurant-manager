---
name: dsr-ops
description: "Use when Armand says \"GDPR delete\", \"account deletion\", \"data export\", \"DSAR\", or before ANY store release of an account-based app — Apple rejects account-creation apps without in-app deletion, and this skill is what mobile-release Gate 3 points at. The privacy policy promises rights; this makes them real: (1) scaffolds the delete-account path (endpoint + UI entry-point shape for the actual stack) with a deletion-cascade checklist across every third-party processor the repo actually uses (analytics, email, billing — mined from dependencies), listed for HUMAN verification and never auto-executed, (2) export endpoint shape (machine-readable dump of user-owned data), (3) DSAR intake note: where requests arrive and the 30-day clock. Interview-or-profile for jurisdiction specifics. NOT for policy text (legal-kit) and NOT for the store checklist itself (mobile-release)."
allowed_tools: [Read, Write, Bash, Glob, Grep]
---

# dsr-ops — the deletion/export scaffold, human-verified, never auto-executed

## Tool scope

`allowed_tools` is `[Read, Write, Bash, Glob, Grep]`. **`Write` is scoped to `docs/`** — this
skill creates or edits `docs/dsr-ops.md` (the cascade checklist, endpoint/UI shapes, and the DSAR
intake note) and, with explicit consent only, the shared
`.claude/context/business-profile.md` (see Interview-or-profile). **All endpoint and UI code in
this skill's output are advisory snippets that live inside `docs/dsr-ops.md` only** — this skill
never writes a real route file, never edits application source, and above all **never executes a
deletion or export against real data**. `Bash` is read-only: detecting the stack and dependency
manifest, and safe-grepping for account/auth surfaces and processor SDKs — never a database
command, never an API call that deletes or exports anything. `Read`/`Glob`/`Grep` also pick up
`docs/analytics-setup.md` and any prior `docs/dsr-ops.md` from a re-run.

## Interview-or-profile

Run this before anything else in the skill.

1. **Check for a saved profile first.** `Read` `.claude/context/business-profile.md`. If present,
   parse its five lines — `Entity:`, `Jurisdiction:`, `Data collected:`, `Processors:`, `Model:`
   (`B2B` or `B2C`) — and use them for the rest of this run, especially `Jurisdiction:` for the
   DSAR clock below. Don't re-ask what the profile already answers.
2. **No profile found → interview, one question at a time**, waiting for each answer before
   asking the next:
   1. "What's the legal entity for this product (name + type), or is one not yet formed?"
   2. "What jurisdiction — country, and state/province if the US — governs this product's DSAR
      obligations, and where do most users live?"
   3. "What data does the product actually collect from users?" (cross-check against the
      Prerequisite check's mined evidence below)
   4. "Which third-party processors hold that data?" (the mined list below is a starting point,
      not a replacement for confirmation)
   5. "Is this B2B or B2C?"
3. **Offer to save — never save without a yes.** Ask: "Save these answers to
   `.claude/context/business-profile.md` so `legal-kit` / `finance-ops` / `billing-pricing` /
   `trust-safety` can read them instead of re-asking?" Write only on an explicit yes, in the
   five-line format above, unchanged.
4. **Never hardcode a jurisdiction fact.** The DSAR clock, the applicable regime name, and any
   deadline this skill's output states come from the profile or this interview — never from an
   assumption baked into this file.

## Overview

The privacy policy (`legal-kit`'s output) promises deletion and export rights; this skill is what
makes the promise mechanically real — a scaffold, a cascade checklist, and an intake note, all
for Armand and a human reviewer to act on. It never acts on its own: **no deletion this skill
generates is ever executed by this skill.** This is also the named seam `mobile-release` Gate 3
points at — that gate confirms a delete-account *screen* exists in the app UI; this skill is what
generates the backend scaffold and the cascade evidence behind that screen, run before the store
release the gate is checking. NOT for policy text (`legal-kit`) and NOT for the store-listing
checklist itself (`mobile-release`).

## Prerequisite check

Run first, always.

1. **Detect the stack** — Next.js (`next.config.*` or an `app/` route-handler directory),
   FastAPI (`pyproject.toml`/`requirements.txt` listing `fastapi`, or `from fastapi import` in an
   entry file), or Expo/RN (`app.json` with an `"expo"` key). Neither detected → ask Armand rather
   than guessing a code shape for the wrong framework.
2. **Detect an account system.** Safe-grep per `.claude/references/safe-grep-patterns.md` for
   signup/auth surfaces and known auth dependencies:
   ```bash
   grep -rn -i "signup\|sign-up\|register\|createuser\|sign_up" \
     --include='*.ts' --include='*.tsx' --include='*.py' \
     --exclude-dir={node_modules,dist,build,.git,.next,.expo,coverage,.venv,__pycache__} .
   grep -n "next-auth\|@clerk\|@supabase/supabase-js\|firebase\|lucia\|passport" \
     package.json pyproject.toml requirements.txt 2>/dev/null
   ```
   **No account-creation surface found at all → report that and STOP.** Scaffolding
   deletion/export for an app with no accounts is premature scope — the same discipline
   `cost-control` applies to a repo with no paid-API call site.
3. **Mine the processor list** — the same evidence `legal-kit` grounds its Privacy Policy in,
   reused here for the cascade table:
   - `Read` `docs/analytics-setup.md` if present — names Plausible/PostHog wiring and locations.
   - Grep the dependency manifest for known processor SDKs:
     ```bash
     grep -n "stripe\|paddle\|lemonsqueezy" package.json pyproject.toml requirements.txt 2>/dev/null
     grep -n "resend\|postmark\|sendgrid\|nodemailer" package.json pyproject.toml requirements.txt 2>/dev/null
     grep -n "posthog\|@sentry\|plausible" package.json pyproject.toml requirements.txt 2>/dev/null
     ```
   - Cross-reference against the profile's `Processors:` line; reconcile disagreements with
     Armand rather than silently picking one side.
   **Only emit a cascade row for a processor actually evidenced here or confirmed by Armand** —
   never a boilerplate row for a processor the repo doesn't use.

## Deletion-cascade checklist (HUMAN VERIFIES — never auto-executed)

Write to `docs/dsr-ops.md`. **This skill never runs a deletion against any of these processors or
the app's own database — every row below is Armand's action to take and confirm**, mirroring
`cost-control`'s "advisory, never auto-applied" discipline but for data destruction instead of
code:

| Processor | What it holds | Deletion mechanism | Verified by Armand |
|---|---|---|---|
| App's own database | account row, user-owned content | cascade `DELETE` (or soft-delete + purge job) on the user's primary key across all owning tables | [ ] |
| PostHog (if mined above) | event history keyed to the user's distinct ID | PostHog's person-deletion API/dashboard action | [ ] |
| Plausible (if mined above) | aggregate, cookieless traffic stats — typically no per-user identifier to delete | confirm no personal identifier is retained; if none, this row may be marked N/A rather than left unchecked | [ ] |
| Resend / Postmark / SendGrid (if mined above) | recipient address, send/open/bounce logs | provider dashboard/API deletion or retention-window expiry — confirm the provider's actual retention policy, don't assume immediate erasure | [ ] |
| Stripe (if mined above) | payment method, billing/transaction history | Stripe customer anonymization API — full erasure is usually blocked by tax/legal record-retention requirements; note this constraint explicitly rather than promising full deletion | [ ] |
| Sentry (if mined above) | error events that may include user identifiers if not scrubbed | Sentry's data-scrubbing settings + manual event purge | [ ] |

Only the rows evidenced in the Prerequisite check's mining step (or confirmed by Armand) appear in
the real output — the table above is the reference set this skill draws from, not a fixed
template to reproduce unchanged. Each row's checkbox stays unchecked until Armand has personally
verified the deletion mechanism against that processor's real current behavior — this skill marks
nothing verified on its own.

## Delete-account scaffold (ADVISORY — never applied to real source)

Endpoint + UI entry-point shape for the detected stack, written into `docs/dsr-ops.md` only:

**Next.js route-handler shape (ADVISORY):**
```ts
// app/api/account/route.ts — advisory shape, adapt to this repo's real auth + DB layer
import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(req: NextRequest) {
  const userId = await getAuthenticatedUserId(req); // however this repo already does auth
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  // 1. cascade-delete (or soft-delete + queue purge) every owning table for userId
  // 2. record the deletion for the audit trail BEFORE dropping the row it references
  // 3. this route triggers the app's own DB deletion only — the cascade table above's
  //    third-party rows are Armand's separate, verified actions, not this endpoint's job
  return NextResponse.json({ status: 'deletion scheduled' });
}
```

**FastAPI route shape (ADVISORY):**
```python
# advisory shape — adapt to this repo's real auth dependency + DB layer
from fastapi import APIRouter, Depends, HTTPException

router = APIRouter()

@router.delete("/account")
async def delete_account(user = Depends(get_current_user)):
    if user is None:
        raise HTTPException(status_code=401, detail="unauthorized")
    # cascade-delete (or soft-delete + queue purge) every owning table for user.id
    return {"status": "deletion scheduled"}
```

**UI entry-point shape:** Settings → Account → "Delete my account" action behind an explicit
confirmation step (re-enter password / type the account name) — this is the screen `mobile-
release` Gate 3 checks for; wiring it to the endpoint above is a separate, reviewed change this
skill's advisory snippet does not make on its own.

## Export endpoint shape (ADVISORY)

Machine-readable dump of the user's own data from the app's own database — third-party processor
data is out of this endpoint's scope (pulling copies from each processor's own export API, where
one exists, is a manual step recorded in the cascade table above, not generated here).

```ts
// app/api/account/export/route.ts — advisory shape, adapt to this repo's real auth + DB layer
export async function GET(req: NextRequest) {
  const userId = await getAuthenticatedUserId(req);
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const data = await gatherUserOwnedData(userId); // every table this user's ID owns
  return NextResponse.json(data); // JSON — machine-readable, per the DSAR export requirement
}
```

## DSAR intake note

Ask Armand, and record in `docs/dsr-ops.md`: "Where do deletion/export requests arrive today — a
support inbox address, a form, both?" Never invent an address.

**The 30-day clock, with the jurisdiction caveat this skill always carries:** GDPR's commonly
cited default response window is 30 days (extendable once, with notice). This number is
illustrative, not asserted as the number that governs this product — the profile's
`Jurisdiction:` line (or the interview above) determines the actual regime, and different
regimes set different clocks (CCPA's is 45 days, also extendable once; others vary further). A
human lawyer confirms the number that actually applies — this skill states the commonly-cited
figure so the intake note has a placeholder to fill, it never hardcodes a jurisdiction's law as
universal.

## Definition of Done

- Interview-or-profile ran first; profile read if present, or the five questions were asked one
  at a time with a save offered (never assumed).
- Prerequisite check ran: stack detected, an account-creation surface confirmed present (or the
  run stopped and reported "no accounts found" — that's a valid, complete run), processor list
  mined from the dependency manifest and `docs/analytics-setup.md`.
- The cascade table in `docs/dsr-ops.md` contains only rows evidenced by mining or confirmed by
  Armand, every "Verified by Armand" checkbox starts unchecked, and this skill has not executed
  any deletion against anything.
- Delete-account and export endpoint shapes are written into `docs/dsr-ops.md` only — no
  application source file was created or edited.
- The DSAR intake note names a real request-arrival channel Armand gave, and the 30-day figure
  carries the jurisdiction caveat rather than being stated as this product's actual deadline.
- No jurisdiction fact is hardcoded as universal anywhere in this file.

## Self-Improvement Loop

If `legal-kit`'s processor-mining grep patterns change, mirror the change here — both skills read
the same dependency-manifest evidence and must not drift onto different detected-processor lists.
If `docs/analytics-setup.md`'s format changes, update the Prerequisite check's read here to match.
When `mobile-release` Gate 3's account-deletion row starts reading this skill's cascade-table
evidence directly instead of just pointing at it, update the Overview's seam description to name
the real link. If a new common processor category emerges, add its row and grep pattern to the
Deletion-cascade checklist rather than improvising one inline mid-run.
