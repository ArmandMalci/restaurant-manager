---
name: support-ops
description: "Use when the user says \"support setup\", \"canned replies\", \"help docs\", \"knowledge base\", or when a product gets its first real users. Day-one support without a helpdesk suite: (1) intake channel decision — shared inbox vs a Plain/Crisp-class tool, trade-offs in one line each, account creation NEEDS YOUR HANDS, (2) a canned-reply pack drafted from the product's ACTUAL features (billing issue, bug report, refund request, how-do-I — short, in the user's direct voice), (3) a knowledge-base skeleton generated from existing docs/README with a staleness rule: each KB page names its source doc, and the page regenerates when the source changes. Prerequisite-check-first: no shipped product surface means report-and-stop. NOT for community building and NOT for meeting follow-ups (transcript-to-actions)."
allowed_tools: [Read, Write, Bash, Glob, Grep]
---

# support-ops — day-one support without a helpdesk suite

## Tool scope

`allowed_tools` is `[Read, Write, Bash, Glob, Grep]`. **`Write` is scoped to `docs/support/`** —
this skill creates or edits `docs/support/intake-channel.md`, `docs/support/canned-replies.md`,
and the `docs/support/kb/` folder (one file per knowledge-base page). It never creates an inbox,
a Plain/Crisp workspace, or any other account — every console/signup step is **NEEDS YOUR HANDS**.
`Bash` is read-only: finding the README, docs, and route files that ground the canned replies and
KB pages, plus `git log` calls for the staleness check below — it never sends an email, posts to a
support tool's API, or modifies anything outside `docs/support/`. `Read`/`Glob`/`Grep` also pick up
any prior `docs/support/*` from a re-run so this skill updates instead of duplicating.

## Overview

Three outputs: an intake-channel decision, a canned-reply pack, and a knowledge-base skeleton —
all grounded in what the product actually does, not a generic support template. NOT for community
building (Discord/forum moderation is a different job) and NOT for meeting follow-ups
(`transcript-to-actions` owns that).

## Prerequisite check — no shipped product surface means report-and-stop

Run first, always. This skill exists for a product with real users showing up in an inbox — not
one still in development.

1. Look for evidence the product has actually shipped:
   ```bash
   find . -maxdepth 2 \( -name "vercel.json" -o -name "netlify.toml" -o -name "fly.toml" \
     -o -name "render.yaml" -o -name "Dockerfile" \) -not -path "*/node_modules/*"
   find . -maxdepth 2 -name "docs" -type d
   ls docs/analytics-setup.md 2>/dev/null
   ```
   A deployment config file, a recorded production URL, or `docs/analytics-setup.md` (the
   `analytics-setup` skill's handoff note, which only exists once instrumentation went in ahead of
   a launch) is evidence of a shipped surface.
2. Ask the user directly if the grep above is inconclusive: "Is this product live for real users
   right now, or still pre-launch?" Take their answer as authoritative over the grep — the grep is a
   shortcut, not the source of truth.
3. **No shipped product surface found, and the user confirms it isn't live → report exactly that and
   STOP.** Drafting canned replies and a KB for a product with no users yet is premature scope —
   the same discipline `cost-control` applies to a repo with no paid-API call site and `dsr-ops`
   applies to a repo with no accounts.

## 1. Intake channel decision

State the trade-off in one line each — this is the user's call, recorded here, never auto-picked:

| Channel | Trade-off |
|---|---|
| Shared inbox (a plain email alias, e.g. `support@`, read via normal mail) | Zero setup cost and no new tool to learn, but no ticket states, no canned-reply shortcuts, and no SLA/queue visibility once volume grows past a few emails a day. |
| Plain-class tool | Built for software support specifically — shared inbox feel with real ticket states, saved replies, and a changelog-aware customer view — but it's another account and a monthly cost before the first ticket arrives. |
| Crisp-class tool | Adds live chat and a widget on the product itself, which shared inbox and Plain-class both lack — but chat creates an expectation of near-real-time response that a solo founder may not be able to sustain. |

**Account creation for either tool is NEEDS YOUR HANDS** — this skill states the trade-off and
records the user's pick in `docs/support/intake-channel.md`; it never signs up for Plain, Crisp, or
anything else on their behalf.

```markdown
# Intake Channel Decision

Picked: <shared inbox / Plain / Crisp — the user's choice>
Why: <one line, referencing the trade-off table above>
Account setup: NEEDS YOUR HANDS — not created by this skill.
```

## 2. Canned-reply pack — grounded in ACTUAL features

**Never draft a reply about a feature the product doesn't have.** Discover what's real first:

```bash
find . -iname "README.md" -not -path "*/node_modules/*"
grep -n "^#\{1,3\} " README.md 2>/dev/null
grep -n "stripe\|paddle\|lemonsqueezy" package.json pyproject.toml requirements.txt 2>/dev/null

# Next.js — route surface
find . -path "*/app/*" \( -name "page.tsx" -o -name "route.ts" \) -not -path "*/node_modules/*"

# FastAPI — route surface
grep -rn "@app\.\(get\|post\|put\|delete\)\|@router\.\(get\|post\|put\|delete\)" \
  --include='*.py' --exclude-dir={.venv,__pycache__,.git} .

# Expo/RN — screen surface
find . -path "*/app/*" -name "*.tsx" -not -path "*/node_modules/*" -not -path "*/.expo/*"
```

Read the README's feature headings and the route/screen list together — that's the evidence base.
A billing-related reply only gets drafted if a billing route or `stripe`/`paddle`/`lemonsqueezy`
dependency actually shows up; a feature the grep can't find gets no reply pretending it exists.

Draft four canned replies, each **short and direct, in the user's actual voice** — pull the register
straight from `.claude/rules/communication_style.md` ("Short, direct, opinionated. No
throat-clearing.") rather than defaulting to generic support-agent phrasing ("We sincerely
apologize for any inconvenience..."):

1. **Billing issue** — acknowledge, name the concrete next step (check the account's plan/invoice
   in the actual billing provider found above), no hedging language.
2. **Bug report** — acknowledge, ask for the one detail needed to reproduce (steps or a
   screenshot), no "we take all feedback seriously" filler.
3. **Refund request** — state the actual policy if one exists in the docs found above, or say
   plainly that no refund policy is written yet and this needs the user's direct answer — never
   invent a policy.
4. **How-do-I** — answer using the actual feature name and location found in the route/screen
   scan above, not a generic "check our help center" deflection.

Write to `docs/support/canned-replies.md`, one heading per reply, each reply 2–4 sentences.

## 3. Knowledge-base skeleton — staleness rule with teeth

Generate one KB page per real feature found in step 2's discovery — never a placeholder page for
a feature that doesn't exist yet.

**Every KB page opens with a `Source:` line naming the exact doc it was generated from:**

```markdown
Source: README.md#billing

# Billing

<content drawn from the named source section>
```

The `Source:` line is not decoration — it's the staleness-check's only input. A KB page with no
`Source:` line can never be checked for staleness and should not ship.

**Staleness check — exact command, run it to find pages that need regenerating:**

```bash
for kb in docs/support/kb/*.md; do
  # no -n here: this extracts a value for sed, it doesn't report a location to a human —
  # -n would inject a line-number prefix that breaks the sed match below
  src=$(grep -m1 '^Source: ' "$kb" | sed -E 's/^Source: ([^#]+).*/\1/')
  [ -z "$src" ] && { echo "NO SOURCE LINE: $kb"; continue; }
  if [ ! -e "$src" ]; then
    echo "UNVERIFIED: source $src missing (renamed or deleted) — fix the Source: line first"
    continue
  fi
  kb_date=$(git log -1 --format=%cI -- "$kb" 2>/dev/null)
  src_date=$(git log -1 --format=%cI -- "$src" 2>/dev/null)
  if [ -n "$src_date" ] && [ -n "$kb_date" ] && [[ "$src_date" > "$kb_date" ]]; then
    echo "STALE: $kb (source $src changed $src_date, page last touched $kb_date)"
  elif [ -z "$src_date" ] || [ -z "$kb_date" ]; then
    echo "UNVERIFIED: $kb (no commit history for the page and/or source \"$src\" — not yet committed)"
  fi
done
```

The existence check runs **before** any `git log` call — `git log -1 -- "$src"` on a deleted file
still returns that file's deletion-commit date, which would otherwise read as a normal, comparable
date and let a source that no longer exists silently pass into the `STALE`/clean comparison instead
of being flagged. Checking `[ ! -e "$src" ]` first catches that case on disk, before git history
ever enters the comparison.

This compares each KB page's own last-commit date against its named source file's last-commit
date via `git log`, but only once the source is confirmed to exist. Any `STALE` line means the
source changed after the KB page was last written — regenerate that page from the current source
before treating the KB as current. **A page with no git history on either side (just written, not
yet committed) or a `Source:` path that's been renamed or deleted prints `UNVERIFIED`, never
silence** — same discipline `email-deliverability`'s dig checks and `mobile-release`'s
keystore-backup row use: an unconfirmed row never defaults to clean. Run this check at the start
of every re-run of this skill, not just when the user happens to notice a stale page.

## Definition of Done

- Prerequisite check ran; if no shipped product surface was found and the user confirmed it isn't
  live, the run stopped there with nothing else generated.
- `docs/support/intake-channel.md` records the user's actual pick (not a default) with the one-line
  trade-off that led to it; no account was created by this skill.
- `docs/support/canned-replies.md` has all four replies, each grounded in a feature the discovery
  commands actually found (or the README/docs), each short and direct per
  `.claude/rules/communication_style.md`, no invented refund policy.
- Every file in `docs/support/kb/` opens with a `Source:` line naming a real file in the repo.
- The staleness-check command above ran at least once against the current KB and its output —
  clean, `STALE`, or `UNVERIFIED` — is recorded, not skipped; a page with no git history reports
  `UNVERIFIED`, never a silent clean pass.

## Self-Improvement Loop

If the staleness check's `git log`-based comparison produces false positives (e.g. a KB page
touched for a typo fix unrelated to its source content), consider adding a `--no-merges` or
content-hash-based check instead — but don't silently widen the check without recording why here.
If a new common stack shows up (Django, Rails), add its route-discovery command to step 2 rather
than guessing a shape for it inline. If the user corrects a canned reply's tone repeatedly across
runs, fold that correction into this file's example replies so the next run doesn't repeat it.
