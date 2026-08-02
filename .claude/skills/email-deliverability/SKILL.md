---
name: email-deliverability
description: "Use when Armand says \"set up email\", \"SPF DKIM DMARC\", \"emails going to spam\", \"sender reputation\", or when a product first sends transactional mail. Deliverability is mostly sender reputation with DNS plumbing as table stakes — this skill nails the plumbing and teaches the reputation part: generates the exact SPF, DKIM, and DMARC records for the chosen provider (asks: Resend or Postmark — trade-offs in one line each), explains every record in plain English, and verifies them post-publish with dig-based checks. DMARC starts at a monitoring policy (p=none with rua reporting), never jumping straight to reject. Includes the monthly health-check procedure (alignment verification, blacklist spot-check). DNS publishing itself is NEEDS YOUR HANDS — records are generated, never pushed. NOT for newsletter content (newsletter-automation) and NOT for launch copy (launch-kit)."
allowed_tools: [Read, Write, Bash, Glob, Grep]
---

# email-deliverability — plumbing is table stakes, reputation is the actual job

## Tool scope

`allowed_tools` is `[Read, Write, Bash, Glob, Grep]`. **`Write` is scoped to `docs/` in the
target repo** — this skill only creates or edits two files: `docs/email-dns-records.md` (the
generated SPF/DKIM/DMARC record templates) and `docs/email-deliverability.md` (provider choice,
post-publish verification results, and the monthly health-check log). It never writes to an
actual DNS zone file, registrar config, or calls a registrar/DNS-provider API — publishing is
**NEEDS YOUR HANDS, always**. `Bash` only runs read-only `dig` lookups for verification, never
anything that could publish or modify a DNS record. `Read`/`Glob`/`Grep` detect an existing
`docs/email-dns-records.md` from a prior run so a re-run updates it instead of duplicating.

## Overview

Sender reputation is earned — sending real mail from a domain with a track record to recipients
who open and reply — and no DNS record substitutes for it. What DNS plumbing (SPF, DKIM, DMARC)
actually buys is the prerequisite: mailbox providers won't even start evaluating reputation for a
domain whose authentication is broken or absent. This skill's job is narrow and mechanical — get
the plumbing exactly right so it's never the reason mail gets rejected — and it also teaches the
one part of the reputation game that's a DNS decision: starting DMARC at monitoring, not reject,
so the reputation-building period isn't sabotaged by silently dropped legitimate mail.

## Prerequisite check

Run first, always.

1. Ask Armand for the sending domain (or sending subdomain, e.g. `send.` in front of the apex) if
   not already given this session. **Never guess a real domain from repo config, package name, or
   any other context** — the sending domain is a business decision, not something to infer.
2. Ask Armand: Resend or Postmark? See the trade-off table below.
3. Check whether records already exist: `dig TXT <domain> +short`, `dig TXT
   <selector>._domainkey.<domain> +short`, `dig TXT _dmarc.<domain> +short`. If all three already
   resolve and look correct (see Verifying with dig), this is a health-check run, not first-time
   setup — skip ahead to Monthly health-check procedure.

**No domain named and none volunteered → report exactly that and STOP.** Generating records for a
domain nobody confirmed is worse than generating nothing.

## Provider choice: Resend vs Postmark

Pick one — don't wire both against the same sending domain.

| Provider | Trade-off |
|---|---|
| Resend | Modern developer experience, generous free tier, a single fixed-selector DKIM record (`resend._domainkey`) on a dedicated sending subdomain — the simplest DNS shape for low-to-moderate transactional volume. |
| Postmark | Longer deliverability track record and stronger dedicated-IP / bounce-and-complaint tooling for higher volume — DKIM selector varies per Sender Signature, so the exact record must be copied from its dashboard rather than assumed. |

Free-tier limits and exact console flows change without notice on both — **verify current
behavior on the provider's own docs at setup time**, don't trust anything written here as
permanent.

## Generating the DNS records (templates)

Write these to `docs/email-dns-records.md`. **Every domain below is a placeholder —
`<yourdomain.com>` — never a real domain filled in by guessing from context.** DKIM's public-key
value is generated per-domain by the provider itself; this skill formats the record, it does not
invent the key material.

```
# SPF — one TXT record only, ever, on this host
Type:  TXT
Host:  <yourdomain.com>              (or the sending subdomain, e.g. send.<yourdomain.com>)
Value: v=spf1 <provider-spf-mechanism> ~all
  - Resend:   include:_spf.resend.com
  - Postmark: SPF is largely automatic via Postmark's Return-Path — only add a TXT record here if
              the Sender Signatures → DNS Settings page explicitly asks for one, and use its
              exact value (already a full mechanism token, e.g. "include:...").

# DKIM — selector name matters, copy it exactly
Type:  TXT
Host:  <selector>._domainkey.<yourdomain.com>
Value: <exact value from the provider dashboard — unique per domain, do not invent>
  - Resend:   selector is fixed at "resend" → resend._domainkey.<yourdomain.com>
  - Postmark: selector varies per Sender Signature — copy both the hostname and the value from
              Sender Signatures → DNS Settings, don't assume a selector name.

# DMARC — always starts here, see progression below
Type:  TXT
Host:  _dmarc.<yourdomain.com>
Value: v=DMARC1; p=none; rua=mailto:dmarc-reports@<yourdomain.com>
```

## Plain-English explanations

Write these into `docs/email-deliverability.md` alongside the records so Armand (or anyone else
reading it later) isn't decoding acronyms under pressure:

- **SPF** — a list of servers allowed to send mail claiming to be from this domain. Mail from
  anywhere else on that list fails the check.
- **DKIM** — a cryptographic signature on outgoing mail, so a receiving server can verify the
  message wasn't altered in transit and really came from a server this domain authorized.
- **DMARC** — tells receiving servers what to do when SPF or DKIM fails (nothing / quarantine /
  reject), and — this is the part people skip — gets you an aggregate report (`rua`) of *every*
  server sending mail claiming to be this domain, including ones nobody remembers wiring up.

## DMARC policy progression (p=none first)

**Why monitor before reject, in plain English:** before telling receivers to quarantine or reject
anything that fails alignment, there's no way to know what *would* fail — a calendar invite from
Google Workspace, a forwarded ticket from a support tool, a legacy mail server nobody remembers
configuring. Publishing `p=reject` on day one silently drops all of that with zero warning, and
"silently dropped" in email means a password-reset link never arrives and the user blames the
product, not DMARC.

Publishing `p=none` with a working `rua=mailto:...` address first means: nothing is blocked yet,
but every DMARC-checking receiver sends back a daily aggregate report of who passed and who
failed. Read those reports for at least 2–4 weeks. Once every real sender is passing (or the ones
that aren't have been fixed or removed), move to `p=quarantine` (failing mail lands in spam, not
silently dropped) for another few weeks, and only then `p=reject`. Skipping straight to reject is
how legitimate mail disappears without anyone noticing until a customer complains.

## Verifying with dig

Run these against the real domain after Armand confirms the records are published (never before —
`dig` against unpublished records just confirms they're not there yet):

```bash
dig TXT <domain> +short
dig TXT <selector>._domainkey.<domain> +short
dig TXT _dmarc.<domain> +short
```

What good looks like:
- **SPF** — exactly one TXT record starting `"v=spf1 ..."`, e.g. `"v=spf1
  include:_spf.resend.com ~all"`. Empty output means either not propagated yet (DNS can take up
  to 24–48h) or the NEEDS YOUR HANDS publish step hasn't happened. **Two or more `v=spf1`
  records is a real bug** — receivers only honor one, silently breaking whichever they ignore.
- **DKIM** — a long base64 blob, e.g. `"v=DKIM1; k=rsa; p=MIGfMA0GCSq...IDAQAB"` (exact prefix
  varies by provider). Empty output usually means the selector hostname was copied wrong —
  double-check it against the provider's dashboard character-for-character.
- **DMARC** — `"v=DMARC1; p=none; rua=mailto:dmarc-reports@<domain>"`. Empty output means not
  published. A `p=reject` or `p=quarantine` value on a domain that hasn't run a monitoring period
  yet is worth flagging out loud, not silently accepting as someone else's prior decision.

Record PASS/FAIL/UNVERIFIED per record in `docs/email-deliverability.md` — same honesty
discipline as `monitoring-setup`'s alert verification: an unconfirmed record stays UNVERIFIED, it
never defaults to PASS because "it's probably propagated by now."

## Monthly health-check procedure

Run monthly once mail is flowing in production. Log each run in `docs/email-deliverability.md`.

1. Re-run all three `dig` checks above and confirm every value still matches what was published —
   records don't self-destruct, but a DNS provider migration or an expired zone file can silently
   drop them.
2. Pull the DMARC aggregate reports from the `rua` mailbox (or a DMARC-report parsing tool once
   reports are too voluminous to read by hand) and check the alignment percentage — is legitimate
   mail still passing SPF/DKIM, and has any new unrecognized sender shown up?
3. Blacklist spot-check the sending domain/IP against a public blacklist lookup tool — correct DNS
   doesn't protect against a domain that's landed on a blacklist for an unrelated reason.
4. Check the provider's own deliverability dashboard (Resend and Postmark both surface bounce
   rate, complaint rate, and delivery rate) — a rising bounce or complaint rate is the earliest
   warning of a reputation problem, well before any blacklist listing appears.
5. If DMARC alignment has held near 100% for several consecutive reporting cycles, this is the
   point to consider progressing the policy (`p=none` → `p=quarantine` → `p=reject`) — flag this
   as **needs-your-call**, never an automatic step. Moving early re-risks the exact silent-mail-
   loss problem the monitoring period exists to prevent.

## Definition of Done

- Sending domain and provider (Resend/Postmark) named by Armand, never guessed.
- All three record templates generated in `docs/email-dns-records.md`, DKIM's value marked
  "paste from provider dashboard" rather than invented.
- DMARC starts at `p=none` with a working `rua` address — never `p=quarantine`/`p=reject` on
  first publish.
- DNS publishing itself is marked NEEDS YOUR HANDS in `docs/email-deliverability.md` and never
  claimed as done by this skill.
- Post-publish `dig` verification actually ran (not skipped) with PASS/FAIL/UNVERIFIED recorded
  per record.
- Monthly health-check procedure is written into the doc with its cadence, ready for the next run.

## Self-Improvement Loop

When Resend or Postmark change their required DNS shape (new record type, selector convention, a
deprecated MX requirement), update the per-provider notes in Generating the DNS records before
the next run relies on a stale shape. If a third provider (SES, SendGrid, Mailgun) gets adopted,
add its record shape and trade-off line here rather than improvising one inline mid-run.
