---
name: ci-setup
description: "Use when Armand says \"set up CI\", \"add GitHub Actions\", \"add a lint/test gate\", \"why is CI slow\", or when a repo has no .github/workflows. Generates a right-sized GitHub Actions pipeline for the repo's actual stack (detected, not assumed): lint + typecheck + test as the base gate; Playwright/Lighthouse jobs only when the repo has them; caching for the package manager it actually uses; concurrency-cancel on stale runs. Opinionated per the AIOS anti-pattern rule — composes proven actions, never generates bespoke infra beyond workflows. Also AUDIT mode for existing pipelines: flags missing gates, cache misses, and jobs that run on every push but matter only on PRs. Every generated job carries a one-line why-comment. NOT for deployment/hosting choices (framework-native: Vercel/EAS/Modal per tech_stack.md) and NOT for incident response (engineering plugin skills)."
allowed_tools: [Read, Write, Bash, Glob, Grep]
---

# ci-setup — right-sized GitHub Actions pipelines

## Tool scope

`allowed_tools` is `[Read, Write, Bash, Glob, Grep]`. **`Write` is scoped to
`.github/workflows/` in the target repo** — this skill only creates or edits workflow YAML there.
Never write to application source, `package.json`/`pyproject.toml` (read them, don't change
them), or any file outside `.github/workflows/`. `Bash` runs read-only stack-detection commands
(`ls`, `cat`, `gh run list`, `gh workflow view`, `gh pr checks`) — never `git push` or
`gh pr create` on its own initiative. `Read`/`Glob`/`Grep` locate lockfiles, framework configs,
and existing workflows.

## Overview

Two modes:
- **GENERATE** — no `.github/workflows/`, or it's empty: detect the stack, copy the matching
  base-gate template from `references/`, append gated jobs only where their config file exists.
- **AUDIT** — `.github/workflows/*.yml` already exists: read every workflow, score it against the
  checklist below, output gaps. Don't touch existing files unless Armand asks for the fix applied.

The generated pipeline is deliberately small — lint + typecheck + test as the base gate, nothing
speculative. Deploy/hosting is out of scope; Vercel/EAS/Modal own that per
`.claude/context/tech_stack.md`. Incident response belongs to the `engineering` plugin, not this
skill.

## Stack detection

Read these signals, don't guess:

| Signal | Stack | Package manager | Cache basis |
|---|---|---|---|
| `pnpm-lock.yaml` | Node | pnpm | `cache: pnpm` on `actions/setup-node` |
| `yarn.lock` | Node | yarn | `cache: yarn` on `actions/setup-node` |
| `package-lock.json` | Node | npm | `cache: npm` on `actions/setup-node` |
| `bun.lockb` | Node | bun | `oven-sh/setup-bun` + explicit `actions/cache` (no native `cache:` input yet) |
| `pyproject.toml` + `uv.lock` | Python | uv | `astral-sh/setup-uv` with `enable-cache: true` |
| `pyproject.toml`, no `uv.lock` | Python | pip/poetry | needs your call — no committed template, adapt `python-uv.yml` |

A monorepo with more than one lockfile gets a base gate per stack — either separate jobs in one
workflow file or separate files, matching whatever split the repo's existing
`.github/workflows/` (if any) already uses.

Then check job-gating signals — append these jobs only when their config exists, never on spec:

| Config found | Extra job |
|---|---|
| `playwright.config.ts` / `.js` | Playwright e2e job — commented block in `node-pnpm.yml` |
| `.lighthouserc.js` / `.json` / `lighthouserc.yml` | Lighthouse CI job — same file |

## Base-gate templates

Concrete YAML lives in `references/` — read the matching file, don't retype it from memory:
- `references/node-pnpm.yml` — pnpm base gate (lint/typecheck/test) plus commented-out optional
  Playwright and Lighthouse jobs, gated per the table above.
- `references/python-uv.yml` — uv base gate (ruff/mypy/pytest).

Both templates pin actions by major (`@v4` style) — **check the action's current major at run
time**, a stale pin here is a known drift risk, not a guarantee. Every step carries a one-line
`# why:` comment, caching uses the package manager's native GitHub Action support, and a
top-level `concurrency` block cancels stale runs on the same ref.

**npm/yarn/bun repos:** copy `node-pnpm.yml` and swap the `pnpm/action-setup` step + `cache: pnpm`
input for the matching setup (`actions/setup-node` alone for npm with `cache: npm`, `cache: yarn`
for yarn, `oven-sh/setup-bun` + an explicit `actions/cache` step for bun). Job shape and
why-comments don't change — only the two setup lines. Not worth four near-duplicate files.

**pip/poetry Python repos:** copy `python-uv.yml` and swap `astral-sh/setup-uv` for
`actions/setup-python` + `actions/cache` (key on the `poetry.lock`/`requirements.txt` hash), and
`uv run <cmd>` for the direct command.

## Audit mode

Read every file in `.github/workflows/`. For each, check:

| Check | Fail condition | Why it matters |
|---|---|---|
| Base gate present | No job runs lint, typecheck, or test | The repo can merge broken code — this is the whole point of CI |
| Concurrency cancel | No top-level `concurrency:` with `cancel-in-progress: true` | Every push re-queues a full run; a PR with several commits burns minutes on runs nobody will look at |
| Package-manager cache | No `cache:` input on `setup-node`/`setup-uv`, no `actions/cache` step | Every run reinstalls from scratch — a multi-minute tax paid on every single run |
| PR-only jobs run on every push | Heavy jobs (Playwright, Lighthouse, integration) triggered under `push:` with no `pull_request:` scoping | Slow, expensive jobs that inform review should trigger on the review event, not every commit to every branch |
| Frozen install | `npm install`/`pnpm install`/`uv sync` without `--frozen-lockfile`/`--frozen` | A CI run that silently updates the lockfile isn't testing what's actually committed |
| Unpinned actions | `uses: owner/action@main`/`@master`, or no version at all | A moving tag can change under you with no changelog to check; pin to a major at minimum |

Report as a short list: `<workflow file> — <check> — FAIL: <why> — fix: <concrete change>`.

## Definition of Done

- **GENERATE:** the new/edited workflow is committed on the branch, a PR is opened or an existing
  one is pushed to, and the run for that PR shows green via `gh pr checks` / `gh run list`. If it
  can't go green this session (missing secret, flaky external dependency, no PR to trigger against
  yet), name the specific gap instead of claiming done.
- **AUDIT:** every workflow file had every check above run against it, and every FAIL has a named,
  concrete fix — an unexplained FAIL means the audit isn't finished, not that the pipeline is
  clean.

## Self-Improvement Loop

When a repo's stack doesn't match any row in the Stack detection table (a lockfile or config this
skill hasn't seen), or a pinned action major breaks on a real run, update the table and the
matching `references/*.yml` file before moving on — don't let the fix live only in that repo's
one-off workflow. Same when an audit-mode check produces a false positive or misses a real gap.
