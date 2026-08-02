---
name: i18n-check
description: "Use when the user says \"i18n check\", \"find hardcoded strings\", \"is this translatable\", \"locale completeness\", or before adding a second language. Static pass over the UI codebase: user-visible string literals outside the i18n system (JSX text nodes, alert/placeholder/aria-label attributes), locale-file completeness across languages (keys present in one locale but missing in another), concatenation-built sentences that break under translation, and date/number formatting not using Intl. Reports per-file with counts, worst offenders first, each finding with the why (what breaks when a translator or RTL layout meets this code). If the repo has no i18n system, says so and recommends one for the stack instead of scanning. NOT for translating content and NOT for hreflang/SEO locale tags (seo-audit)."
allowed_tools: [Read, Bash, Glob, Grep]
---

# i18n-check — hardcoded strings, locale-key drift, translation-hostile code

## Overview

Static pass, not a translation service. Four checks: string literals living outside the i18n
system, locale-file key completeness across languages, sentences built by concatenation (which
break the moment word order changes in another language), and date/number formatting that bypasses
`Intl`. Every finding says what breaks when a translator or an RTL layout meets the flagged code —
not just that a string exists.

Not for hreflang / SEO locale tags — that's `seo-audit`. Not for producing the translations
themselves.

## Prerequisite check — detect the i18n system, or stop

Run first, always. Detect via `package.json` and config files (single-file checks — no directory
scan needed, so no `--exclude-dir` here):
```bash
grep -n "next-intl\|react-i18next\|i18next\|react-intl\|expo-localization\|vue-i18n\|FormatJS" package.json
```
Also check for the config/locale directory itself: `next-intl.config.*`, `i18n.ts`/`i18n.js`,
`locales/`, `messages/`.

**If no i18n system is detected: stop the scan and recommend one for the stack instead — do not
run the checks below against a codebase that has nowhere to route extracted strings.**

| Stack signal | Recommended system |
|---|---|
| Next.js (`next.config.*` present) | `next-intl` |
| React Native / Expo (`app.json` has an `expo` key, or `"react-native"` in `package.json`) | `i18next` + `react-i18next` for translation, `expo-localization` for device locale detection |
| Plain React SPA (no framework config above) | `react-i18next` |
| Vue | `vue-i18n` |

## Static scan — string literals outside the i18n system

All greps use the exclusion set from `.claude/references/safe-grep-patterns.md`:
```bash
--exclude-dir={node_modules,dist,build,.git,.next,__pycache__,.venv,coverage,.turbo}
```

**JSX text nodes** (heuristic — text sitting directly between tags):
```bash
grep -rnE '>[A-Za-z][a-zA-Z0-9 ,.!?'"'"']{2,}<' \
  --include='*.tsx' --include='*.jsx' \
  --exclude-dir={node_modules,dist,build,.git,.next,__pycache__,.venv,coverage,.turbo} \
  .
```
Then drop matches that already route through the detected i18n system before reporting, e.g.:
```bash
grep -rnE '>[A-Za-z][a-zA-Z0-9 ,.!?'"'"']{2,}<' \
  --include='*.tsx' --include='*.jsx' \
  --exclude-dir={node_modules,dist,build,.git,.next,__pycache__,.venv,coverage,.turbo} \
  . | awk '!/\{t\(|useTranslations|<Trans|FormattedMessage/'
```
`awk`, not a second `grep`, because this stage filters an already-`file:line`-prefixed stream — a
piped `grep -n` would number the *stream*, corrupting the `file:line` it's filtering. `\{t\(`
(not bare `t\(`) avoids over-matching the tails of `useEffect(`, `import(`, `startTransition(`,
which would silently drop real findings rather than just add noise.

**Attribute literals** (`alert`/`placeholder`/`aria-label` and similar user-facing attributes):
```bash
grep -rnE '(placeholder|aria-label|alt|title)=["'"'"'][A-Za-z][^"'"'"']{2,}["'"'"']' \
  --include='*.tsx' --include='*.jsx' \
  --exclude-dir={node_modules,dist,build,.git,.next,__pycache__,.venv,coverage,.turbo} \
  .
```

**Imperative calls with literal strings** (`alert(...)`, `confirm(...)`):
```bash
grep -rnE '\b(alert|confirm)\(["'"'"'][A-Za-z]' \
  --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' \
  --exclude-dir={node_modules,dist,build,.git,.next,__pycache__,.venv,coverage,.turbo} \
  .
```

## Locale-file completeness

Flat locale files (top-level keys only):
```bash
diff <(jq -r 'keys[]' locales/en.json | sort) <(jq -r 'keys[]' locales/fr.json | sort)
```

Nested locale files (dotted-path flatten, any number of locales at once):
```bash
node -e '
const fs = require("fs");
const dir = "locales";
const files = fs.readdirSync(dir).filter(f => f.endsWith(".json"));
const flat = (obj, prefix = "") => Object.entries(obj).flatMap(([k, v]) =>
  typeof v === "object" && v !== null ? flat(v, `${prefix}${k}.`) : [`${prefix}${k}`]
);
const keysByLocale = Object.fromEntries(
  files.map(f => [f, new Set(flat(JSON.parse(fs.readFileSync(`${dir}/${f}`))))])
);
const all = new Set(Object.values(keysByLocale).flatMap(s => [...s]));
for (const key of all) {
  const missing = Object.entries(keysByLocale).filter(([, keys]) => !keys.has(key)).map(([f]) => f);
  if (missing.length) console.log(`${key} missing in: ${missing.join(", ")}`);
}
'
```
Swap `locales` for the repo's actual messages directory (`messages/` for `next-intl`, etc.).

## Concatenation-built sentences

Sentence built from literal fragments glued around a variable — breaks the moment another
language's word order differs:
```bash
grep -rnE '["'"'"'][^"'"'"']*["'"'"']\s*\+\s*[a-zA-Z_$][a-zA-Z0-9_$.]*\s*\+\s*["'"'"']' \
  --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' \
  --exclude-dir={node_modules,dist,build,.git,.next,__pycache__,.venv,coverage,.turbo} \
  .
```
Same pattern via template literal:
```bash
grep -rnE '`[A-Za-z ]+\$\{[a-zA-Z_.]+\}[A-Za-z ]+`' \
  --include='*.ts' --include='*.tsx' \
  --exclude-dir={node_modules,dist,build,.git,.next,__pycache__,.venv,coverage,.turbo} \
  .
```

## Non-Intl date/number formatting

Locale-less calls silently use the runtime's default locale, not the app's selected one:
```bash
grep -rnE '\.toLocaleDateString\(\)|\.toLocaleTimeString\(\)|\.toLocaleString\(\)' \
  --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' \
  --exclude-dir={node_modules,dist,build,.git,.next,__pycache__,.venv,coverage,.turbo} \
  .
```
Manually assembled dates instead of `Intl.DateTimeFormat`:
```bash
grep -rnE '\.getMonth\(\)|\.getDate\(\)|\.getFullYear\(\)' \
  --include='*.ts' --include='*.tsx' \
  --exclude-dir={node_modules,dist,build,.git,.next,__pycache__,.venv,coverage,.turbo} \
  .
```
Banned library per `typescript_conventions.md` (also a translation liability — no built-in locale
awareness without an extra plugin):
```bash
grep -rn "from ['\"]moment['\"]\|require(['\"]moment['\"])" \
  --include='*.ts' --include='*.tsx' --include='*.js' \
  --exclude-dir={node_modules,dist,build,.git,.next,__pycache__,.venv,coverage,.turbo} \
  .
```

## Report format

Per-file, worst offenders (highest count) first:

| File | Category | Confidence | Count | Worst example | Why it breaks |
|---|---|---|---|---|---|
| `components/Checkout.tsx` | Hardcoded JSX text | JUDGMENT | 6 | `:42` — `<p>Order confirmed!</p>` | A translator working from the locale file never sees this string — it ships in English no matter which language the user picked |
| `locales/fr.json` | Missing keys | AUTO | 3 | `checkout.confirm_button` missing in `fr.json` | French users see the raw key string (`checkout.confirm_button`) instead of a translated label |
| `lib/receipt.ts` | Concatenation-built sentence | AUTO | 1 | `:12` — `"You owe " + amount + " today"` | Word order varies by language; concatenation can't reorder around the variable, producing grammatically broken output |
| `components/OrderDate.tsx` | Non-Intl date formatting | JUDGMENT | 2 | `:8` — `date.toLocaleDateString()` (no locale arg) | Ignores the app's selected locale, always rendering in the visitor's OS/browser locale instead |

- `Category`: one of the four checks above.
- `Confidence`: `AUTO` for the two deterministic checks (locale-key completeness is a set diff,
  concatenation is a precise syntactic shape) — report these as confirmed findings. `JUDGMENT` for
  the two heuristic checks — JSX-text-node matches can't tell a real UI string from a code sample,
  brand name, or already-translated text the grep missed; date/number matches can't tell a
  user-facing display from internal date math with no render path. Never auto-confirm a `JUDGMENT`
  row; list it and let the user's eyes make the call, same as `security-audit`'s permissive-regex and
  path-validation rows.
- `Count`: total matches for that file, after excluding matches already routed through the detected
  i18n system.
- `Worst example`: `file:line` plus the actual matched snippet — the single clearest instance, not
  every match.
- `Why it breaks`: concrete consequence for a translator or an RTL layout, not "not internationalized."

## Definition of Done

- Prerequisite check ran first; if no i18n system was found, the report contains only the stack
  recommendation and nothing else — no partial scan against a codebase with nowhere to route strings.
- Every one of the four checks that had a working prerequisite (jq/node for locale-completeness,
  grep for the rest) actually ran and is reflected in the report.
- Every finding row has a non-empty "Why it breaks" naming the concrete translator/RTL consequence.
- Locale-completeness output lists every locale a key is missing from, not just "some locale."
- Every `JUDGMENT`-confidence row (hardcoded JSX text, non-Intl date/number) is reported as
  `JUDGMENT`, never silently upgraded to a confirmed finding — the two heuristic checks can't tell a
  real UI string from a code sample or brand name, and that call is the user's, not the scan's.

## Self-Improvement Loop

If a grep shape above starts drowning real findings in false positives (a component library with
JSX text nodes that are legitimately non-translatable, e.g. code samples), add an exclusion pattern
here before the next run rather than eyeballing past it each time. If a new i18n library becomes
common for a stack the user uses, add it to the Prerequisite check's detection grep and the stack
recommendation table.

**Known limitation — same-line false negative in the JSX text-node filter:** the `awk` stage in
Static scan drops the whole matching *line*, so a genuinely untranslated string sharing a physical
line with an unrelated i18n call (e.g. `<div>{t('label')}: <span>Total2</span></div>`) is silently
dropped instead of surfacing as `JUDGMENT` — narrow in Prettier-formatted code (one JSX element per
line), but a true silent miss, the exact failure the audit-family contract exists to prevent.
Upgrade path: replace the line-level `awk` filter with a token-level match — isolate each JSX text
node individually (e.g. a small AST pass via `@babel/parser`, or split the line on tag boundaries
before filtering) so a translated call and an untranslated string on the same line are judged
independently instead of one exempting the other.
