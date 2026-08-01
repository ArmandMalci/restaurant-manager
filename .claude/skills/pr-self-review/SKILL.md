---
name: pr-self-review
description: Use when Armand is ready to open a PR. Runs code-reviewer on the full diff, generates the PR description from commits + PRD, attaches Playwright screenshots for UI changes, and opens via `gh pr create`. Pre-empts human reviewer feedback so PRs merge faster.
---

# PR Self-Review

## Trigger
- "Open a PR for this work"
- "Self-review before opening"
- "Ship this branch"

## Prerequisites
- GitHub MCP enabled OR `gh` CLI installed and authed
- The branch's local tests pass (don't open PRs with red local CI knowingly)
- For UI changes: Playwright MCP enabled

## Steps

1. **Confirm tests pass locally.**
   - TS: `pnpm test && pnpm tsc --noEmit && pnpm lint`
   - Python: `uv run pytest && uv run mypy && uv run ruff check`
   - If anything fails, STOP and tell Armand. Don't open a red PR.

2. **Generate the diff summary.** Run `git diff main...HEAD --stat` and `git log main..HEAD --oneline`. Pipe through to understand the shape of the change.

3. **Dispatch `code-reviewer` sub-agent** with the diff. If it returns issues, surface them. Armand decides which to fix before opening vs. accept as nits.

4. **If UI changed**, dispatch `ui-qa-tester` sub-agent. Capture screenshots at 375 / 768 / 1280 widths for each changed route. Save to `/tmp/pr-screenshots/<branch>/`.

5. **Generate PR description** using `.claude/references/pr-description-template.md` as the scaffold. Fill in:
   - One-line summary of what this PR does
   - Why (link the PRD or Linear ticket if known)
   - What changed (3–5 bullets from the commits)
   - Test plan (commands that were run)
   - Screenshots (if UI)
   - Open questions for the reviewer

6. **Push the branch** if not already pushed: `git push -u origin <branch>`.

7. **Open the PR** via `gh pr create --title "<title>" --body "$(cat <pr-description-file>)"` (HEREDOC pattern). If a base branch other than `main` is appropriate (e.g., `develop`), pass `--base`.

8. **Report back** with the PR URL and a one-line summary of any code-reviewer concerns Armand should know about.

## Rules
- Title format: `<type>(<scope>): <what>` (Conventional Commits). E.g., `feat(auth): add Magic Link login`.
- PR title under 70 chars. Detail goes in the body.
- Don't auto-merge. Even self-reviewed PRs go through CI + human eyes (or a second AI pass).
- Don't paper over code-reviewer concerns. If it found a real issue, fix it BEFORE opening the PR.
- Attach screenshots inline in the PR body using GitHub-friendly Markdown (`![alt](URL)` after uploading to gist or PR file uploader).
