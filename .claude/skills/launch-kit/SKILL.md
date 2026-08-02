---
name: launch-kit
description: "Use when the user says \"launch kit\", \"write my landing page copy\", \"prepare the Product Hunt / Show HN launch\", \"positioning for X\", \"launch plan\", or when a project nears shippable. HARD GATE: runs a JTBD positioning interview FIRST (what job is this hired for, what real alternative it displaces, functional/emotional/social outcomes) and REFUSES to generate any copy until it is answered — copy-before-positioning is the classic indie-launch failure. Then produces: a positioning one-pager (including an explicit \"who this is NOT for\" section), PAS-structured landing hero copy with JTBD-framed feature lines (\"so you can ___\"), per-channel launch briefs (Product Hunt hour-by-hour day-of checklist + maker's comment; Show HN title + first-comment draft; Reddit disclosure-first framing; X demo-clip script), and a 3-email pre-launch sequence, each artifact carrying an inline why-comment. NOT for ongoing content marketing (newsletter-automation / repurpose-youtube) and NOT for SEO mechanics (seo-audit)."
allowed_tools: [Read, Write, Bash, Glob, Grep]
---

# launch-kit — JTBD-gated launch copy generator

## Overview

The user named marketing their weakest area. This skill is a thinking tool, not a template
filler: it forces a Jobs-to-be-Done positioning decision before it will write a single
line of copy, because copy written before positioning is the classic indie-launch
failure — polished sentences arguing for the wrong thing, fixed by rewriting everything
after launch day instead of before it.

Reads the target project (README, package.json/pyproject, existing landing page if any)
to ground the interview in specifics, then interviews the user, then writes five artifacts
into a `launch/` folder in the target project. NOT for recurring content (newsletter-automation,
repurpose-youtube — see the seo-marketing pack), NOT for SEO mechanics (seo-audit), NOT for
post-launch metrics (growth-review — this skill only states the rule, growth-review is where
you track it).

## Tool scope

`allowed_tools` is `[Read, Write, Bash, Glob, Grep]`. **`Write` is scoped to the target
project's `launch/` folder only** — every file this skill creates or edits lives under
`launch/`; never write to the project's actual source, config, or existing docs. `Bash` is
for `mkdir -p launch` and nothing more exotic. `Glob` checks what's already in `launch/`
before re-running the interview mid-session. The JTBD interview itself runs on
**AskUserQuestion**, a built-in interaction primitive — it needs no entry in `allowed_tools`.

## The JTBD interview (hard gate)

Five questions. Ask via AskUserQuestion **one at a time** — send the next question only
after the current one is answered. Each question below is phrased as an AskUserQuestion
prompt: a short header, the question text, 2–3 short illustrative options plus an
"Other — describe in your own words" option, since JTBD answers are product-specific and
rarely fit a preset choice.

1. **The job.** "What job is this project actually hired to do — what task is someone
   trying to get done, in their life or work, when they reach for it?" Illustrative
   options: *"Get from idea to shipped faster"*, *"Stop doing X manually"*, *"Make X
   decision with confidence"*, *"Other — describe it"*.
2. **The displaced alternative.** "What do they use right now instead — a competitor, a
   spreadsheet, a manual process, a freelancer, or literally nothing? What's the real
   alternative this replaces?" Options: *"A named competitor"*, *"A manual/DIY workaround"*,
   *"Nothing — they just don't do this today"*, *"Other — describe it"*.
3. **The functional outcome.** "What's the concrete, measurable result they get once the
   job is done well? (e.g. 'ships a landing page in an hour' vs. 'three days of
   back-and-forth with a freelancer')" Options: *"Saves time"*, *"Saves money"*, *"Produces
   a specific deliverable"*, *"Other — describe it"*.
4. **The emotional outcome.** "How do they want to feel — or stop feeling — once the job
   is done?" Options: *"Relief from dread/anxiety"*, *"Confidence instead of
   second-guessing"*, *"Pride in the result"*, *"Other — describe it"*.
5. **The social outcome.** "How do they want to be seen by whoever's watching — a boss, a
   client, their team, their followers — once the job is done?" Options: *"Looks
   competent/on top of things"*, *"Looks ahead of the curve"*, *"Doesn't want to be seen at
   all — private win"*, *"Other — describe it"*.

**HARD GATE — do not generate any copy past this point until all five are answered.** A
vague or placeholder answer ("faster I guess") is not an answer — re-ask that one question
before moving on. Do not draft artifacts "provisionally" while waiting; that's the exact
failure mode this skill exists to prevent.

## Artifact generation order

**Nothing below runs until the JTBD interview gate above is fully cleared.** Once it is,
generate in this order — each artifact quotes decisions made by the one before it, so
generating out of order produces four channel briefs each guessing at positioning
independently, which is the drift a launch-day scramble can't fix:

1. `launch/interview-answers.md` — the raw Q&A, verbatim. Every later file quotes this one.
2. `launch/positioning-one-pager.md` — repeats the interview answers at the top, then
   derives the one-line positioning statement and the "who this is NOT for" section.
3. `launch/landing-hero-copy.md` — PAS hero copy whose "so you can ___" feature lines are
   pulled directly from the functional/emotional outcomes recorded in step 2.
4. `launch/channel-briefs.md` — Product Hunt, Show HN, Reddit, and X briefs, each opening
   line drawn from step 2's positioning statement so every channel says the same thing in
   a different register.
5. `launch/email-sequence.md` — written last because it needs step 3's angle to know what
   email 1 is even pre-selling.

## The launch-day metric rule

Watch **signup → activation**, never list size. A big waitlist or a big Show HN upvote
count is vanity if none of it converts to the one named activation event (e.g. "created a
project" — never "logged in", per the same naming discipline growth-review uses for its
funnel). Launch day success is measured by how many of today's signups do the activating
action, not by how many people showed up. State this rule in `channel-briefs.md`'s Product
Hunt section — that's the artifact the user opens first on launch morning, so the reminder
lands right before they need it, not buried in a one-pager they read a week earlier.

## Output layout

One `launch/` folder in the target project, one file per artifact — never write outside it:

```
<target-project>/launch/
  interview-answers.md
  positioning-one-pager.md
  landing-hero-copy.md
  channel-briefs.md
  email-sequence.md
```

`mkdir -p launch` before the first Write. Before starting the interview, Glob `launch/*.md`
— if `interview-answers.md` already exists from earlier in the same session, don't re-ask;
resume from wherever generation stopped. A fresh session for a different project always
starts the interview from question 1.

## Artifact specs

### 1. `interview-answers.md`
The five Q&A pairs, question then answer, nothing else. This is the source of truth every
other artifact quotes — never paraphrase it away in later files, quote it.

### 2. `positioning-one-pager.md`
Opens with the interview answers verbatim (this satisfies the Definition of Done's
recording requirement), then:
- **One-line positioning statement** — "For [who] who [job], [project] is the
  [category] that [functional outcome], unlike [displaced alternative]."
- **"Who this is NOT for"** — 3–5 bullets naming the person this is deliberately *not*
  built for. Why this section exists: exclusion is what makes inclusion legible — a
  product that claims to be for everyone reads, to the one person it's actually for, as a
  product for no one. Naming the wrong-fit reader sharpens the right-fit reader's
  recognition faster than any amount of describing them directly.

### 3. `landing-hero-copy.md`
PAS-structured (Problem → Agitate → Solve), with JTBD-framed feature lines ("so you can
___", each one tying a feature to the functional or emotional outcome from the interview).
Why PAS agitates before it solves: naming the problem once isn't enough to make the reader
feel its real cost — a solve offered before the cost registers reads as a feature nobody
asked for. Agitation is what calibrates how much relief the solve actually delivers; skip
it and the solve has nothing to be relief *from*.

### 4. `channel-briefs.md`
Four sections, one per channel — don't invent mechanics beyond these:

- **Product Hunt** — hour-by-hour day-of checklist + a maker's comment draft. Why the
  checklist is hour-by-hour, not day-by-day: Product Hunt's ranking is driven by early
  velocity — votes and comments in the launch's first ~4 hours decide whether it surfaces
  on the homepage for the rest of the day. A strong full day with a slow start still
  loses; the first 4 hours *is* the launch, not the warm-up for it (per 2026
  launch-playbook research; ranking mechanics drift — sanity-check current PH behavior in
  the week before launch day, see Self-Improvement Loop).
- **Show HN** — title + first-comment draft. The maker posts the first comment
  immediately, not after the thread has already formed an opinion — it's the one place to
  say what a polished landing page can't: why this exists, built by whom, and what's
  rough about it on purpose.
- **Reddit** — disclosure-first framing, not a pitch. Why: Reddit's culture and
  moderation actively punish posts that read as an ad — polished, benefit-listing copy
  gets downvoted or removed on sight in most subs. "I built this, here's why, ask me
  anything" survives where a pitch doesn't, because disclosure is what the sub's norms
  are actually screening for.
- **X** — a demo-clip script, not a copy thread. A native clip shows the job getting done
  in the time it takes to decide whether to keep scrolling; a text thread asks for more
  patience than a cold scroller has budgeted.

State the launch-day metric rule (above) in the Product Hunt section.

### 5. `email-sequence.md`
Three emails, pre-launch:
1. **Problem-focused** (~T-7 days) — restates the job and the displaced alternative from
   the interview. No pitch yet — this email's only work is making the reader recognize
   their own situation.
2. **Solution reveal** (~T-2/3 days) — the PAS solve line plus the functional outcome;
   names the launch date.
3. **The ask** (launch day) — direct link, one specific action (upvote, comment, sign up),
   and the first-4-hours urgency from the Product Hunt brief if that's the launch channel.

## Definition of Done

- All five files exist under `launch/` in the target project: `interview-answers.md`,
  `positioning-one-pager.md`, `landing-hero-copy.md`, `channel-briefs.md`,
  `email-sequence.md`.
- The interview answers are recorded verbatim at the top of `positioning-one-pager.md` —
  not paraphrased, not summarized away.
- Every artifact carries at least one inline why (per spec: each artifact's framework
  choice gets an explicit reason, not just the output) — an artifact with zero why-lines
  has not met this skill's contract.
- The launch-day metric rule (signup → activation, never list size) appears in
  `channel-briefs.md`'s Product Hunt section.
- No copy was generated before all five interview questions were answered.

## Self-Improvement Loop

If a channel's real mechanics change — Product Hunt's ranking window shifts, Reddit
tightens or loosens self-promotion rules, Show HN's comment-ranking behavior changes — or
if the user's JTBD answers keep circling a question this interview doesn't ask, update the
interview questions or the channel-briefs section in this file directly. Don't let the
correction live only in one project's `launch/` output — the next launch should start from
the improved version, not repeat the same gap.
