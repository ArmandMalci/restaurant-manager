# Linting & Code Style Design

**Date:** 2026-06-14
**Status:** Approved

## Summary

Establish a consistent, strict linting and formatting setup across the `restaurant-manager` monorepo (NestJS API + React/Vite/Tailwind web). The primary tool is **Biome v2** for both formatting and linting. A minimal **ESLint** layer covers the two gaps Biome cannot fill: padding lines between statements and Tailwind class validation.

Pre-commit hooks (husky + lint-staged) enforce lint + format on staged files only. Typecheck stays CI-only.

---

## Architecture

```
restaurant-manager/
├── biome.json                    ← root config, covers both apps + packages/
├── apps/
│   ├── api/
│   │   └── eslint.config.js      ← @stylistic padding-line only
│   └── web/
│       └── eslint.config.js      ← @stylistic padding-line + tailwindcss
├── .husky/
│   └── pre-commit                ← runs lint-staged
└── package.json                  ← lint-staged config
```

**Tool responsibilities:**

| Concern | Tool | Scope |
|---|---|---|
| Formatting (all files) | Biome | both apps |
| TS/JS linting (most rules) | Biome | both apps |
| Import grouping | Biome `organizeImports` | both apps |
| Interface vs type | Biome `useConsistentTypeDefinitions` | both apps |
| Padding lines between statements | ESLint `@stylistic` | both apps |
| Tailwind class validation | ESLint `eslint-plugin-tailwindcss` | web only |
| Pre-commit (lint + format) | husky + lint-staged | staged files only |
| Typecheck | `tsc --noEmit` via Turbo | CI only |

---

## Biome Configuration

Single `biome.json` at the repo root. NestJS and React files are covered automatically — Biome v2 has built-in support for both TypeScript and JSX.

### Formatter

```json
{
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100,
    "lineEnding": "lf"
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "jsxQuoteStyle": "double",
      "semicolons": "always",
      "trailingCommas": "all",
      "bracketSpacing": true,
      "bracketSameLine": false
    }
  }
}
```

### Linter Rules

Base: `"recommended": true` — enables ~200 rules covering common bugs, correctness, and React patterns.

Additional rules enabled on top of recommended:

**TypeScript strictness:**
- `noExplicitAny` — error (no `any`, use `unknown` or proper type)
- `noNonNullAssertion` — error (no `!`, handle nullability explicitly)
- `useConsistentArrayType` — error, `"typeParameters": "shorthand"` (enforces `T[]` everywhere)
- `useConsistentTypeDefinitions` — error, `"style": "interface"` (interfaces for object types)
- `useConsistentMemberAccessibility` — error, `"accessibility": "explicit"` (all class members must have explicit `public`/`private`/`protected`)
- `noInferrableTypes` — error (no redundant type annotations where TS infers)
- `useImportType` — error (enforces `import type` for type-only imports, auto-fixable)

**Code style:**
- `noDefaultExport` — error (named exports only; improves refactoring and IDE support)
- `useArrowFunction` — error (arrow functions over function expressions in most contexts)
- `noConsole` — warn (clean up debug logs before merge)

**NestJS / async:**
- `noFloatingPromises` — warn (nursery, covers ~75% of cases; critical for NestJS where unhandled promises are a common runtime bug)

**React (recommended by default, confirmed here for clarity):**
- `useExhaustiveDependencies` — error (hook dependency arrays)
- `useHookAtTopLevel` — error (hooks must not be called conditionally)
- `noArrayIndexKey` — warn (array index as React key)
- `useJsxKeyInIterable` — error (missing `key=` in list renders)
- `noChildrenProp` — error (children passed as prop instead of JSX children)

### Import Organizer

Configured in `assist.actions.source.organizeImports` with custom groups:

```
1. node: builtins  (node:path, node:fs, etc.)
   [blank line]
2. External packages  (react, @nestjs/*, etc.)
   [blank line]
3. Monorepo packages  (@restaurant/**)
   [blank line]
4. Aliases + relative paths  (#, ~, ./, ../)
```

Also enabled: automatic merge of duplicate imports from the same source.

### Overrides

Test files (`*.spec.ts`, `*.test.tsx`) relax:
- `noExplicitAny` → warn (useful for typed mocks)
- `noNonNullAssertion` → warn (common in test assertions)

Generated files (`*.generated.ts`, orval output) are ignored entirely.

---

## ESLint Configuration

Minimal — only covers what Biome cannot.

### Both Apps (`apps/api/eslint.config.js`, `apps/web/eslint.config.js`)

Plugin: `@stylistic/eslint-plugin`

Rule: `padding-line-between-statements`

Enforces blank lines:
- Before `return`
- Before `throw`
- After variable declaration blocks (before next non-declaration statement)
- Between class methods

Config snippet:
```js
'@stylistic/padding-line-between-statements': [
  'error',
  { blankLine: 'always', prev: '*', next: 'return' },
  { blankLine: 'always', prev: '*', next: 'throw' },
  { blankLine: 'always', prev: ['const', 'let'], next: '*' },
  { blankLine: 'any',    prev: ['const', 'let'], next: ['const', 'let'] },
]
```

### Web Only (`apps/web/eslint.config.js`)

Plugin: `eslint-plugin-tailwindcss`

Rules:
- `tailwindcss/classnames-order` — auto-sorts class names on `--fix`
- `tailwindcss/no-custom-classname` — error on class names not defined in Tailwind config
- `tailwindcss/no-contradicting-classname` — error on conflicting classes (e.g. `mt-2 mt-4`)

---

## Pre-commit Hooks

Tool: **husky** + **lint-staged**

```
On git commit:
  staged *.ts (apps/api/**):          biome check --write
  staged *.ts *.tsx (apps/web/**):    biome check --write → eslint --fix
  staged *.ts *.tsx (packages/**):    biome check --write
  staged *.json *.md:                 biome format --write
```

Typecheck (`tsc --noEmit`) is **not** in pre-commit — it is a whole-project operation and adds 5–15s per commit. It runs in CI via `turbo typecheck`.

---

## Turbo & Scripts

The existing `lint` script in each `package.json` is updated:

| App | Updated `lint` script |
|---|---|
| `apps/api` | `biome check src && eslint src` |
| `apps/web` | `biome check src && eslint src` |
| root | `turbo run lint` (unchanged) |

The root `format` script switches from Prettier to Biome:
```
"format": "biome format --write ."
```

Prettier is removed from root `devDependencies`.

---

## Packages to Install

**Root (devDependencies):**
```
@biomejs/biome
husky
lint-staged
```

**`apps/api` (devDependencies):**
```
@eslint/js
@stylistic/eslint-plugin
eslint
```

**`apps/web` (devDependencies):**
```
@eslint/js
@stylistic/eslint-plugin
eslint
eslint-plugin-tailwindcss
```

---

## Migration Notes

- The existing `lint` scripts in both apps call `eslint` but have no config files — they currently fail silently. Both will be replaced as part of implementation.
- The root `.prettierrc` does not exist (no config), so removing Prettier is a clean cut.
- NestJS CLI generates `eslint.config.mjs` on `nest new` — the existing API app does not have one; the new `eslint.config.js` fills that gap.
- Orval-generated files in `apps/web/src/api/` should be added to `.biomeignore` to prevent false positives on generated code.
