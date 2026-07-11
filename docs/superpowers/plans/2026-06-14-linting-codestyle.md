# Linting & Code Style Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up Biome v2 as the primary formatter + linter across the monorepo, with a minimal ESLint layer for padding-line rules (both apps) and Tailwind class validation (web only), enforced on staged files via husky + lint-staged.

**Architecture:** A single root `biome.json` covers all packages. Each app has its own `eslint.config.mjs` that handles only what Biome cannot. Pre-commit hooks run `lint-staged`, which applies Biome + ESLint auto-fixes to staged files only. Typecheck is CI-only.

**Tech Stack:** Biome v2, ESLint v9 flat config, `@stylistic/eslint-plugin`, `eslint-plugin-tailwindcss`, `@typescript-eslint/parser`, husky v9, lint-staged v15, pnpm workspaces.

---

## File Map

| Action | File | Purpose |
|---|---|---|
| Create | `biome.json` | Root Biome config: formatter + linter + import organizer |
| Create | `.biomeignore` | Ignore generated/dist files from Biome |
| Create | `apps/api/eslint.config.mjs` | API ESLint: padding-line only |
| Create | `apps/web/eslint.config.mjs` | Web ESLint: padding-line + Tailwind validation |
| Create | `.husky/pre-commit` | Pre-commit hook: runs lint-staged |
| Modify | `package.json` | Add biome, husky, lint-staged; add lint-staged config; update format script; remove prettier |
| Modify | `apps/api/package.json` | Add eslint deps; update lint script |
| Modify | `apps/web/package.json` | Add eslint deps; update lint script |

---

## Task 1: Install Biome, create root config

**Files:**
- Create: `biome.json`
- Create: `.biomeignore`
- Modify: `package.json`

- [ ] **Step 1: Install Biome at workspace root**

```bash
pnpm add -D -w @biomejs/biome
```

- [ ] **Step 2: Remove Prettier from root**

In `package.json`, remove `"prettier": "^3.4.0"` from `devDependencies`. No `.prettierrc` file exists so no config to delete.

- [ ] **Step 3: Update root format script**

In `package.json` scripts, replace the format script:

```json
"format": "biome format --write ."
```

- [ ] **Step 4: Create `.biomeignore`**

```
node_modules
dist
.turbo
coverage
*.generated.ts
apps/web/src/api/
prisma/migrations
tsconfig.tsbuildinfo
*.tsbuildinfo
```

- [ ] **Step 5: Create `biome.json`**

```json
{
  "$schema": "https://biomejs.dev/schemas/2.5.0/schema.json",
  "files": {
    "ignore": [
      "**/node_modules/**",
      "**/dist/**",
      "**/.turbo/**",
      "**/coverage/**",
      "**/*.generated.ts",
      "apps/web/src/api/**",
      "prisma/migrations/**",
      "**/*.tsbuildinfo"
    ]
  },
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
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "style": {
        "noDefaultExport": "error",
        "noNonNullAssertion": "error",
        "noInferrableTypes": "error",
        "useConsistentArrayType": {
          "level": "error",
          "options": { "typeParameters": "shorthand" }
        },
        "useConsistentTypeDefinitions": {
          "level": "error",
          "options": { "style": "interface" }
        },
        "useConsistentMemberAccessibility": {
          "level": "error",
          "options": { "accessibility": "explicit" }
        }
      },
      "suspicious": {
        "noExplicitAny": "error",
        "noConsole": "warn"
      },
      "nursery": {
        "noFloatingPromises": "warn"
      }
    }
  },
  "assist": {
    "enabled": true,
    "actions": {
      "source": {
        "organizeImports": {
          "options": {
            "groups": [
              [":BUN:", ":NODE:"],
              ":BLANK_LINE:",
              [":PACKAGE:", "!@restaurant/**"],
              ":BLANK_LINE:",
              "@restaurant/**",
              ":BLANK_LINE:",
              [":ALIAS:", ":PATH:"]
            ]
          }
        }
      }
    }
  },
  "overrides": [
    {
      "includes": ["**/*.spec.ts", "**/*.test.ts", "**/*.test.tsx", "**/*.spec.tsx"],
      "linter": {
        "rules": {
          "suspicious": {
            "noExplicitAny": "warn"
          },
          "style": {
            "noNonNullAssertion": "warn"
          }
        }
      }
    }
  ]
}
```

- [ ] **Step 6: Verify Biome runs on both apps**

```bash
pnpm exec biome check apps/ packages/
```

Expected: output listing any violations (there will be many — that's fine). No crash, no "command not found".

- [ ] **Step 7: Auto-fix all safe Biome violations**

```bash
pnpm exec biome check --write apps/ packages/
```

Expected: files reformatted, many violations auto-fixed. Some `noDefaultExport` or `noExplicitAny` violations will remain (not auto-fixable) — that's fine for now, addressed in Task 5.

- [ ] **Step 8: Commit**

```bash
git add biome.json .biomeignore package.json
git commit -m "chore(tooling): install Biome v2, replace Prettier"
```

---

## Task 2: ESLint for API (padding-line)

**Files:**
- Modify: `apps/api/package.json`
- Create: `apps/api/eslint.config.mjs`

- [ ] **Step 1: Install ESLint deps in API**

```bash
pnpm add -D --filter @restaurant/api eslint @typescript-eslint/parser @stylistic/eslint-plugin
```

- [ ] **Step 2: Update API lint script**

In `apps/api/package.json`, update the lint script:

```json
"lint": "biome check src && eslint src"
```

- [ ] **Step 3: Create `apps/api/eslint.config.mjs`**

```js
import stylistic from '@stylistic/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@stylistic': stylistic,
    },
    rules: {
      '@stylistic/padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: '*', next: 'return' },
        { blankLine: 'always', prev: '*', next: 'throw' },
        { blankLine: 'always', prev: ['const', 'let', 'var'], next: '*' },
        { blankLine: 'any', prev: ['const', 'let', 'var'], next: ['const', 'let', 'var'] },
      ],
    },
  },
];
```

- [ ] **Step 4: Verify API lint runs**

```bash
pnpm --filter @restaurant/api lint
```

Expected: Biome output then ESLint output. Both complete without "config not found" or parse errors.

- [ ] **Step 5: Commit**

```bash
git add apps/api/package.json apps/api/eslint.config.mjs
git commit -m "chore(api): add ESLint with padding-line rule"
```

---

## Task 3: ESLint for web (padding-line + Tailwind)

**Files:**
- Modify: `apps/web/package.json`
- Create: `apps/web/eslint.config.mjs`

- [ ] **Step 1: Install ESLint deps in web**

```bash
pnpm add -D --filter @restaurant/web eslint @typescript-eslint/parser @stylistic/eslint-plugin eslint-plugin-tailwindcss
```

- [ ] **Step 2: Update web lint script**

In `apps/web/package.json`, update the lint script:

```json
"lint": "biome check src && eslint src"
```

- [ ] **Step 3: Create `apps/web/eslint.config.mjs`**

```js
import stylistic from '@stylistic/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import tailwind from 'eslint-plugin-tailwindcss';

export default [
  ...tailwind.configs['flat/recommended'],
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      '@stylistic': stylistic,
    },
    settings: {
      tailwindcss: {
        callees: ['cn', 'clsx', 'cva', 'cx'],
        config: 'tailwind.config.ts',
      },
    },
    rules: {
      'tailwindcss/classnames-order': 'warn',
      'tailwindcss/no-custom-classname': 'error',
      'tailwindcss/no-contradicting-classname': 'error',
      '@stylistic/padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: '*', next: 'return' },
        { blankLine: 'always', prev: '*', next: 'throw' },
        { blankLine: 'always', prev: ['const', 'let', 'var'], next: '*' },
        { blankLine: 'any', prev: ['const', 'let', 'var'], next: ['const', 'let', 'var'] },
      ],
    },
  },
];
```

- [ ] **Step 4: Verify web lint runs**

```bash
pnpm --filter @restaurant/web lint
```

Expected: Biome output then ESLint output. Both complete. Tailwind violations will appear — normal for first run.

- [ ] **Step 5: Commit**

```bash
git add apps/web/package.json apps/web/eslint.config.mjs
git commit -m "chore(web): add ESLint with padding-line and Tailwind validation"
```

---

## Task 4: Pre-commit hooks (husky + lint-staged)

**Files:**
- Modify: `package.json`
- Create: `.husky/pre-commit`

- [ ] **Step 1: Install husky and lint-staged at root**

```bash
pnpm add -D -w husky lint-staged
```

- [ ] **Step 2: Add prepare script and lint-staged config to root `package.json`**

Add `"prepare": "husky"` to scripts, and add the `lint-staged` key at the top level:

```json
{
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "format": "biome format --write .",
    "prepare": "husky"
  },
  "lint-staged": {
    "apps/api/src/**/*.ts": [
      "biome check --write --no-errors-on-unmatched",
      "eslint --fix --max-warnings=0"
    ],
    "apps/web/src/**/*.{ts,tsx}": [
      "biome check --write --no-errors-on-unmatched",
      "eslint --fix --max-warnings=0"
    ],
    "packages/**/*.ts": [
      "biome check --write --no-errors-on-unmatched"
    ],
    "**/*.{json,md}": [
      "biome format --write"
    ]
  }
}
```

- [ ] **Step 3: Initialise husky**

```bash
pnpm exec husky init
```

Expected: `.husky/` directory created, `.husky/pre-commit` created with default content.

- [ ] **Step 4: Replace `.husky/pre-commit` content**

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

pnpm exec lint-staged
```

- [ ] **Step 5: Make the hook executable**

```bash
chmod +x .husky/pre-commit
```

- [ ] **Step 6: Test the hook by staging a file and committing**

```bash
git add biome.json
git commit -m "test: verify pre-commit hook runs"
```

Expected: lint-staged runs Biome on staged files, commit succeeds or shows real lint errors.

- [ ] **Step 7: Commit hook setup**

```bash
git add package.json .husky/
git commit -m "chore(tooling): add husky pre-commit hook with lint-staged"
```

---

## Task 5: Fix remaining lint violations

**Files:** Multiple — any `.ts`/`.tsx` files with unresolvable lint errors from the previous auto-fix pass.

This task exists because some Biome rules (e.g. `noDefaultExport`, `noExplicitAny`, `useConsistentMemberAccessibility`) are not auto-fixable and may have produced errors in Task 1 Step 7.

- [ ] **Step 1: Run full lint to list all remaining violations**

```bash
pnpm exec biome check apps/ packages/ 2>&1 | grep "error\|warn" | head -50
```

- [ ] **Step 2: Fix `noDefaultExport` violations**

For each file with a default export, convert to named export. Example pattern:

```ts
// Before
export default function MenuService() { ... }

// After
export function MenuService() { ... }
```

Update any corresponding import sites from `import MenuService from './menu.service'` to `import { MenuService } from './menu.service'`.

If a framework requires a default export (rare — check each case), suppress with:
```ts
// biome-ignore lint/style/noDefaultExport: required by framework
export default ...
```

- [ ] **Step 3: Fix `useConsistentMemberAccessibility` violations**

Add explicit `public` / `private` / `protected` to all class members that are missing access modifiers. Example:

```ts
// Before
@Injectable()
class MenuService {
  constructor(private prisma: PrismaService) {}
  findAll() { ... }
}

// After
@Injectable()
class MenuService {
  public constructor(private readonly prisma: PrismaService) {}
  public findAll() { ... }
}
```

- [ ] **Step 4: Fix `noExplicitAny` violations in non-test files**

Replace `any` with a concrete type, `unknown`, or an appropriate generic. Example:

```ts
// Before
function transform(data: any): any { ... }

// After
function transform<T>(data: T): T { ... }
```

- [ ] **Step 5: Re-run lint to confirm zero errors**

```bash
pnpm exec biome check apps/ packages/
pnpm --filter @restaurant/api lint
pnpm --filter @restaurant/web lint
```

Expected: warnings may remain (noConsole, noFloatingPromises), but zero errors.

- [ ] **Step 6: Commit all fixes**

```bash
git add -p   # stage in logical chunks
git commit -m "chore(lint): fix all Biome lint violations"
```

---

## Task 6: Verify full pipeline

- [ ] **Step 1: Run the full lint pipeline via Turbo**

```bash
pnpm lint
```

Expected: both apps report lint passing via Turbo.

- [ ] **Step 2: Verify format script works**

```bash
pnpm format
```

Expected: Biome reformats files, exits 0.

- [ ] **Step 3: Verify pre-commit hook on a real staged change**

Edit any `.ts` file (e.g. add a blank line), stage it, and commit:

```bash
echo "" >> apps/api/src/main.ts
git add apps/api/src/main.ts
git commit -m "chore: test pre-commit hook"
```

Expected: lint-staged runs, Biome auto-fixes the blank line, commit succeeds.

- [ ] **Step 4: Verify typecheck still passes independently**

```bash
pnpm typecheck
```

Expected: both apps pass typecheck via Turbo. This is CI-only and not blocked by the new lint setup.

- [ ] **Step 5: Final commit if any cleanup needed**

```bash
git add .
git commit -m "chore(tooling): verify and finalise linting pipeline"
```
