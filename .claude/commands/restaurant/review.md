Review the recent changes on this branch against the main branch. Focus on the restaurant-manager codebase.

## What to check

1. **Spec compliance** — do the changes match what was planned in `docs/superpowers/plans/` or `docs/board/`?
2. **Conventions** — are all new NestJS modules following the established pattern (module/controller/service/spec)?
3. **Shared schemas** — are new Zod schemas exported from `packages/shared/src/index.ts`?
4. **App module registration** — is every new NestJS module listed in `apps/api/src/app.module.ts`?
5. **Tests** — does every new service method have at least a happy-path and an error-path test?
6. **Type safety** — no `any` types, catch blocks typed as `unknown`
7. **Security** — no secrets or credentials in committed files, no missing auth guards on protected endpoints

## How to review

```bash
git diff main...HEAD --name-only
git diff main...HEAD
pnpm --filter @restaurant/api test
```

Report: list each file changed, what it does, any issues found (CRITICAL / WARNING / INFO), and a final verdict (APPROVED / CHANGES REQUESTED).
