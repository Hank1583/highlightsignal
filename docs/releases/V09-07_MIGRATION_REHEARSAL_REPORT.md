# V09-07 — Workspace Migration Rehearsal Report

Date: 2026-07-21
Executor: codex/v09-roadmap session (owner-directed, direction 1 chosen — see
task packet)
Environment: disposable Docker `mysql:5.6` container on the developer's
Windows machine, bound to `127.0.0.1` only, destroyed after use. Never touched
the real pre-launch host or its shared MySQL account.
Data source: `D:\7.Highlight\3.Backup\vhost125121-8.sql` — a real phpMyAdmin
export of the pre-launch database (MySQL 5.6.36-log, generated
2026-07-17 14:13). This is production-like real data, not synthetic fixtures.

---

## 1. Why this direction

The task packet flagged this task as `LIKELY_BLOCKED_BY_HOSTING`: the real
host has no SSH/cron, and no disposable database was known to be available.
The owner was asked to pick one of three directions and chose **direction 1**
(get a real backup, restore it somewhere controllable, actually rehearse).
Docker was re-evaluated and used this time (it was rejected during V09-01 for
reasons not recorded in detail; the owner explicitly authorized reconsidering
it for this task).

## 2. Environment setup

* `mysql:5.6` official image, container `hs_v0907_rehearsal`, port published
  only on `127.0.0.1:33061` (never exposed beyond the local machine).
* Two databases restored from the same dump into the same container:
  `rehearsal_main` (clean happy-path rehearsal) and `rehearsal_break`
  (destructive/failure scenarios) — kept separate so destructive tests never
  contaminate the evidence used for the happy-path postflight numbers.
* Local PHP 8.3 (`D:\4.Tool\php`) with `mysqli`/`pdo_mysql` enabled via a
  scratch-only `php.ini` (not touching the repo). A scratch-only
  `HIGHLIGHT_SIGNAL_ENV_FILE` pointed `DB_HOST=127.0.0.1`,
  `DB_PORT=33061` at the container — `backend/private/.env` does not exist in
  this checkout, so there was no risk of `ConnectionFactory` accidentally
  resolving to a real host's credentials.
* Both databases and the container were destroyed after the rehearsal
  (`docker rm -f` + `docker volume prune`); nothing from this rehearsal is
  left running. The original backup file itself is untouched and remains
  wherever the owner put it.

## 3. Preflight snapshot (before touching anything)

Restored `rehearsal_main` state, before baseline/migrate:

| Table | Count | Note |
|---|---|---|
| workspaces | 2 | id=2 (owner member_id=1), id=3 (owner member_id=7) |
| workspace_members | 2 | both owner/active |
| legacy_member_workspace_map | 2 | 1→2, 7→3, bijective, no anomalies |
| ga_connections | 9 | no `workspace_id` column yet |
| seo_sites | 5 | no `workspace_id` column yet |
| si_sites | 5 | |
| seo_summary_cache | 5 | |
| seo_scan_history | 8 | |
| si_analysis_runs | 96 | |
| dashboard_ai_logs | 9 | |
| dashboard_ai_plan_logs | 7 | |
| seo_pagespeed_cache | 7 | |
| seo_pagespeed_history | 9 | |

No `schema_migrations` table existed in the dump — expected, since the real
host has always applied `010`–`019` by hand via
`manual_apply_bookkeeping.sql`, never through `bin/migrate.php`. This
snapshot is genuinely **mid-migration**: `010`–`014` are reflected in the
schema (workspaces/members/mapping tables exist with real data), but `015`,
`016`, `018`, `019` are not yet applied (no `workspace_id` column anywhere).
This is a materially more useful rehearsal target than an empty schema would
have been — it exercises the exact pending migrations against real
production-shaped data.

## 4. Happy-path rehearsal (`rehearsal_main`)

1. `php bin/migrate.php status` → all 9 versions `pending` (confirms the
   runner has genuinely never recorded anything against this data before).
2. `php bin/migrate.php baseline --versions=010,011,012,013,014` → recorded
   as applied without re-running DDL (matches the real host's actual
   history).
3. `php bin/migrate.php migrate` → **this is the first time this runner has
   ever actually executed migrations**, against real production-shaped data:

   | Version | File | Duration |
   |---|---|---|
   | 015 | ga_connections_workspace_expand | 21ms |
   | 016 | ga_connections_workspace_backfill | 2ms |
   | 018 | seo_si_dashboard_workspace_expand | 193ms |
   | 019 | seo_si_dashboard_workspace_backfill | 21ms |

4. Postflight (`postflight_ga_workspace_backfill_invariants.sql`,
   `postflight_v09_04_seo_si_dashboard_workspace_backfill_invariants.sql`):
   all invariant counts **0** except one genuine, pre-existing anomaly:

   > `dashboard_ai_logs` row `id=1`, `user_id=8`, created 2026-05-14 — no
   > `legacy_member_workspace_map` entry for `member_id=8` as of this
   > backup's snapshot date (2026-07-17). Correctly left `workspace_id=NULL`
   > and surfaced in the anomaly report, not guessed. `member_id=8` is the
   > same account used later (2026-07-21, see tracker) for V09-05's
   > cross-workspace negative test — it evidently used the Dashboard AI
   > feature before it had a Workspace mapping. **Action for the owner**:
   > decide whether `member_id=8` now has a Workspace on the real host (it
   > should, if V09-06's provisioning flow or a manual fix has run since);
   > if so this row can be backfilled by re-running `019` after
   > `legacy_member_workspace_map` gains that mapping (it is idempotent —
   > see migrations/019's own header). Not fixed as part of this rehearsal;
   > this is a real-data finding to hand back, not a rehearsal artifact.

5. Idempotency: re-running `migrate` immediately reports
   `No pending migrations.`; postflight counts unchanged.

**Row-count/anomaly/timing evidence required by the task packet is captured
above in full.**

## 5. Destructive scenarios (`rehearsal_break`) — the part V09-01 flagged as untestable

These three scenarios were explicitly recorded in the tracker as
"确定無法測試" (no SSH, no disposable DB). With a disposable environment now
available, all three were actually run:

### 5.1 Checksum tampering

Appended one line to an **already-applied** migration file (016, in an
isolated scratch copy of `backend/`, never the real repo file) and re-ran:

* `status` → `016` correctly reported as `checksum_mismatch`.
* `migrate` → correctly refused with: *"Checksum mismatch for applied
  migration 016 ... Aborting before applying any further migrations."*
  Exit code 1. Confirmed fail-closed **before** touching anything else.

### 5.2 Deliberately-broken migration

Added a fixture migration (version `021`, scratch-only, references a
non-existent table) and ran `migrate`:

* Failed clearly: `Migration 021 ... failed on statement 1: Table
  ...doesn't exist`. Exit code 1.
* `schema_migrations` has **no row** for `021` — not falsely recorded.
* `status` afterward still shows `021` as `pending`, not stuck in a broken
  state — the lock was correctly released (`finally` block) so the next
  invocation works normally.

### 5.3 Concurrent runners racing for the lock

Two `php bin/migrate.php migrate` processes launched ~2 seconds apart against
a fixture migration that runs `SELECT SLEEP(15)`:

* Process A: acquired the lock, ran for the full 15s, applied successfully.
* Process B: correctly blocked, then failed after the 10s `GET_LOCK` timeout
  with *"Another migration run holds the lock (timed out after 10s). Not
  running concurrently."*
* `schema_migrations` has exactly **one** row for that version — no
  duplicate application.

### 5.4 Mid-batch failure of an expand (DDL) migration — **found and fixed a real bug**

This scenario was the actual point of doing this rehearsal against real data
rather than trusting the design read-through: a mutated copy of `018`
(9 separate `ALTER TABLE` statements) had a 10th, deliberately-broken
statement inserted after the 3rd real one, to simulate a failure partway
through a real multi-statement expand migration.

**Expected**: the runner throws, records nothing, and 3 of 9 tables end up
with the new column (since MySQL DDL auto-commits per statement and this
runner does not wrap the file in a transaction — confirmed intentional, see
`applyOne()`'s docblock).

**Actual (before fixing anything)**: the runner reported `applied 018` with
**no error at all**, recorded it as fully applied in `schema_migrations`,
and then went on to also run `019` (backfill) against the same
partially-expanded schema — which itself silently backfilled the 3 tables
that did have the column and said nothing about the other 6 that didn't
(also `applied`, also with no error).

**Root cause** (`backend/api/src/Migration/MigrationRunner.php`,
`applyOne()`): the result-draining loop is

```php
do {
    $result = $this->database->store_result();
    ...
    if ($this->database->errno !== 0) { throw ...; }
    $statementIndex++;
} while ($this->database->more_results() && $this->database->next_result());
```

`mysqli::next_result()` returns `false` both when there is genuinely nothing
left **and** when the next statement in the batch failed to execute. Those
two cases are indistinguishable from the loop condition alone, so on a
mid-batch failure the loop just exits — the failed statement's error is
never inspected, because the `errno` check only runs for statements that
`store_result()` was actually called for, one iteration *before* the failing
`next_result()` call. Verified in isolation with a 3-statement repro
(`INSERT ok; INSERT into nonexistent_table; INSERT ok`): after the loop exits
silently, `$connection->errno` is `1146` (table doesn't exist) — **the error
information is there, the loop just never looks at it.**

**Fix applied** (same file, same method): after the loop, check
`$this->database->errno` one more time and throw if it's non-zero:

```php
} while ($this->database->more_results() && $this->database->next_result());

if ($this->database->errno !== 0) {
    throw new RuntimeException(sprintf(
        'Migration %s (%s) failed on statement %d: %s',
        $version, $name, $statementIndex, $this->database->error
    ));
}
```

**Re-verified with the fix**: the exact same mutated-018 fixture now
correctly throws `Migration 018 ... failed on statement 4: Table
...doesn't exist`, records nothing in `schema_migrations`, and leaves the
same 3-of-9 partial DDL state for a human to recover — instead of lying
about success. Confirmed the fix does not affect the happy path: re-ran the
full `rehearsal_main` sequence (section 4) with the fixed real
`bin/migrate.php` end to end, same durations, same clean postflight.

**Recovery procedure demonstrated and now documented** (see section 6) —
manually completing the remaining ALTERs and then `baseline`-ing the file,
rather than trying to blindly re-run it (MySQL 5.6's `ALTER TABLE ADD
COLUMN` has no `IF NOT EXISTS`, so blindly re-running a partially-applied
expand migration fails immediately on the first, already-succeeded
statement).

## 6. Recovery runbook: what to actually do if a migration fails partway

This project's migrations are deliberately expand/backfill-only (additive,
nullable, no FK) — there is no "down" migration to run, by design (see each
migration file's own header, and the `020_..._DEFERRED.sql` /
`017_..._DEFERRED.sql` contract-migration headers). "Rollback" here means
**recovering to a consistent, known state**, not undoing DDL.

**If `bin/migrate.php migrate` fails with "failed on statement N":**

1. **Do not re-run it immediately.** For an expand-phase (DDL) migration
   with more than one statement, earlier statements in the same file may
   have already taken effect — MySQL DDL auto-commits per statement and
   this runner does not wrap a file in a transaction. Re-running blindly
   will typically fail again immediately on statement 1 (`Duplicate column`
   or similar), because `ALTER TABLE ADD COLUMN` is not idempotent on
   MySQL 5.6.
2. **Diagnose what actually landed.** For each table/target the failed file
   touches, check directly (`SHOW COLUMNS FROM <table> LIKE '<column>'`, or
   the equivalent index/constraint check) — do not assume the file's
   statement order tells you where it stopped; verify.
3. **Fix the root cause** of the failing statement (wrong assumption about
   the real schema, a typo, a table that doesn't exist on this host, etc.).
4. **Manually complete the remaining effect of the file** to match its
   documented intent exactly (same column type/nullability/index as the
   file specifies) via a direct SQL client — do this by hand for the
   specific tables that are still missing the change, not by re-running the
   whole file.
5. Once the schema **fully and exactly** matches what the file would have
   produced, run `php bin/migrate.php baseline --versions=<N>` to record it
   as applied — do **not** try to force `migrate` to "complete" it, since
   the runner has no partial-completion concept.
6. Re-run `php bin/migrate.php migrate` normally to pick up any migrations
   still pending after that one (e.g. the matching backfill file).
7. Run that migration's postflight invariant file and confirm every count is
   zero (or an understood, pre-existing anomaly — see section 4.4) before
   telling anyone the migration is done.

**If it's a backfill-phase (UPDATE ... WHERE x IS NULL) migration that fails
partway**: these are written to be idempotent on purpose (every statement in
`016`/`019` only touches rows still `NULL`) — fix the root cause and just
re-run `migrate` normally. No manual reconciliation needed; this was not
re-tested destructively here because it follows directly from the files'
own idempotency guarantee, already exercised positively in section 4.5.

**Concurrent execution**: never run two `migrate` invocations against the
same database at the same time on purpose. If one is already running and a
second is attempted (e.g. by accident, or a retried CI step), it will wait
up to 10 seconds and then fail loudly rather than double-apply — that is
the correct outcome, not a bug to work around.

## 7. What this resolves vs. what remains

**Resolved by this rehearsal:**
* V09-07's mandatory deliverables (row counts, anomaly list, timings,
  recovery/rollback evidence) — all produced above against real data.
* V09-01's three previously-"impossible to test" destructive scenarios
  (checksum tampering, broken migration, concurrent runners) — all now
  actually tested and confirmed correct.
* A real, previously-undetected bug in `MigrationRunner::applyOne()` — found
  and fixed as a direct result of this rehearsal, not something that could
  have been found by design review alone.

**Still not covered (unchanged from before this task):**
* This was run on PHP 8.3 locally, not the real host's PHP 7.0 — this
  rehearsal does not validate PHP-version compatibility of the runner
  itself, only its logic. That risk is already tracked separately
  (V08-05's accepted PHP 7.0 risk).
* The real host still has no SSH/cron, so `bin/migrate.php` still cannot run
  *there* — this rehearsal proves the tool is now more trustworthy if it
  ever becomes runnable (new host, or SSH/scheduled-task access granted),
  it does not change how migrations are applied on the current host
  (still `manual_apply_bookkeeping.sql` by hand).
* This dump is from 2026-07-17; it does not reflect the real host's current
  state (which has since had `018`/`019` applied for real, plus whatever
  happened between then and now). Treat the anomaly in section 4.4 as a
  point-in-time finding to re-check against the real host, not as
  necessarily still true today.

## 8. Files touched by this task

* `backend/api/src/Migration/MigrationRunner.php` — bug fix (section 5.4).
  No other production file changed.
* This report (new).
* Tracker and task-packet status updates (see those files' own dated
  entries).

Nothing else in `backend/` or the frontend was touched. No migration file
content changed. No data on the real pre-launch host was touched.
