# Coding Conventions

## General
- **Edit existing files** before creating new ones. New files only when the task requires it.
- **No comments narrating the code.** Only comment WHY when it's non-obvious (hidden constraint, subtle invariant, workaround).
- **No defensive code for impossible cases.** Trust internal callers. Validate only at system boundaries (user input, external APIs).
- **No backwards-compat shims unless asked.** If something is unused, delete it — don't rename it `_old`.
- **Three similar lines beats a premature abstraction.** Don't extract helpers from speculation.

## TypeScript
- Strict mode always. No `any` — use `unknown` then narrow.
- `type` over `interface` unless you need declaration merging.
- Prefer functional/immutable patterns. No classes unless interfacing with a class-based library.
- Discriminated unions over boolean flags. (`type State = { kind: 'loading' } | { kind: 'ready'; data: X }`)
- Errors as values where it improves clarity; throw at boundaries.

## React
- Server Components by default. Mark `'use client'` only when needed (state, effects, browser APIs).
- One component per file, named export, file matches component name.
- Co-locate sub-components in the same file until they're reused elsewhere.
- No `useEffect` for derived state. Compute during render.

## File structure (Next.js App Router)
- `app/` — routes, layouts, loading/error states
- `components/` — shared UI primitives + composed components
- `lib/` — pure logic, no React
- `hooks/` — custom hooks (client only)
- `db/` or `server/` — server-only DB/business logic

## Testing
- Prefer end-to-end (Playwright) over unit tests for UI flows.
- Unit-test pure functions in `lib/`.
- Integration tests hit a real DB (Supabase local), not mocks.

## Git
- Conventional Commits (`feat:`, `fix:`, `chore:`, etc.).
- One logical change per commit. No "wip", no "stuff".
- Never `--force` push to main. Never `git reset --hard` without confirming.

## Security
- Never commit `.env`. Use `.env.example` with empty values.
- Never put API keys in code, comments, or commit messages.
- Validate all external input with zod schemas.
