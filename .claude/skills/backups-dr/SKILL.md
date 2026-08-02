---
name: backups-dr
description: "Use when the user says \"set up backups\", \"disaster recovery\", \"restore test\", \"what if the DB dies\", or when a product first stores real user data. Doctrine: an untested backup is not a backup, and platform redundancy protects the PLATFORM, not your data in it (shared-responsibility model). Does three things: (1) inventories what must survive — DB, object storage, secrets custody, signing keys (cross-references mobile-release's keystore gate), (2) wires the backup path for the actual stack (Postgres/Supabase dump schedule, storage sync) plus a scheduled RESTORE-TEST: restore into a scratch instance and verify a known row, never just check the file exists, (3) writes the one-page DR plan with RPO/RTO in plain numbers and the exact restore commands. Prerequisite-check-first. NOT for git repos (already distributed) and NOT for incident response (monitoring-setup's runbook owns that)."
allowed_tools: [Read, Write, Bash, Glob, Grep]
---

# backups-dr — an untested backup is not a backup

## Tool scope

`allowed_tools` is `[Read, Write, Bash, Glob, Grep]`. **`Write` is scoped to `docs/` in the target
repo** — this skill only creates or edits the DR plan there (default `docs/disaster-recovery.md`)
and, if the stack needs one, a small backup-schedule config file colocated under `docs/` as a
reference snippet, never wired into production CI on its own. `Bash` runs the actual restore-test
(`pg_dump`/`pg_restore`, `supabase db dump`, `psql`) **against a scratch instance only** — read
DB credentials from environment variables the caller already has set (`DATABASE_URL`,
`SUPABASE_...`), never hardcode or print them, per `.claude/rules/security_conventions.md`. This
skill never runs a restore against production, never drops a production database, and never
creates cloud accounts or storage buckets — those are NEEDS YOUR HANDS console steps.

## Overview

Doctrine first, tooling second: platform redundancy (multi-AZ Postgres, S3's eleven-nines
durability) protects the platform's infrastructure from *its own* hardware failures — it does
nothing for a bad migration, an accidental `DELETE`, a dropped table, or a compromised account.
That's the shared-responsibility model, and it's why "the cloud already replicates it" is not an
answer to "what if the DB dies."

Three steps: inventory what must survive, wire the actual backup path, then prove a restore
works by restoring a real row and reading it back — not by checking a file exists on disk.

## Prerequisite check

Run first. Backing up nothing is free; the check is whether there's anything real to back up yet.

1. Detect a real, non-ephemeral data store: `schema.prisma` / `drizzle` config, a `DATABASE_URL`
   / `SUPABASE_URL` env reference in the app, or a `docker-compose.yml` service named
   `postgres`/`db`. Confirm with the user which one is the production data store if more than one
   turns up (e.g. a local dev Postgres alongside a hosted Supabase project).
2. Detect object storage usage if any: search app config for an S3/R2/Supabase Storage bucket
   reference.

**No production data store found → report exactly what's missing ("no DATABASE_URL / Supabase
project reference found — nothing to back up yet") and STOP.** Wiring backups for a database
that doesn't hold real users yet is premature scope, not diligence.

## Survival inventory

List every category that must survive a total platform loss, for this specific product:

| Asset | What "surviving" means | Owner in this run |
|---|---|---|
| Primary database | Restorable to a point in time, verified by restore-test below | This skill |
| Object storage (user uploads, generated assets) | Synced to a second location/provider, not just replicated within one provider | This skill (wiring only — see below) |
| Secrets custody (API keys, DB credentials, signing secrets) | Held in a password manager or secret store the team can access without the original machine | Confirm with the user; this skill does not manage secrets storage itself |
| Signing keys (mobile app, code-signing certs) | **Cross-reference only** — this is `mobile-release`'s Gate 1 (credential custody). Point the user there rather than re-deriving expiry checks or backup-location judgment calls here; duplicating that logic in two places is how it drifts out of sync. |

For the object-storage and secrets rows, this skill confirms an answer exists (asks the user
directly if not obvious from repo config) but does not implement secret-manager migrations or
storage replication — those are stack-specific enough to be a separate task once named.

## Backup wiring per stack

Advisory scaffold — adapt the exact command to the repo's actual stack, this is a shape not a
guarantee:

**Supabase:**
```bash
# Full schema + data dump, run on a schedule (cron/CI), store the output off-platform
supabase db dump --db-url "$SUPABASE_DB_URL" --file backup.sql
```
PITR (point-in-time recovery) exists as a paid add-on on some Supabase plans — enabling it is a
dashboard toggle, marked **NEEDS YOUR HANDS**; this skill only checks whether it's on, it doesn't
purchase the add-on.

**Plain Postgres:**
```bash
# Custom format (-Fc) supports parallel restore and selective table restore
pg_dump -Fc -f backup.dump "$DATABASE_URL"
```
Schedule via cron or a CI scheduled workflow (see `ci-setup` for the workflow shape); store the
output somewhere other than the DB host itself (S3/R2/Backblaze) — a dump sitting next to the
database it backs up survives nothing that takes down the host.

**Object storage:**
```bash
# One-way sync to a second provider/region — advisory shape, adapt bucket/provider names
rclone sync source:my-bucket dest:my-bucket-backup
```

**NEEDS YOUR HANDS:** wiring the actual schedule into a cron/CI dashboard, enabling any paid
PITR/replication add-on, and creating the second-provider storage bucket — this skill generates
the commands, the user (or an already-approved CI config) runs them on a schedule.

## Restore-test procedure

**The contract: verify a known row, never just check that the restore command exited 0 or that a
file exists.** A `pg_restore` that silently drops rows, times out partway, or restores against the
wrong schema version still exits 0 — only a `SELECT` proves the data is actually there.

1. **Establish a known row.** Either insert a canary row before the test (`INSERT INTO
   _backup_canary (id, checked_at) VALUES ('canary-1', now());`) or note an existing row's
   primary key and one column value you can compare byte-for-byte after restore.
2. **Restore into a scratch instance — never production:**
   - Supabase: `supabase start` for a local scratch stack, or a disposable scratch project, then
     `psql "$SCRATCH_DB_URL" -f backup.sql` (plain-format dump) or `pg_restore --dbname
     "$SCRATCH_DB_URL" backup.dump` (custom format).
   - Plain Postgres: `createdb scratch_restore_test && pg_restore -d scratch_restore_test
     backup.dump`.
3. **Verify the known row:**
   `psql "$SCRATCH_DB_URL" -c "SELECT * FROM _backup_canary WHERE id = 'canary-1';"` (or the
   equivalent query against the known existing row) — the value must match exactly, not merely
   return *a* row.
4. **Tear down the scratch instance** immediately after — `dropdb scratch_restore_test` or
   destroy the scratch Supabase project. Never leave restored data sitting live; it's a second,
   untracked copy of user data the moment it exists.
5. **Record PASS or FAIL with a timestamp and which row was checked** in the DR plan's restore-test
   log below. If any step couldn't run (no scratch-instance credentials available this session,
   `pg_restore` not installed), mark the row **UNVERIFIED** with the specific missing piece — same
   honesty discipline as monitoring-setup's alert verification. Never infer PASS from "the dump
   file exists" or "the restore command didn't error."

## DR plan template

Write to `docs/disaster-recovery.md`, filled with real numbers for this product, not placeholders:

```markdown
# Disaster Recovery Plan — <product name>

RPO (Recovery Point Objective): <e.g. 24h — max acceptable data loss if disaster strikes right now>
RTO (Recovery Time Objective): <e.g. 4h — max acceptable time to restore service>

## What backs up
| Asset | Method | Schedule | Retention |
|---|---|---|---|
| Database | <pg_dump / supabase db dump> | <daily, 02:00 UTC> | <7 daily + 4 weekly> |
| Object storage | <rclone sync / provider replication> | <daily> | <matches provider default> |

## Signing keys / credential custody
See `mobile-release` Gate 1 for keystore backup verification and expiry tracking — not duplicated
here.

## Restore commands (exact, for this stack)
<the concrete pg_dump/pg_restore or supabase CLI commands from Backup wiring above, with this
repo's actual env var names filled in>

## Last restore-test
| Date | Result | Row checked | Notes |
|---|---|---|---|
| <date> | PASS/FAIL/UNVERIFIED | <canary id or known row> | <gap named if not PASS> |
```

## Definition of Done

- Survival inventory lists all four asset categories for this product, with the signing-keys row
  pointing at `mobile-release` Gate 1 rather than re-implementing it.
- Backup wiring commands are generated and correct for the detected stack; any console-only step
  (PITR toggle, bucket creation, cron dashboard entry) is marked NEEDS YOUR HANDS, not silently
  assumed done.
- Restore-test actually ran against a scratch instance and the DR plan's log shows PASS/FAIL with
  a timestamp and the specific row checked — or an honest UNVERIFIED naming what was missing.
  "The dump file exists" is never sufficient evidence on its own.
- `docs/disaster-recovery.md` exists with real RPO/RTO numbers and the exact restore commands for
  this repo, not generic placeholders.
- If the prerequisite check failed (no real data store yet), the run stopped there and reported
  what's missing — that is also a valid, complete run.

## Self-Improvement Loop

When a new stack/provider shows up (PlanetScale, Neon, Turso, a non-Postgres store), add its
dump/restore commands to Backup wiring and Restore-test procedure rather than improvising them
inline during a run. If the mobile-release Gate 1 keystore section changes shape, re-check this
skill's cross-reference still points at the right section name.
