---
name: trust-safety
description: "Use ONLY when a product has UGC surfaces — uploads, comments, DMs, public profiles — and the user says \"trust and safety\", \"moderation\", \"report button\", \"UGC policy\", or a store submission nears for a UGC app. App review treats this as a GATE: missing report/block flows get UGC apps rejected, not critiqued. Generates: (1) the moderation policy doc — what is banned, the enforcement ladder, the appeal path, (2) the report/block UX spec — where the controls live, what happens on tap, the moderation-queue shape, (3) DMCA-agent and child-safety reporting notes where applicable, jurisdiction facts via interview-or-profile and flagged for human legal review. Prerequisite-check-first with teeth: no UGC surface detected in the product means SAY SO AND STOP — moderation must not be bolted onto non-UGC apps. Automated content-scanning is out of scope, named only as a future integration point. NOT for support workflows (support-ops)."
allowed_tools: [Read, Write, Bash, Glob, Grep]
---

# trust-safety — moderation policy, report/block UX, and legal-reporting notes for UGC apps only

## Tool scope

`allowed_tools` is `[Read, Write, Bash, Glob, Grep]`. **`Write` is scoped to `docs/trust-safety/`**
— this skill creates or edits `docs/trust-safety/moderation-policy.md`,
`docs/trust-safety/report-block-ux-spec.md`, and `docs/trust-safety/legal-reporting-notes.md`,
plus, with explicit consent only, the shared `.claude/context/business-profile.md` (see
Interview-or-profile). It never edits application source, never wires a real report/block
endpoint, and never calls or stubs a content-moderation API — every artifact here is a spec for
the user and a human reviewer to act on. `Bash` is read-only: safe-grepping the codebase for
UGC-surface evidence (uploads, comment models, DM routes, public profile pages) — never a database
command, never an API call. `Read`/`Glob`/`Grep` also pick up any prior `docs/trust-safety/*` from
a re-run.

## Interview-or-profile

Run this before anything else in the skill. This is the same five-line
`.claude/context/business-profile.md` format `legal-kit`/`dsr-ops`/`finance-ops`/`billing-pricing`
already read and write — copied here so the shared file never drifts into two shapes.

1. **Check for a saved profile first.** `Read` `.claude/context/business-profile.md`. If present,
   parse its five lines — `Entity:`, `Jurisdiction:`, `Data collected:`, `Processors:`, `Model:`
   (`B2B` or `B2C`) — and use them for the rest of this run, especially `Jurisdiction:` for the
   DMCA-agent and child-safety notes below. Don't re-ask what the profile already answers.
2. **No profile found → interview, one question at a time**, waiting for each answer before
   asking the next:
   1. "What's the legal entity for this product (name + type), or is one not yet formed?"
   2. "What jurisdiction — country, and state/province if the US — governs this product's
      DMCA-agent registration and child-safety reporting obligations, and where do most users
      live?"
   3. "What data does the product actually collect from users?"
   4. "Which third-party processors hold that data?"
   5. "Is this B2B or B2C?"
3. **Offer to save — never save without a yes.** Ask: "Save these answers to
   `.claude/context/business-profile.md` so `legal-kit` / `dsr-ops` / `finance-ops` /
   `billing-pricing` can read them instead of re-asking?" Write only on an explicit yes, in the
   five-line format above, unchanged.
4. **Never hardcode a jurisdiction fact.** Every regime name, agency, or deadline this skill's
   output mentions comes from the profile or the interview above, never from an assumption baked
   into this file — this file describes a process, not a jurisdiction's law.

## Overview

Three artifacts, generated only for a product that actually has a UGC surface — this skill refuses
to run past its Prerequisite check for anything else. NOT for support workflows (`support-ops`).
App-store review treats missing report/block flows as an automatic-rejection **gate**, not a
critique to weigh — that framing carries through every artifact below: this isn't a nice-to-have
policy doc, it's the thing standing between a UGC app and a rejected submission.

## Prerequisite check — UGC-surface detection (HARD GATE)

Run first, always, before drafting anything.

**Detect the stack**, then grep for concrete UGC-surface evidence in four categories — upload
endpoints, comment models, DM routes, public profile pages:

```bash
# Next.js / TS — upload endpoints
grep -rn -i "upload\|multer\|formidable\|presigned\|@aws-sdk/client-s3" \
  --include='*.ts' --include='*.tsx' \
  --exclude-dir={node_modules,dist,build,.git,.next,coverage} .

# Next.js / TS — comment models (route handlers, Prisma schema, or ORM models)
grep -rn -i "comment" \
  --include='*.ts' --include='*.tsx' --include='*.prisma' \
  --exclude-dir={node_modules,dist,build,.git,.next,coverage} .

# Next.js / TS — DM / messaging routes
grep -rn -i "direct.\?message\|conversation\|\bdm\b\|inbox" \
  --include='*.ts' --include='*.tsx' \
  --exclude-dir={node_modules,dist,build,.git,.next,coverage} .

# Next.js / TS — public profile pages
find . -path "*/app/*" -iname "*profile*" -not -path "*/node_modules/*"
grep -rn "\[username\]\|/u/\[" --include='*.ts' --include='*.tsx' \
  --exclude-dir={node_modules,dist,build,.git,.next,coverage} .

# FastAPI / Python — uploads, comments, DMs
grep -rn "UploadFile\|multipart" --include='*.py' --exclude-dir={.venv,__pycache__,.git} .
grep -rn -i "class Comment\|comment" --include='*.py' --exclude-dir={.venv,__pycache__,.git} .
grep -rn -i "direct_message\|conversation\|\bdm\b" --include='*.py' \
  --exclude-dir={.venv,__pycache__,.git} .

# Expo/RN — uploads and profile screens
grep -rn -i "ImagePicker\|expo-image-picker\|upload" --include='*.tsx' --include='*.ts' \
  --exclude-dir={node_modules,.expo,dist,build,.git} .
find . -path "*/app/*" -iname "*profile*" -not -path "*/node_modules/*" -not -path "*/.expo/*"
```

**HARD GATE — do not generate any moderation artifact past this point until at least one UGC
surface is confirmed.** A hit in any of the four categories above, or the user directly naming a
UGC surface the grep can't see (e.g. a raw HTTP upload with no SDK dependency), counts as
confirmation.

**No UGC surface found, and the user doesn't name one directly → SAY SO AND STOP.** The exact
refusal: "No upload endpoint, comment model, DM route, or public profile page was found in this
repo, and none was named. This skill does not draft a moderation policy for a UGC surface that
doesn't exist — moderation must not be bolted onto a non-UGC app on the chance one gets added
later. Add the surface, then re-run this skill." Do not draft "just in case" placeholders while
waiting for an answer — that is the exact failure mode this gate exists to prevent, same
discipline as `launch-kit`'s JTBD gate and `dsr-ops`'s no-accounts-found stop.

## 1. Moderation policy doc

Write to `docs/trust-safety/moderation-policy.md`, opening with the literal banner (dated at run
time):

```
> DRAFT — a human lawyer reviews before publish. Generated <YYYY-MM-DD> by trust-safety.
```

**What is banned** — illustrative categories, confirmed against what the detected UGC surface
actually allows (a comments-only app doesn't need an upload-specific rule): illegal content,
harassment/targeted abuse, spam/scam content, impersonation, IP infringement (see DMCA notes
below), and content endangering a minor (see child-safety notes below — this category is never
subject to the warn/restrict steps below, see that section).

**Enforcement ladder** — four steps, each with a plain-English why so the policy reads as
reasoning, not just a table:

| Step | What happens | Why |
|---|---|---|
| **Warn** | First offense or low-severity content is flagged to the user with the specific rule cited; content may be removed but the account stays fully active. | Most infractions are a misunderstanding of the rules, not malice — jumping straight to a ban over a fixable first mistake destroys retention for no safety gain. |
| **Restrict** | Repeated or moderate-severity behavior triggers a scoped limitation — rate-limited posting, a specific piece of content removed, or temporary read-only status. | Reduces the blast radius of continued bad behavior without full expulsion, and buys time to see whether the warn actually changed behavior before escalating further. |
| **Ban** | Severe content, or behavior that continues past a restriction, ends in account suspension (temporary or permanent depending on severity). | Removes the user's ability to keep causing harm once lighter steps have failed or the content itself is severe enough that no lighter step is proportionate. |
| **Appeal** | Every ban carries a stated path to contest it — a form or address, reviewed by a human. | False positives happen — automated flags misfire, context gets missed, identity gets confused. A no-appeal system turns every mistake into a permanent, unresolvable harm against a legitimate user; the appeal path is what keeps enforcement corrigible. |

Content endangering a minor skips this ladder entirely — see Child-safety reporting note below.

## 2. Report/block UX spec

Write to `docs/trust-safety/report-block-ux-spec.md`:

**Where the controls live** — every UGC surface detected above (a comment, a DM thread, a public
profile) carries a visible report affordance directly on that content — not buried three taps deep
in a settings menu. Block is reachable from the same surface (e.g. a profile's overflow menu, or a
long-press on a comment/message).

**What happens on tap:**
- **Report** opens a reason picker — spam, harassment, illegal content, content endangering a
  minor, impersonation, other — then confirms submission to the user. The minor-endangerment
  reason routes with the highest priority (see moderation-queue shape below), ahead of every other
  category by default.
- **Block** takes effect immediately: the blocked user's content stops appearing to the blocker,
  with no notification to the blocked user that they've been blocked. Never alert the blocked
  party — doing so risks retaliation against the person who just protected themselves.

**Moderation-queue shape** — reported items land in a queue with: reporter ID, reported user/
content ID, a content snapshot (so moderators aren't chasing content that's since been edited or
deleted), the reason selected, and a timestamp. The queue is priority-sorted: minor-endangerment
and illegal-content reports surface first, ahead of spam/harassment, by default — never a plain
FIFO queue for a category this severe.

## 3. DMCA-agent and child-safety reporting notes

Write to `docs/trust-safety/legal-reporting-notes.md`. **Both notes below carry two flags every
time: a jurisdiction flag and a human-legal-review flag — neither is optional, neither substitutes
for the other.**

```
> DRAFT — a human lawyer reviews before use. Generated <YYYY-MM-DD> by trust-safety.
> Jurisdiction fact: sourced from .claude/context/business-profile.md's `Jurisdiction:` line (or
> the interview above) — illustrative for the stated jurisdiction only, not asserted as universal
> or as this entity's confirmed legal obligation.
```

**DMCA-agent note** — a designated DMCA agent registration (in the US, with the Copyright Office)
is what limits a UGC platform's liability for user-uploaded content that infringes copyright;
whether it applies at all, and what the equivalent notice-and-takedown regime looks like outside
the US, depends entirely on the profile's `Jurisdiction:` line — this skill states the mechanism
in general terms and never asserts a specific registration is required or complete for this
entity. Record: does this product have a designated agent registered, where the takedown-notice
address is published, and whether the profile's jurisdiction has an equivalent regime at all — a
human lawyer confirms all three.

**Child-safety reporting note** — content endangering a minor is zero-tolerance: it skips the
enforcement ladder above entirely and goes straight to account ban plus a report to the relevant
authority (in the US, NCMEC's CyberTipline; other jurisdictions have their own reporting body,
determined by the profile's `Jurisdiction:` line, never assumed to be the US default). Record:
where in the product this reporting path is wired (who receives the report internally, and which
authority it's escalated to) — a human lawyer confirms the applicable authority and any mandatory
reporting timeline for the stated jurisdiction.

## Moderation-API integration point (named, not built)

The moderation-queue shape above has a natural point where automated content-scanning (a
Hive/Sightengine/AWS-Rekognition/OpenAI-moderation-endpoint-class API) would sit — scanning
uploads or text before or alongside human review. **This skill names that integration point in
`docs/trust-safety/report-block-ux-spec.md` and stops there: no stub function, no placeholder API
call, no mock response shape is written.** Automated content-scanning is out of scope for this
skill entirely; wiring a real provider is a separate, future piece of work with its own evaluation
of accuracy, cost, and false-positive rate.

## Definition of Done

- Prerequisite check ran; a UGC surface was either found by the grep above or named directly by
  the user — or the run stopped with the exact refusal language above and generated nothing else.
- Interview-or-profile ran (if the Prerequisite check passed); profile read if present, or the five
  questions asked one at a time with a save offered (never assumed).
- `docs/trust-safety/moderation-policy.md` states the enforcement ladder's four steps each with a
  plain-English why, and names the appeal path as a real, stated mechanism, not a placeholder.
- `docs/trust-safety/report-block-ux-spec.md` covers where controls live, what happens on tap for
  both report and block, and the priority-sorted moderation-queue shape.
- `docs/trust-safety/legal-reporting-notes.md` carries both the jurisdiction flag and the
  human-legal-review flag on both the DMCA-agent note and the child-safety note — never just one
  of the two on either note.
- The moderation-API integration point is named in the report/block UX spec with zero stub code,
  zero mock function, and zero placeholder call written anywhere in this skill's output.
- No jurisdiction fact (agency name, regime, deadline) is hardcoded as universal anywhere in this
  file.

## Self-Improvement Loop

If `business-profile.md`'s five-line format changes, update the Interview-or-profile section here
to match — this skill and `legal-kit`/`dsr-ops`/`finance-ops`/`billing-pricing` must stay pointed
at the same file and format. If the UGC-surface grep patterns start missing a real surface (a new
upload library, a differently-named comment model) or false-positive on something that isn't UGC,
tighten the patterns in the Prerequisite check rather than loosening the HARD GATE around them. If
a jurisdiction's designated-agent or child-safety-reporting mechanism is confirmed to have changed,
update the general-terms description in the legal-reporting notes section, never a hardcoded
number or agency name baked into this file.
