---
name: db-design
description: "Use when the user says \"review this schema\", \"design the data model\", \"is this migration safe\", \"add a table/column\", or before any change to the data model (code_quality_lifecycle Phase 1 trigger). Two modes: DESIGN (proposes schema for a feature: entities, relations, indexes for the actual query patterns, constraints at the DB layer per security_conventions — RLS, NOT NULL, FKs — with the trade-offs stated) and MIGRATION REVIEW (checks a pending migration for: destructive operations without a rollback note, table-locking operations on hot tables, missing indexes for new query paths, backfill strategy for NOT NULL additions). Every recommendation states the why in one plain-English line. Output: schema sketch or migration verdict with a rollback plan. NOT for query optimization on existing schemas (profiling work) and NOT for app-layer validation design (zod/pydantic at boundaries per security_conventions)."
allowed_tools: [Read, Bash, Glob, Grep]
---

# db-design — schema sketches and migration verdicts

## Overview

Advisory only — this skill proposes, it never runs a migration or touches a live database.
`allowed_tools` has no `Edit`/`Write`: output is always a markdown sketch or verdict delivered
inline, never a file this skill writes itself. Two modes, chosen by what the user asks for:

- **DESIGN** — "design the data model", "add a table/column" → propose a schema for a new
  feature.
- **MIGRATION REVIEW** — "is this migration safe" → review a migration that already exists
  (a pending PR, a draft `.sql`/ORM migration file, or pasted DDL).

If it's ambiguous which mode applies (e.g. "review this schema" could be either), ask the user
one question rather than guessing — a schema sketch and a migration verdict have different
shapes and re-running the wrong one wastes the turn.

Both modes read `.claude/rules/security_conventions.md` (§SQL / DB) and
`.claude/rules/coding_conventions.md` as their standard — cite the relevant line when a
recommendation traces back to one of them, don't just assert "best practice."

## DESIGN mode

1. **Find the actual query patterns first.** Before sketching a single column, ask (or grep the
   codebase for) what will actually `SELECT`/`JOIN`/`WHERE`/`ORDER BY` this data. Designing
   indexes or denormalization before knowing the access pattern is guessing — the
   index-for-actual-query-patterns rule below depends on this step happening first, not after.
2. **Sketch entities and relations.** One entity per real-world noun the feature needs, FKs for
   every relation, no speculative columns for a future feature nobody asked for yet — per
   coding_conventions.md's "no defensive code for impossible cases" and "don't extract
   [structure] from speculation": a `metadata_json` catch-all column added "in case we need it
   later" is exactly that kind of premature abstraction, applied to schema instead of code.
   Present as a short table per entity (column, type, nullable?, FK target) plus a one-line
   relation list, not a full CREATE TABLE unless the user asks for the DDL.
3. **Index for the actual query patterns from step 1** — not "index every foreign key" or
   "index every column that might get filtered." Each proposed index names the specific query
   shape it serves (e.g. "composite index on `(org_id, created_at)` — serves the dashboard's
   `WHERE org_id = ? ORDER BY created_at DESC` list query"). An index with no named query
   behind it is a write-amplification cost with no read benefit — cut it.
4. **DB-layer constraints per security_conventions.md:**
   - **RLS** (Postgres/Supabase) on any table holding user- or org-scoped rows — "enforce at
     the DB layer, not app layer" is the rule verbatim; an app-layer `WHERE user_id = ?` that
     a future code path forgets to add is exactly the failure RLS prevents structurally.
   - **NOT NULL** wherever the domain actually requires a value — nullable-by-default is a
     silent invitation for null-check bugs three call sites downstream.
   - **FKs** for every relation named in step 2 — referential integrity belongs in the schema,
     not in application code that "should" clean up orphaned rows.
   - **LIMIT-by-default** — this is a query-writing habit this schema should support, not a
     schema-level constraint: flag it as a note for whoever writes the first `SELECT` against a
     user-exposed table — "every SELECT against a user-exposed table has a LIMIT (default
     100)" per security_conventions.md.
5. **State the trade-off per recommendation, not just the recommendation.** RLS adds per-query
   planner overhead in exchange for a structural guarantee app code can't bypass. A NOT NULL
   column forces a backfill plan on any existing table (see MIGRATION REVIEW's check 4) in
   exchange for eliminating a whole class of null-check bugs. A composite index speeds the
   query it targets and slows every write to that table — worth it only when the query is
   actually hot. Name the trade-off in one clause, don't just assert the constraint is correct.

## MIGRATION REVIEW mode

Read the migration file (or diff) in full before scoring anything. Run these four checks in
order — each one gets a plain-English "why" sentence, not just a flag:

1. **Destructive without a rollback note.** `DROP COLUMN`, `DROP TABLE`, a narrowing
   `ALTER COLUMN ... TYPE`, or a bare `RENAME` with no compensating view/alias for the old name
   are all irreversible once data is gone. Check: does the migration (or its PR description)
   state how to undo it — a down-migration, or "restore from backup, point-in-time recovery
   window is N days"? No rollback note on a destructive op is an automatic BLOCK — "we can
   always restore from backup" is not a plan until it names the actual restore command and the
   retention window.
2. **Table-locking operations on hot tables.** Postgres's classic offenders, in order of how
   often they surprise people:
   - `CREATE INDEX` without `CONCURRENTLY` takes a lock that blocks writes for the build
     duration — on a hot table that's minutes of stalled writes. Escape hatch:
     `CREATE INDEX CONCURRENTLY` (note: can't run inside a transaction block, so it needs its
     own migration step, and it can leave an invalid index behind if it fails — the migration
     must check for and drop an `INVALID` index before retrying).
   - `ALTER TABLE ... ADD COLUMN ... NOT NULL DEFAULT <value>` rewrites the entire table on
     Postgres versions before 11; even on 11+, a *non-constant* default (e.g. a function call)
     still forces a full rewrite. Escape hatch: add the column nullable with no default first,
     backfill in batches, then add the constraint (see check 4).
   - `ALTER TABLE ... ALTER COLUMN TYPE` is a full table rewrite plus an `ACCESS EXCLUSIVE`
     lock for its duration, full stop — there's no concurrent variant. Flag it regardless of
     table size; on a genuinely hot table this needs an off-peak maintenance window, not a
     silent deploy.
   - Adding a `FOREIGN KEY` validates every existing row under lock by default. Escape hatch:
     `ADD CONSTRAINT ... NOT VALID` (takes the FK immediately for new writes, no full-table
     lock) followed by a separate `VALIDATE CONSTRAINT` step (takes a lighter lock, can run
     later).
   - "Hot table" here means anything with meaningful write traffic in production — when in
     doubt, ask the user rather than assume a table is quiet.
3. **Missing indexes for new query paths.** Same rule as DESIGN mode step 3, applied in
   reverse: if this migration adds a column that a shipped or soon-to-ship query will filter,
   join, or sort on, and no corresponding index appears in this migration (or an adjacent one),
   flag it — a migration that ships a new query path without its index is the single most
   common cause of "why did this endpoint get slow the week after deploy."
4. **NOT NULL backfill strategy.** Adding `NOT NULL` to a column on a table that already has
   rows needs four steps, not one: (a) add the column nullable, (b) backfill existing rows in
   batches (a single giant `UPDATE` is itself a table-locking op — see check 2), (c) add a
   `CHECK (col IS NOT NULL) NOT VALID` then `VALIDATE CONSTRAINT` once the backfill is confirmed
   complete (Postgres 12+: this avoids re-scanning under a stronger lock; pre-12, the constraint
   add itself scans the table), (d) **only then** `ALTER COLUMN col SET NOT NULL` — Postgres
   12+ can satisfy this cheaply because the validated CHECK already proves no row violates it,
   but the step is not optional: a validated CHECK constraint is not the same thing as an actual
   `NOT NULL` column, and ORMs/introspection tools/the query planner see them differently.
   Flag a migration that stops at step (c) — it looks done but leaves the column nullable.
   A single-step "add column NOT NULL" on any table with existing rows is a BLOCK unless the
   table is confirmed empty.

## Output

**DESIGN mode** → a schema sketch: entity tables, relation list, indexes with their query
justification, DB-layer constraints, trade-offs — per the five DESIGN steps above.

**MIGRATION REVIEW mode** → a verdict, one of `SAFE` / `SAFE WITH CHANGES` / `BLOCKED`, each
paired with a rollback plan — even a `SAFE` verdict states what to run if this migration needs
reverting after deploy; "it should be fine" is not a rollback plan. List each of the four
checks with its result and one-line why, in the order run above.

## Definition of Done

- DESIGN mode: every proposed table/column/index/constraint has a stated reason, and every
  constraint recommendation traces to a named line in security_conventions.md or
  coding_conventions.md rather than an unsourced "best practice" claim.
- MIGRATION REVIEW mode: all four checks ran and are reported (not silently skipped), the
  verdict is one of the three named values, and a rollback plan is present even when the
  verdict is SAFE.
- Neither mode ran a migration, wrote a file, or touched a database — output is advisory text
  only, matching `allowed_tools`.

## Self-Improvement Loop

If a migration review misses a locking pattern not listed in check 2, or security_conventions.md
gains a new DB-layer rule this skill doesn't cite yet, update the relevant section above before
moving on — don't let the fix live only in that one review's output.
