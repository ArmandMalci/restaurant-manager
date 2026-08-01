---
name: security-audit
description: "Use when Armand says \"security audit\", \"run a security scan\", \"check this repo for vulnerabilities\", \"audit dependencies\", \"is this safe to ship\", or before a release/PR on auth-, payment-, or user-data-touching code. Runs a three-layer pass: (1) dependency vulnerabilities via the repo's native scanner (npm audit / pnpm audit / pip-audit / osv-scanner when present), (2) secrets scan of the working tree (gitleaks if installed, else a documented grep fallback), (3) an OWASP-informed code review of boundary files (auth, input validation, SQL, shell exec, file paths) per .claude/rules/security_conventions.md. Outputs a severity-ranked markdown report; every finding explains WHY it is dangerous in plain English and cites file:line. NOT for fixing findings (that is a normal code task), NOT a replacement for the built-in /security-review on pending diffs — this audits the whole repo, /security-review audits a changeset."
allowed_tools: [Read, Bash, Glob, Grep]
---

# security-audit — three-layer repo security pass

## Overview

Reports, does not fix. Three independent layers — dependency vulnerabilities, secrets, and a
boundary-file code review — each runs to the extent its tools are available. A missing scanner
shrinks scope; it never halts the run. Output is one severity-ranked markdown report where every
row explains, in plain English, why the finding is dangerous.

Scope is the whole repo at its current committed state — not a diff. For "does this PR introduce
a new risk," use the built-in `/security-review` instead.

## Prerequisite check

Run first, always. For each tool below, check presence with `command -v <tool>`. Never stop the
audit because a tool is missing — record it as an INFO row (install command included) in the
final report and continue with whatever layers remain runnable.

| Tool | Detects via | If missing |
|---|---|---|
| `npm` / `pnpm` | `package.json` present; lockfile decides which (`pnpm-lock.yaml` → pnpm, else npm) | Package manager itself missing means the repo can't install — note it, skip Layer 1 for JS |
| `pip-audit` | `requirements.txt` or `pyproject.toml` present | `uv tool install pip-audit` (or `pip install pip-audit` without uv) |
| `osv-scanner` | Universal fallback — any manifest (Go `go.mod`, Rust `Cargo.toml`, multi-language monorepos) | `brew install osv-scanner` (macOS) or see https://github.com/google/osv-scanner |
| `gitleaks` | Always attempted for Layer 2 | `brew install gitleaks` — falls back to the documented grep patterns below |

A repo with no recognized manifest still gets Layer 2 and Layer 3 — dependency scanning is simply
marked "N/A, no manifest found."

## Layer 1 — Dependency vulnerabilities

1. Detect ecosystem(s) present (a monorepo may have more than one — run all that apply).
2. Run the native scanner with machine-readable output:
   - `npm audit --json`
   - `pnpm audit --json`
   - `pip-audit -f json`
   - `osv-scanner --format json .` (fallback/secondary for any ecosystem, or primary when no
     language-specific tool is installed)
3. Map each advisory's own severity to the report's Critical/High/Medium/Low scale — don't
   re-derive severity, trust the scanner (npm's `moderate` → Medium, `critical` → Critical, etc.).
4. Every advisory row cites the package name, installed version, and the fixed version if the
   scanner reports one — that fixed version IS the suggested next step.

## Layer 2 — Secrets scan

Scope is **git-tracked files**, not the raw filesystem. This deliberately skips gitignored `.env`
files — those are expected to hold real secrets locally and per hub convention (see
`.claude/rules/security_conventions.md` → Secrets) must never be opened, printed, or quoted by
Claude. If a secret pattern matches inside a real `.env` file anyway (rare — e.g. it was
accidentally tracked), report only `path:line — possible secret in tracked env file`, never the
matched value itself.

**If `gitleaks` is installed:**
```bash
gitleaks detect --source . -v --report-format json --report-path /tmp/gitleaks-report.json
```

**Grep fallback (documented, safe flags per `.claude/references/safe-grep-patterns.md`):**
```bash
git ls-files -z | xargs -0 grep -InE \
  "AKIA[0-9A-Z]{16}|-----BEGIN (RSA |EC |OPENSSH |)PRIVATE KEY-----|(api|secret|access)[_-]?key['\"]?\s*[:=]\s*['\"][A-Za-z0-9/+=_-]{16,}['\"]|password\s*[:=]\s*['\"][^'\"]{8,}['\"]"
```
`-I` skips binary files, `-n` gives line numbers, `git ls-files` scopes to tracked content so
`.env.example`/`.env.sample`/`.env.template` (expected to be empty-valued) stay in scope while real
`.env` files stay out. Never widen this to raw `grep -r .` over the filesystem.

**Blind spot:** a `git ls-files` scan also can't see untracked-but-not-gitignored files (a new
credentials file dropped in the working tree that nobody `.gitignore`d yet). Before trusting a
clean Layer 2 result, run `git status --short` and eyeball any stray untracked files it lists.

## Layer 3 — Boundary-file code review

Grep targets below are taken directly from `.claude/rules/security_conventions.md`'s "boundary
rule" and "When something goes wrong" sections. All commands use the standard exclusion set from
`.claude/references/safe-grep-patterns.md`:
```bash
--exclude-dir={node_modules,dist,build,.git,.next,__pycache__,.venv,coverage,.turbo}
```

| Boundary category | Grep target | Judgment |
|---|---|---|
| `eval`/`exec` on input | `-E '\beval\(|new Function\('` (JS/TS, `--include='*.ts' --include='*.tsx' --include='*.js'`); `-E '\b(eval\|exec)\('` (Python, `--include='*.py'`) | Auto-flag Critical unless the argument is a compile-time literal |
| Disabled CORS/CSRF/TLS verification | `-E "Access-Control-Allow-Origin['\"]?\s*[:=]\s*['\"]\*|rejectUnauthorized\s*:\s*false|verifySignature\s*=\s*false|csrf\s*:\s*false"` | Auto-flag High |
| Hardcoded credentials | `-E "(password\|passwd\|secret\|api[_-]?key\|token)\s*=\s*['\"][^'\"]{6,}['\"]"` (skip matches already caught by Layer 2) | Auto-flag Critical if outside test fixtures, High if inside |
| Permissive regex on user input | `-E '\.\*'` inside files under `validate|schema|middleware` paths | **Needs your call** — grep can't tell a deliberate wildcard from a validation bypass; never auto-score |
| String-concatenated SQL | `-E "(SELECT\|INSERT\|UPDATE\|DELETE).*(\+\|\\$\{)"` in query-building files | Auto-flag Critical — this is textbook SQL injection |
| Unsafe shell execution | `-E "exec\(['\"].*\+|exec\(\`.*\$\{|shell:\s*true"` | Auto-flag Critical — string-built shell commands or `shell: true` with variable input |
| Missing path validation | `-E "path\.(join\|resolve)\(.*req\.(query\|params\|body)"` without a nearby `validatePath`/`resolve`+prefix-check pair | **Needs your call** — confirm manually whether traversal is actually reachable |

Per hub doctrine, rows marked "needs your call" are reported but never assigned a severity — flag
them as `JUDGMENT` in the Severity column and let Armand decide.

## CI wiring

All three layers are headless-compatible. Layer 1's scanners already emit JSON (npm audit --json,
pip-audit -f json). Layer 2's gitleaks supports --report-format json and non-zero exit on security
findings — both compatible with CI gate logic. Layer 3 (boundary code review) remains agent-work and
does not run in CI. See `ci-setup` skill for authoring the workflow job.

## Report format

One markdown table, most severe first. Columns are fixed:

| Severity | Finding | Location | Why it matters | Suggested next step |
|---|---|---|---|---|
| Critical | SQL query built via string concatenation | `src/db/users.ts:42` | An attacker can inject arbitrary SQL through the `email` field — this is how databases get dumped or wiped, not a theoretical risk | Rewrite as a parameterized query: `db.query('SELECT * FROM users WHERE email = $1', [email])` |

- `Severity`: `Critical` / `High` / `Medium` / `Low` / `JUDGMENT` (judgment-only items, never auto-scored).
- `Finding`: one sentence naming the concrete issue, not the category.
- `Location`: `file:line` (or package name + version for Layer 1).
- `Why it matters`: plain English, no jargon a non-security engineer wouldn't follow — describe the
  concrete bad outcome, not the OWASP category name.
- `Suggested next step`: the smallest fix that resolves it (a package bump, a code pattern, a
  rotation instruction) — never the audit itself performing the fix.

Prerequisite gaps (missing scanners) go in a separate short "Scope limitations" list above the
table, each with its install command — they are not findings.

## Definition of Done

- Report written to the target repo's `docs/security-audit-<YYYY-MM-DD>.md` (or printed inline if
  the repo has no `docs/` convention).
- Every Critical finding has a non-empty "Why it matters" and "Suggested next step" — an
  unexplained Critical means the audit isn't done, not that the repo is clean.
- Every layer that had its prerequisite met actually ran and is reflected in the report (a layer
  that was skippable only because its tool was missing, not because it silently no-op'd).

## Self-Improvement Loop

When a grep target in Layer 3 produces noise (false positives drowning real findings) or misses a
pattern security_conventions.md added later, update the table above before moving on — don't let
the fix live only in a one-off audit report. Same for new scanners worth adding to the
Prerequisite check.
