---
name: api-docs
description: "Use when the user says \"generate API docs\", \"OpenAPI spec\", \"document these endpoints\", or \"is the spec stale\". For FastAPI: exports the framework-native OpenAPI JSON and audits it for undocumented response models, missing examples, and Any-typed bodies. For Next.js routes / Spring: derives the spec from route handlers and DTOs, flagging handlers whose types cannot be derived (they get a needs-your-call marker, never guessed). DRIFT MODE compares the committed spec against current routes and lists added/removed/changed endpoints. Output: openapi.json (or .yaml matching repo convention) + a drift report. NOT for writing user-facing docs prose (doc-updater) and NOT for designing new endpoints (that is feature work with db-design/code-architect)."
allowed_tools: [Read, Write, Bash, Glob, Grep]
---

# api-docs — OpenAPI export, audit, and drift check

## Tool scope

`allowed_tools` is `[Read, Write, Bash, Glob, Grep]`. **`Write` is scoped to the spec output
file only** — `openapi.json` or `openapi.yaml` at whatever path matches repo convention (repo
root, `docs/`, or wherever an existing spec file already lives). Never write to route handlers,
DTOs, or any other source file — this skill documents the API, it doesn't change it. `Bash`
runs the export/diff commands below; `Grep`/`Glob` locate route handlers and an existing
committed spec file.

## Overview

Three paths depending on what's asked and what framework the repo uses:

- **FastAPI export + audit** — the spec already exists at runtime; export it, then audit it.
- **Next.js / Spring derivation** — no framework-native OpenAPI generator; build the spec by
  reading route handlers and DTOs directly.
- **DRIFT MODE** — "is the spec stale" — compare a committed spec against the current routes,
  regardless of which framework produced it.

Detect the framework first: `package.json` with a Next.js dependency, or a Spring
`pom.xml`/`build.gradle`, vs. a Python repo with FastAPI in `pyproject.toml`/`requirements.txt`.

## FastAPI path

FastAPI already builds the OpenAPI schema at runtime — exporting it is two lines, not a
generator:

```python
from app.main import app
import json; json.dump(app.openapi(), open("openapi.json", "w"), indent=2)
```

Adjust `app.main` to the repo's actual app import path (check the ASGI entry point Uvicorn
points at, e.g. in a `Procfile` or `uvicorn app.main:app` invocation) — the import must resolve
without starting the server. If the repo's committed spec convention is `.yaml` not `.json`,
convert after export rather than reshaping the snippet: `python -c "import json, yaml;
yaml.dump(json.load(open('openapi.json')), open('openapi.yaml', 'w'))"`.

Then audit the exported JSON with `jq`, not by eyeballing it. Both snippets below were verified
against a hand-built sample spec before being written here — see the false positives they
deliberately avoid:

- **Undocumented response models** — endpoints with no schema under any response code that's
  actually expected to carry a body (skip `204`/`304`/1xx — those are correctly bodiless, not
  undocumented):
  ```bash
  jq -r '
    .paths | to_entries[] as $p |
    ($p.value | to_entries[]) as $op |
    (($op.value.responses // {}) | to_entries[]) |
    select(.key as $code | (["100","101","204","304"] | index($code)) | not) |
    select(.value.content == null) |
    "\($p.key) [\($op.key | ascii_upcase)] \(.key) — missing response schema"
  ' openapi.json
  ```
  A version that hardcodes `."200"` misses every other status code and false-flags legitimate
  `204`/`304` responses — don't shortcut to that.
- **Missing examples** — schemas with no example anywhere in their definition, at schema or
  property level. Must check **both** `example` (OpenAPI 3.0 / JSON Schema Draft-07 style,
  singular) and `examples` (OpenAPI 3.1 / JSON Schema 2020-12 style, a non-empty array — this
  is what Pydantic v2 + current FastAPI emit by default). Checking only `example` false-flags
  every schema in a 3.1 spec regardless of whether it actually has examples:
  ```bash
  jq -r '
    def has_examples: ((.example // null) != null) or (((.examples // []) | length) > 0);
    .components.schemas | to_entries[] |
    select(
      (.value | has_examples | not) and
      ((.value.properties // {}) | to_entries | map(select(.value | has_examples)) | length == 0)
    ) | .key
  ' openapi.json
  ```
- **`Any`-typed bodies** — a Pydantic field typed `Any` serializes to a genuinely empty schema
  property (no `type`, no `$ref`, no `allOf`/`oneOf`/`anyOf`, no `enum`). Checking only for a
  missing `type` key is not enough — every `$ref`-linked nested model property also lacks
  `type` and would flood the result with false positives. Cross-reference both directions: `jq`
  for the symptom in the spec, `grep` for the cause in source:
  ```bash
  jq -r '
    .components.schemas | to_entries[] as $s |
    (($s.value.properties // {}) | to_entries[]) |
    select(.value | (has("type") or has("$ref") or has("allOf") or has("oneOf") or has("anyOf") or has("enum")) | not) |
    "\($s.key).\(.key)"
  ' openapi.json
  grep -rn --include='*.py' --exclude-dir={__pycache__,.venv,dist,build,.git} -E '\bAny\b' app/
  ```

Report each finding as `path [METHOD] status` or `Schema.property`, not just a raw jq dump.

## Next.js / Spring path

No runtime introspection available — derive the spec by reading source directly.

- **Next.js**: route handlers under `app/api/**/route.ts` (App Router) or `pages/api/**/*.ts`
  (Pages Router). Method exports (`GET`, `POST`, ...) become operations; request/response shapes
  come from the nearest `zod` schema the handler parses/returns (per
  `.claude/rules/typescript_conventions.md`'s `react-hook-form + zod` convention) — a zod
  schema converts to a JSON Schema fragment directly.
- **Spring**: `@RestController` classes, `@GetMapping`/`@PostMapping`/etc. annotations become
  operations; `@RequestBody`/`@ResponseBody` DTO classes become the request/response schemas.

**Never guess a shape you can't derive.** A handler that returns a raw, untyped
`Response`/`ResponseEntity<?>`, builds its response shape dynamically, or parses its body
without a schema gets a `needs-your-call` marker in the generated spec instead of an invented
schema:

```json
"responses": { "200": { "description": "needs-your-call: response shape not statically derivable — see path/to/handler.ts:42" } }
```

List every `needs-your-call` marker in the final report as its own section — these are gaps
the user resolves, not gaps this skill fills in with a plausible-looking guess.

## DRIFT MODE

Compares a committed spec against what the routes currently produce. Concrete approach —
regenerate, don't hand-diff:

1. Locate the committed spec (`openapi.json`/`openapi.yaml` tracked in git) and copy it aside
   first, e.g. `cp openapi.json /tmp/committed.json` — never let step 2 overwrite it in place.
2. Regenerate a fresh spec to a **separate path**, using whichever path above matches the
   framework: for FastAPI, change the export snippet's output arg to
   `json.dump(app.openapi(), open("/tmp/regenerated.json", "w"), indent=2)` rather than
   `openapi.json` — writing the regeneration to the committed filename would silently clobber
   the very file this mode is supposed to diff against, turning step 3 into a no-op comparing
   a file against itself.
3. Normalize both with `jq -S` (sorts object keys) before diffing — otherwise key-ordering
   noise drowns real changes:
   ```bash
   jq -S . /tmp/committed.json > /tmp/committed.norm.json
   jq -S . /tmp/regenerated.json > /tmp/current.norm.json
   diff -u /tmp/committed.norm.json /tmp/current.norm.json
   ```
4. Walk the diff and bucket every changed path into **Added** (in current, not committed),
   **Removed** (in committed, not current), or **Changed** (same path, different
   method/params/schema) — a raw `diff` output is not the drift report, the bucketed list is.

## Output

- The spec file itself: `openapi.json`, or `.yaml` if that's what the repo already has
  committed — match existing convention, don't introduce a new format.
- A drift report (inline, or alongside the spec) listing: audit findings (FastAPI path) or
  `needs-your-call` markers (derivation path), plus the Added/Removed/Changed bucketed list
  (DRIFT MODE only).

## Definition of Done

- Spec file written to the one path matching repo convention — `Write` touched nothing else.
- FastAPI path: all three audit categories (undocumented responses, missing examples,
  `Any`-typed bodies) checked and reported, even when a category is empty ("none found" is a
  reported result, not a skipped check).
- Derivation path: every handler either has a derived schema or an explicit
  `needs-your-call` marker — no handler silently omitted from the spec.
- DRIFT MODE: Added/Removed/Changed lists are named explicitly, not left as a raw diff dump.

## Self-Improvement Loop

If a new framework needs a derivation path not covered here, or the `jq` audit shapes above
produce false positives/negatives against a real spec, update the relevant section before
moving on — don't let the fix live only in that one run's output.
