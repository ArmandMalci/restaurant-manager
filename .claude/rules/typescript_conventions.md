# TypeScript Conventions

> Loaded when the touched file ends in `.ts`/`.tsx`. Extends `.claude/rules/coding_conventions.md`.

## Type system

- `strict: true` always. No `strictNullChecks: false`, no `noImplicitAny: false`.
- **No `any`.** Use `unknown` then narrow with type guards / discriminated unions.
- Avoid `as` casts except at IO boundaries (JSON.parse, FormData, env vars). Each cast deserves a comment.
- Prefer `type` over `interface` unless you specifically need declaration merging.
- Discriminated unions over boolean flags: `type State = { kind: 'loading' } | { kind: 'ready'; data: T }` beats `{ loading: boolean; data: T | null }`.

## React

- Server Components by default. `'use client'` only when state/effects/browser APIs are needed.
- One component per file. Named export. Filename matches component name (`Button.tsx` exports `Button`).
- No `useEffect` for derived state — compute during render.
- Co-locate sub-components in the same file until they're reused elsewhere.

## Linter / formatter chain

- **Biome** preferred for greenfield projects (single binary, fast, lint+format unified).
- **ESLint flat config + Prettier** for existing repos that already have it. Don't migrate unless explicitly asked.
- Auto-fix on save AND via post-Write hook (see `code-project-hooks.md`).

## Framework opinion

- **Next.js (App Router)** is the default for web. Use Server Components, Server Actions, edge runtime where appropriate.
- For backend services: **Encore.ts** or **NestJS** — strict types make AI catch parameter mistakes at compile time. Avoid Express for new work.
- **shadcn/ui + Tailwind** for UI primitives.

## Testing

- **Vitest** for unit + integration tests (faster than Jest, native ESM).
- **Playwright** for e2e and visual regression.
- No mocks for the DB — use a real Postgres (Supabase local / Testcontainers).

## Patterns to use

- Server Actions over API routes for forms.
- `react-hook-form + zod` for forms.
- `URL search params` for sharable filter / pagination state (skip Zustand unless genuinely needed).

## Patterns to avoid

- Class components in React
- `Moment.js` (use `date-fns` or `Temporal`)
- CSS-in-JS runtime libs (use Tailwind)
- `JSON.stringify` for diffing / hashing (use `fast-equals` / structural hash)
- Default exports for components (named exports help refactor tooling)
