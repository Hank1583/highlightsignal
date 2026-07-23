# V09-01 / V09-02 / V09-03 verification runbook

> **This hosting plan (智邦生活館 虛擬主機) has no SSH/cron.** Section 1 below
> (the `php bin/migrate.php` runner) cannot be executed on it and is kept only
> as future-ready tooling for if SSH or a scheduled-task feature is ever
> enabled later, or the app moves host. **The actual operating procedure today
> is `backend/sql/manual_apply_bookkeeping.sql`** — paste each migration file
> into phpMyAdmin ("MySQL資料庫設定") by hand, then run that file's matching
> bookkeeping `INSERT` so `schema_migrations` stays an honest record even
> without the runner ever running. Sections 2 and 3 below (the postflight
> checks and negative tests) still apply as written regardless of which way
> the migrations were applied.

This project's usual practice (per `docs/00_V07_TO_V12_PROGRESS_TRACKER.md`) is
URL/SSH-only verification against the real pre-launch host rather than a local
rehearsal stack. Section 1 was originally written for an SSH workflow; read the
note above first.

Read the whole file before running anything — several steps are ordered on
purpose (e.g. `baseline` before `migrate`, or in the manual path, the
bookkeeping file's step order), and a few destructive test scenarios are
explicitly flagged as needing a disposable database rather than this shared
one — with no SSH, those three are an accepted gap, not something to chase
further right now.

## 0. Before you start

```bash
php -v                 # record the actual PHP version for the record
```

The pre-launch database already has `010`–`012`'s tables created by hand
(confirmed in the tracker's earlier DB smoke tests). Nothing below drops or
rewrites existing data; every migration here is additive or backfill-only.

## 1. V09-01 — migration runner (SSH-only; not usable on this host today — see note above)

**2026-07-21 update**: the runner itself has since actually been executed —
against a real backup restored into a disposable local Docker `mysql:5.6`
container (V09-07's rehearsal), not against this host. `status`, `baseline`,
`migrate`, idempotent re-run, checksum-mismatch fail-closed, a deliberately
broken migration, and two concurrent runners racing for the lock were all
exercised and confirmed correct. That rehearsal also found and fixed a real
bug in `applyOne()`'s statement-failure detection for multi-statement files —
see `docs/releases/V09-07_MIGRATION_REHEARSAL_REPORT.md` for the full
writeup and the recovery procedure for a mid-batch expand-migration failure.
This host still has no SSH, so the operating procedure below (manual
`phpMyAdmin` + `manual_apply_bookkeeping.sql`) is unchanged in practice — but
the runner's own correctness is no longer an open question if a future host
change or SSH access ever makes it runnable here.

```bash
php bin/migrate.php status
# expect: 010/011/012/013/014/015/016 all "pending" -- schema_migrations is
# empty until the next two commands run. This is correct, not a bug: the
# runner has no way to know 010-012 were already applied by hand until you
# tell it.

php bin/migrate.php baseline --executor=<your-name-or-release-id> --versions=010,011,012
php bin/migrate.php status
# expect: 010/011/012 now "applied" (via baseline, duration_ms=0);
# 013/014/015/016 still "pending"

php bin/migrate.php migrate --executor=<your-name-or-release-id>
php bin/migrate.php status
# expect: all 7 "applied". 013 is additive (4 new/likely-already-existing
# tables, IF NOT EXISTS). 014/015/016 are V09-02/V09-03 -- see their own
# sections below before running this if you want to inspect state in between.
```

**Gap to accept or address separately**: three of the task packet's mandatory
scenarios — checksum tampering, a deliberately-broken migration fixture, and
two concurrent runners racing — need a disposable database, not this shared
one. They are not exercised by the steps above. If you want them covered,
the safest option on this same MySQL server is a throwaway schema:

```sql
CREATE DATABASE hs_migration_rehearsal_test;
```

then point a second `.env` at it (different `DB_NAME`, same host/credentials)
and re-run the sequence above with a mutated/broken file. Otherwise this is a
known, accepted gap, consistent with how V08-02's rotation risk was handled.

**Also note**: `014` (Workspace backfill) and `015`/`016` (GA expand/backfill)
all reference pre-existing legacy tables (`ga_connections`, `seo_sites`,
`si_sites`) that are not created by anything in this repo. They can only run
meaningfully against a database that already has those tables — they are not
testable on a truly empty schema the way `010`–`013` are.

## 2. V09-02 — Workspace backfill

After `migrate` runs `014` above:

```bash
# run backend/sql/postflight_workspace_backfill_invariants.sql by hand (via
# whatever SQL client you use for this host) and confirm every count is 0
# except the last query (multi-membership listing, informational only)
```

Spot checks worth doing:

- **Idempotency**: run `php bin/migrate.php migrate --executor=...` a second
  time — `014` should not re-appear as pending, and re-running the postflight
  counts should be unchanged.
- **GET stays read-only**: hit `GET /api/v1/workspaces` for a member with no
  Workspace and confirm no new row appears in `workspaces` /
  `workspace_members` / `workspace_settings` / `legacy_member_workspace_map`
  afterward (this is the behavior change from before V09-02 — it used to
  write on first GET).
- **Explicit provisioning path**: `POST /api/v1/workspaces` (new route, same
  signed-request auth as the GET) now performs what the old lazy-GET used to
  do, for a brand-new member with no Workspace yet. Calling it twice for the
  same member should return `409 WORKSPACE_ALREADY_PROVISIONED` on the second
  call, not a duplicate Workspace.
- **Known interim gap**: nothing currently calls the new `POST
  /api/v1/workspaces` automatically. Until the frontend/onboarding flow is
  wired to call it (V12-01's job, or an interim shim you decide on), a
  brand-new member who has never hit the old lazy-GET path before this change
  shipped will not get a Workspace automatically anymore. Decide how you want
  to bridge that gap before relying on this in production.

## 3. V09-03 — GA Workspace migration

After `migrate` runs `015` and `016`:

```bash
# confirm the ALTER in 015 actually completed cleanly on this host's MySQL
# version (check `status`, and separately confirm via
# SHOW COLUMNS FROM ga_connections LIKE 'workspace_id';)

# run backend/sql/postflight_ga_workspace_backfill_invariants.sql by hand and
# confirm connections_without_workspace / connections_with_missing_workspace /
# connections_mapped_to_inaccessible_workspace are all 0 (or the anomaly
# report at the bottom is reviewed and understood, not silently ignored)
```

Negative tests worth running against the live endpoints:

- Member A's signed request against Workspace B's
  `GET/PATCH /api/v1/workspaces/{B}/integrations/ga` → still denied upstream
  by `WorkspaceAccessPolicy`, unchanged by this migration.
- A connection that belongs to Workspace B no longer appears when querying
  as Workspace A, even if A and B share the same legacy owner pattern (this
  is the actual bug fix — `GaIntegrationRepository` no longer joins through
  `owner_member_id`).
- OAuth flow: start `account_fetch.php` as a `viewer`-role member → expect
  `403`. As `owner`/`admin`/`manager` → expect a redirect to Google with a
  signed `state`.
- Replay the exact same OAuth callback URL (same `code` and `state`) twice →
  second attempt should hit `400 OAuth state already used` (nonce claimed via
  `service_request_nonces`), independent of whatever Google does with a
  reused `code`.
- Wait past 10 minutes (or hand-craft an old timestamp) and try a callback →
  `400 Expired OAuth state`.
- Tamper one character of a valid `state` value → `400 Invalid OAuth state`.

**Deferred on purpose**: `backend/sql/017_ga_connections_workspace_contract_DEFERRED.sql`
(NOT NULL + FK, drops the old join-fake path) is not part of this runbook.
Do not run it until the postflight counts above are all 0 on the real data,
legacy compatibility is confirmed, and a backup restore has actually been
rehearsed — see the file's own header.

## 4. V09-04 — SEO / SI (AEO/GEO) / dashboard-AI / PageSpeed Workspace migration

Before pasting anything, run
`backend/sql/preflight_v09_04_seo_si_dashboard_inventory.sql` and compare its
real output against `migrations/018`'s header assumptions. Several tables in
scope (`seo_sites`, `seo_site_integrations`, `seo_summary_cache`,
`seo_scan_history`, `si_sites`, `si_analysis_runs` and its child tables) are
not created by any migration in this repo — same caveat as `ga_connections`
had for V09-03.

After `018` (expand) and `019` (backfill) apply:

```bash
# confirm the ALTERs in 018 actually completed cleanly on this host's MySQL
# version (check table structure in phpMyAdmin for each of the 9 root
# tables, or SHOW COLUMNS FROM <table> LIKE 'workspace_id';)

# run
# backend/sql/postflight_v09_04_seo_si_dashboard_workspace_backfill_invariants.sql
# by hand and confirm every without_workspace / mapped_to_missing_workspace /
# mapped_to_inaccessible_workspace count is 0 (or the anomaly report is
# reviewed and understood, not silently ignored), and that the child-table
# sanity join (section 5 of that file) is also 0.
```

**Deployment order matters here more than usual**: the PHP changes in this
batch (`legacy_auth.php`, `api_helpers.php`, `si/common.php`,
`si/save_common.php`, `si/generate_common.php`, `si/sites/list.php`,
`si/seo/list.php`, `si/seo/add.php`, `si/seo/summary.php`,
`si/seo/pagespeed.php`, `si/seo/pagespeed_history.php`,
`dashboard/ai_usage.php`, `dashboard/ai_plan.php`, `dashboard/ai_compose.php`)
assume `workspace_id` already exists and is backfilled on every row they
query. Upload them to production only after `019`'s postflight has been
reviewed — uploading them first would 500 (`Unknown column 'workspace_id'`)
on every SEO/SI/dashboard-AI/PageSpeed request.

Spot checks worth doing once both migrations and the PHP batch are live:

- Hit `si/sites/list.php`, `si/seo/list.php`, `dashboard/ai_usage.php` for an
  existing member and confirm the response shape is unchanged (legacy
  frontend compatibility) — these queries are now dual-conditioned on
  `user_id AND workspace_id`, not a behavior change for today's one-owner-
  per-workspace reality, but a regression here means the resolved
  `workspace_id` doesn't match what backfill wrote.
- Add a new SEO site via `si/seo/add.php` and confirm the new row has a
  non-NULL `workspace_id` immediately (dual-write, not waiting on a future
  backfill run).
- `si/seo/summary.php` force-refresh for an existing site: confirm
  `seo_scan_history` and `seo_summary_cache` both get new rows with
  `workspace_id` populated.

**Known, accepted limitation** (see `legacy_auth.php`'s
`hs_resolve_member_workspace_id()` for the full reasoning): these legacy
flat-file endpoints resolve `workspace_id` server-side from
`legacy_member_workspace_map` for the verified `member_id`, NOT from the
signed `x-hs-workspace-id` header. Confirmed by reading `lib/signedPhpFetch.ts`,
`lib/seo/seoApi.ts`, `lib/si/siApi.ts`, `lib/dashboardAiQuota.ts`, and the
`dashboard/ai-compose` route: only `app/api/seo/pagespeed/route.ts` resolves a
real Workspace context (`resolveWorkspaceContext`) before signing its
request today; every other caller signs with `{ memberId }` only, and
`signedPhpFetch`'s `workspaceId: identity.workspaceId ?? identity.memberId`
fallback then signs the member's own numeric id as if it were a
`workspaces.id` — a different id space entirely. Trusting that header at
face value would be exactly the "member_id === workspace_id" guess the task
packet forbids. This is correct for today's reality (one owner per
Workspace, confirmed unmapped_count=0), but is NOT yet real multi-member
Workspace authorization — when V09-06 wires real Workspace switching into
these legacy endpoints, this resolution needs to become an actual membership
check (`workspace_members`), not a wider version of this lookup.

**Deferred on purpose**: `backend/sql/020_seo_si_dashboard_workspace_contract_DEFERRED.sql`
(NOT NULL + FK for the same 9 tables) is not part of this runbook. Do not run
it until the postflight counts above are all 0 on the real data, legacy
compatibility is confirmed, and a backup restore has actually been
rehearsed — see the file's own header.

## 5. V09-08 — GA reporting workspace ownership (the 6 tables V09-03/04 never covered)

`ga_report_schedules`, `ga_daily_summary`, `ga_pages`, `ga_events`,
`ga_traffic_sources`, `ga_conversions` were never touched by the V09-03/04
`workspace_id` migrations — they stayed `member_id`(`user_id`)-only ownership
until this task. Before pasting anything, run
`backend/sql/preflight_v09_08_ga_reporting_inventory.sql` and compare its real
output against `migrations/021`'s header assumptions — same caveat
`ga_connections` had for V09-03: none of these 6 tables are created by any
migration in this repo.

Only `ga_report_schedules` gets a new column (it has a direct `user_id`); the
other 5 only carry `connection_id` and resolve ownership by joining back to
`ga_connections.workspace_id` (already reliable since V09-03/`016`) — same
child-table pattern V09-04 used for `seo_site_integrations` etc.

After `021` (expand) and `022` (backfill) apply:

```bash
# confirm the ALTER in 021 actually completed cleanly on this host's MySQL
# version (check `SHOW COLUMNS FROM ga_report_schedules LIKE 'workspace_id';`)

# run
# backend/sql/postflight_v09_08_ga_reporting_workspace_backfill_invariants.sql
# by hand and confirm every without_workspace / mapped_to_missing_workspace /
# mapped_to_inaccessible_workspace count is 0 (or the anomaly report is
# reviewed and understood, not silently ignored), that the child-table sanity
# join (section 5) is 0, and that the schedule/connection cross-workspace
# leakage check (section 6) returns zero rows -- a nonzero result there means
# a report schedule's connection_ids list references a GA connection
# belonging to a DIFFERENT workspace, i.e. the report would mail/export
# another tenant's analytics data.
```

**2026-07-21 rehearsal evidence (disposable local Docker `mysql:5.6`, NOT this
host's real data)**: a synthetic schema matching this file's inferred column
list was built and seeded with two real tenants, one orphan schedule
(no legacy mapping), and one deliberately cross-wired schedule referencing a
connection from a different workspace. Preflight, `021`, `022`, and the
postflight file all ran without error; results matched expectations exactly:
`schedules_without_workspace=1` (the orphan, correctly left NULL, not
guessed), `mapped_to_missing_workspace=0`, `mapped_to_inaccessible_workspace=0`,
the anomaly report correctly listed only the orphan schedule, the child-table
sanity join correctly flagged the one deliberately-dangling
`ga_daily_summary` row referencing a nonexistent `connection_id`, and the
cross-workspace leakage check correctly caught the cross-wired schedule.
Re-running `022` a second time was a no-op (idempotent); re-running `021` a
second time failed with `Duplicate column name 'workspace_id'` (expected
MySQL 5.6 behavior — DDL is not re-runnable, matching `015`/`018`'s history).
This proves the migration/postflight **SQL logic** is correct against a
realistic data shape — it is **not** a substitute for running the real
preflight against this host's actual schema, since (like `ga_connections` was
for V09-03) these 6 tables' real column list has never been read here.

**Deployment order matters here more than usual, same as V09-04**: the PHP
changes in this batch (`ga_report_list.php`, `ga_report_detail.php`,
`ga_report_save.php`, `ga_report_update.php`, `data_sync.php`,
`get_query.php`, `ga/ownership.php`, `ga/report/report_excel.php`,
`ga/report/report_mailer.php`) assume `ga_report_schedules.workspace_id`
already exists and is backfilled. Upload them only after `022`'s postflight
has been reviewed.

Negative tests worth running against the live endpoints once both migrations
and the PHP batch are live (needs a second real test account/Workspace, same
gap as V09-03/04/05's cross-workspace tests):

- Member A's signed request to `ga_report_list.php`/`ga_report_detail.php` for
  a schedule `id` that belongs to Workspace B → must not appear / must be
  denied, not silently return another tenant's report config.
- Member A calling `ga_report_save.php`/`ga_report_update.php` with a
  `connection_ids` value that includes a GA connection belonging to Workspace
  B → must be rejected by `ga_require_connection_ownership()` (`403 Connection
  access denied`), not silently accepted.
- `data_sync.php`/`get_query.php` for a `viewer`-role member (once a non-owner
  test membership exists) → `data_sync.php` should be denied
  (`integrations.manage`), `get_query.php` should still work (`read`).
- Existing real report schedules: confirm `ga_report_list.php`'s response
  shape is unchanged (legacy frontend compatibility) after the migration, and
  that a real "產生報表/寄送" smoke test (via `report_excel.php`/
  `report_mailer.php`'s direct-HTTP branch, or `report_runner.php` if a
  `config.php`/`REPORT_CRON_SECRET` is ever configured) still succeeds for an
  existing schedule.

**Deferred on purpose**: `backend/sql/023_ga_reporting_workspace_contract_DEFERRED.sql`
(NOT NULL + FK for `ga_report_schedules`) is not part of this runbook. Do not
run it until the postflight counts above are all 0 on the real data, legacy
compatibility is confirmed, and a backup restore has actually been
rehearsed — see the file's own header.

## 6. V10-01 — Signal persistence (brand-new table, no expand/backfill needed)

Unlike every section above, `signals` (`backend/sql/migrations/024_signal_persistence.sql`)
is a **brand-new table with no existing data** — it gets a normal `NOT NULL`
FK to `workspaces(id)` from creation, no expand/backfill/deferred-contract
phases. Run `backend/sql/preflight_v10_01_signal_inventory.sql` first (mainly
to confirm `signals` doesn't already exist under a conflicting definition),
then paste `migrations/024` into phpMyAdmin, then run
`backend/sql/postflight_v10_01_signal_invariants.sql` to confirm the table,
its FK, and its two unique keys (`public_id`, and `(workspace_id, dedup_key)`)
were created as designed.

**Design decisions made in this task** (see the task packet's execution log
for full reasoning):

* No separate `priority` column — Signal list ordering uses `severity` only.
  `priority` is deferred to `V10-04` (Recommendation), which needs Signal +
  Evidence + Business Impact together to compute a real priority.
* No independent `signal_status_history` table — status transitions are
  recorded in the existing `audit_logs` table (`entity_type='Signal'`,
  `entity_id=<signals.public_id>`), same pattern `WorkflowService` already
  uses for Recommendation/Decision/Task (`entity_type='RecommendationWorkflow'`).
* **Dedup rule**: `dedup_key` is a full (not truncated) sha256 of
  `seo_issue:{site_id}:{TYPE}:{normalized_url}` — stable across repeated scans
  of the same underlying problem. `INSERT ... ON DUPLICATE KEY UPDATE` on
  `(workspace_id, dedup_key)` bumps `occurrence_count`/`last_seen_at` instead
  of creating a second row.
* **Status transition rules** (all enforced in
  `backend/api/src/Signal/SignalRepository.php`/`SignalService.php`, not left
  ambiguous):
  * A Signal the detector previously auto-resolved (issue disappeared) is
    reopened to `new` if the same `dedup_key` is detected again — recurrence
    of a system-inferred "fixed" state should surface again for review.
  * A Signal a human explicitly `dismissed` is **not** auto-reopened by
    recurrence — only a human un-dismisses it (`PATCH .../signals/{id}` with
    `status=acknowledged`). Recurrence still bumps `occurrence_count`/
    `last_seen_at` silently.
  * `PATCH .../signals/{id}` only accepts `status` in
    `{acknowledged, dismissed}` — `new` and `resolved` are system-controlled
    and rejected with a validation error if a human tries to set them
    directly.
  * Signal detection/resolution never creates a Recommendation or Decision —
    Signal only answers "what happened" (spec section 6).

**2026-07-21 rehearsal evidence (disposable local Docker `mysql:5.6`, plus a
local PHP 7→8.3 CLI harness with `mysqli` — NOT this host's real data)**:
`migrations/024` applied cleanly; postflight confirmed the FK
(`fk_signals_workspace` → `workspaces.id`) and both unique keys exist. Two PHP
scripts then exercised `SignalRepository`/`SignalService`/
`SeoTechnicalIssueDetector` directly (bypassing the HTTP/signing layer, which
V08-03/V09-05 already proved separately):

* Scan 1 (2 issues, no previous scan): 2 Signals created, `occurrence_count=1`
  each, `status=new`.
* Scan 2 (same 2 issues, unchanged): 0 created, both bumped to
  `occurrence_count=2` — confirmed only 2 rows exist total (dedup working,
  not a 3rd/4th row).
* Scan 3 (one issue fixed): the fixed issue's Signal flipped to `resolved`
  (`occurrence_count` unchanged at the resolve step, as designed — resolving
  isn't a recurrence), the remaining issue bumped to `occurrence_count=3`.
* Scan 4 (the "fixed" issue reappears): that Signal correctly reopened
  (`status` back to `new`, `type` back to `seo.technical_issue.new`,
  `occurrence_count` bumped), the other issue bumped to `occurrence_count=4`.
* `audit_logs` contained exactly the expected transitions and nothing else:
  2× `Signal Detected` (scan 1), 1× `Signal Auto-Resolved` (scan 3), 1×
  `Signal Reopened` (scan 4) — plain `occurrence_count` bumps with no status
  change correctly did **not** write an audit row.
* Second script: `listForWorkspace()` filtering by `status`, cross-workspace
  isolation (workspace 2 correctly saw 0 Signals throughout), a `viewer`-role
  membership correctly denied `PATCH` (`workflow.mutate` required), a
  `member`-role membership correctly allowed `acknowledge`/`dismiss`, direct
  attempts to `PATCH` `status=new` or `status=resolved` were correctly
  rejected, and — the key negative case — dismissing a Signal and then
  re-running detection with that same issue present again left it
  `dismissed` (not reopened), confirming the resolved-vs-dismissed reopen
  policy above is actually enforced, not just documented.

**Deployment order matters here too**: `backend/api/si/seo/summary.php` now
calls `SignalService::runSeoTechnicalIssueDetection()` after every scan is
persisted. This is wrapped in try/catch and logs rather than fails the scan
response — but until `migrations/024` is applied, every real scan will hit
that catch block and silently skip Signal detection (no user-visible break,
but also no Signals will ever be created). Apply the migration before relying
on this in production.

**Not yet executed (needs the real host)**: applying `migrations/024` to the
actual pre-launch database, uploading the PHP batch, and triggering a real
SEO re-scan on a site with ≥2 scan history rows to confirm a real
new/resolved/dedup cycle end-to-end through the actual HTTP path (not just
the direct-PHP rehearsal above). Same category of remaining gap as V09-08 —
requires phpMyAdmin/FTP access only the owner has.

## 7. V10-02 — Evidence persistence & traceability (also brand-new tables)

`evidence_items` and `signal_evidence_links` (`backend/sql/migrations/025_evidence_persistence.sql`)
are, like `signals`, brand-new tables with real `NOT NULL` FKs from creation
— run `backend/sql/preflight_v10_02_evidence_inventory.sql` first (confirms
`migrations/024` is already applied, since this migration's FK needs
`signals.id`), then paste `migrations/025`, then run
`backend/sql/postflight_v10_02_evidence_invariants.sql`.

**Snapshot, not live reference**: `evidence_items.payload_json` is a
self-contained copy of the observed fact (site id, issue type/severity/url/
message), not a foreign key into `seo_scan_history`. If that source row is
later deleted or pruned (V11-08 retention), the Evidence row still shows
exactly what was true and `content_hash` still verifies it wasn't tampered
with — this was a deliberate choice per the task packet's option, over
storing only an external reference.

**Dedup design**: `content_hash` is a sha256 over only the fields that define
the fact itself (excludes scan-run metadata like `scanned_at`/
`scan_history_id`, which differ on every re-scan even when the issue is
unchanged). `dedup_key = sha256(signal_dedup_key . content_hash)`, where
`signal_dedup_key` is the exact same value already computed for the matching
row in `signals.dedup_key` (migrations/024) — this is how
`EvidenceService::recordSeoTechnicalIssueEvidence()` finds which Signal a
piece of Evidence belongs to, without a second lookup table. Consequence:
re-detecting byte-identical content upserts the same `evidence_items` row
(only `source_ref_id`/`last_observed_at` refresh); a genuine content change
(e.g. severity changes) produces a *different* `content_hash`, hence a
*different* `dedup_key`, hence a brand-new row — the old snapshot is
preserved untouched, never overwritten. `signal_evidence_links` has a
`UNIQUE(signal_id, evidence_id)` key and is written with `INSERT IGNORE`, so
re-linking an already-linked pair is a silent no-op, not a duplicate row.

**2026-07-21 rehearsal evidence (disposable local Docker `mysql:5.6` + local
PHP CLI + `mysqli` — NOT this host's real data)**: extended the same
disposable environment used for V10-01, added a minimal `seo_scan_history`
stand-in table, and ran `SignalService` + `EvidenceService` together (the
real integration point in `si/seo/summary.php`) across 3 simulated scans:

* Scan 1 (2 issues, first ever scan): 2 Evidence rows created, both linked to
  their matching Signal (`linked=2`).
* Scan 2 (identical content): `recorded=0`, `refreshed=2`, `linked=0` —
  confirmed still only 2 Evidence rows and 2 links total (dedup working, not
  a 3rd/4th row or a duplicate link).
* Scan 3 (one issue's severity changes HIGH→MEDIUM, same site/type/url
  identity): `recorded=1` (a new Evidence row for the changed content),
  `refreshed=1` (the unchanged issue), `linked=1` (the new row linked to the
  *same* Signal — the Signal itself doesn't fork, only Evidence does).
  Confirmed 3 total Evidence rows, with the original HIGH-severity snapshot
  (id=1) present and completely unchanged (title/summary/content_hash
  identical to scan 1).
* Integrity check: recomputed `content_hash` from the oldest Evidence row's
  own stored `payload_json` and confirmed it still matches the stored hash
  exactly.
* Source deletion survivability: deleted every row from the `seo_scan_history`
  stand-in table (simulating retention/pruning) and confirmed all 3 Evidence
  rows remained fully intact with unchanged `content_hash` — proving the
  snapshot design actually survives source deletion, not just in theory.
* Cross-workspace isolation: workspace 2 had 0 Evidence rows throughout.
* Traceability: every `source='seo'` Signal had at least one linked Evidence
  row (0 unlinked) — satisfies the spec's "No Signal should exist without
  traceable supporting Evidence."

**Deployment order**: same rule as V10-01 — `si/seo/summary.php`'s new
Evidence-recording call is wrapped in try/catch and only runs when the
`seo_scan_history` INSERT actually succeeded (`$scanHistoryId > 0`); until
`migrations/024` and `025` are both applied, it will hit the catch block and
log rather than break the scan response, but no Evidence will be recorded.

**Not yet executed (needs the real host)**: applying `migrations/025`,
uploading `backend/api/src/Evidence/**`, and a real SEO re-scan end-to-end
through the actual HTTP path, plus a cross-workspace HTTP negative test on
`GET .../signals/{id}/evidence` (needs a second real test account, same gap
as every prior task).

## 8. V10-03 — Explanation & Business Impact (rule-based, not an external AI call)

`signal_analyses` (`backend/sql/migrations/026_signal_analysis_persistence.sql`)
stores Explanation and Business Impact together in one row (spec allows this
as one Evidence Domain analysis record, as long as the API keeps the fields
separable — see `ExplanationService::normalize()`'s `explanation`/
`business_impact` sub-objects).

**Rule-based, not an external AI call**: `RuleBasedAnalysisGenerator`
produces explanation text and impact fields deterministically from the
Signal + its linked Evidence, with no external API call. This is a
deliberate choice, not a placeholder — generating on every SEO scan via a
real OpenAI-style call would add cost/timeout risk on every single request;
`dashboard_ai_compose.php` already shows this project's established
AI-with-rule-fallback pattern, and a future task can follow that same shape
here if a real AI path is wanted. `generator_type='rule'`/`generator_version`
are always recorded so this is never silently confused with an AI opinion.

**Idempotency**: `analysis_key = sha256(signal.dedup_key . sorted_evidence_ids . generator_version)`.
Re-generating with the same Signal + same Evidence set + same generator
version always upserts the same row (`attempt_count` increments) — retries
never create unbounded duplicate versions. A newly linked Evidence row (or a
generator version bump) produces a genuinely new analysis row.

**Fail-closed**: a Signal with zero linked Evidence gets `status =
'insufficient_evidence'` and every content field left `NULL`/`unknown` —
never a fabricated explanation or impact standing in for missing data. A
generator exception is caught and persisted as `status = 'failed'`, same
principle.

**2026-07-21 rehearsal evidence (disposable local Docker `mysql:5.6` + local
PHP CLI — NOT this host's real data)**: exercised `SignalService` +
`EvidenceService` + `ExplanationService` together end to end:

* A Signal with no Evidence yet → `insufficient_evidence`, all content
  fields null, as designed.
* After Evidence was recorded → `status=ok`, real explanation text citing
  the linked Evidence id, `impact_magnitude='material'` for a HIGH-severity
  issue.
* Re-running with the identical Evidence set → the SAME analysis row
  (`attempt_count` 1→2), not a 3rd row — idempotency confirmed.
* A second, independent issue on the same site produced its own Signal +
  its own analysis row citing its own Evidence, with `impact_magnitude`
  correctly mapped from its own (MEDIUM) severity — confirms per-Signal
  isolation, not a single shared analysis.
* Total row count stayed at 3 for the whole rehearsal (1 insufficient +
  1 ok + 1 ok for the second issue) despite multiple detection/evidence/
  analysis calls — no duplicate versions anywhere.
* Cross-workspace isolation: workspace 2 had 0 analysis rows throughout.
* Postflight's fail-closed-content check (no fabricated fields on
  `insufficient_evidence`/`failed` rows) returned zero violating rows.

**Not yet executed (needs the real host)**: applying `migrations/026`,
uploading `backend/api/src/Explanation/**`, a real SEO re-scan end-to-end
HTTP verification, and observing the `failed` status path against a genuine
runtime error on the real host (the rehearsal above only triggers it via a
thrown exception in a controlled test, not a real failure mode).

## 9. V10-04 — Recommendation Formalization (expands the already-live `recommendations` table)

Unlike sections 6-8, `migrations/027_recommendation_formalization_expand.sql`
ALTERs the already-live `recommendations` table (migrations/011) instead of
creating a new one — real rows may already exist from live Dashboard/SEO
usage. Run `backend/sql/preflight_v10_04_recommendation_inventory.sql` first
(confirms the current shape and existing row count), then paste
`migrations/027`, then run
`backend/sql/postflight_v10_04_recommendation_invariants.sql`.

**What changed**: `WorkflowService` (called from
`GET/PATCH .../dashboard/workflow`, used by both the Dashboard and
`seo/page.tsx`'s "建立 Dashboard 任務" flow) now resolves a real Signal
whenever the caller supplies `signal_context: {site_id, issue_type, url}` —
real observed facts `seo/page.tsx` already has, not a business claim. If a
Signal matching that identity exists in the **caller's own workspace**
(`SignalRepository::findByDedupKey()`, scoped by the caller's signed
`workspaceId`, never a client-supplied one), the Recommendation's
title/priority/confidence/expected_impact/suggested_action/reason are all
built from that Signal + its Evidence + its latest Explanation/Impact
analysis — the frontend's own title/description fields are discarded
entirely for this path (`generator_type='backend_rule'`). If no
`signal_context` is supplied, or it doesn't resolve, the **original legacy
behavior runs completely unchanged** (`generator_type='frontend_legacy'`,
the default for every pre-existing row) — this is how the onboarding-style
context_keys (`dashboard:connect_ga`, `dashboard:create_seo_site`, etc.,
which have no Signal behind them at all) keep working exactly as before.

**Revision / idempotency**: a repeat call with byte-identical resolved
content (same Signal, same derived title/priority/expected_impact/
suggested_action/reason) is a no-op on `revision` — only a real change
(different Signal state, e.g. after Evidence/Explanation refreshed) bumps
it. This is compared in PHP (`WorkflowRepository::saveFormalizedRecommendation()`),
not left to a database trigger.

**Cross-workspace forgery**: a caller who fabricates another workspace's
`site_id` in `signal_context` cannot resolve that workspace's Signal — the
lookup is scoped to the caller's own `workspace_id`, so it simply falls back
to the legacy path (their own frontend-supplied content is used, exactly as
if `signal_context` had never been sent) rather than either erroring or
leaking the other workspace's Signal/Evidence content.

**Archive/supersede rule**: checked in `WorkflowService::get()`, not at save
time — a signal-backed Recommendation whose Signal has since transitioned to
`resolved`/`dismissed` is flipped to `status='archived'` the next time it's
read. This has to happen in `get()` specifically because `mutate()`'s own
action handlers (`create_task`, `save_decision`) call
`WorkflowRepository::recordDecision()`, which unconditionally overwrites
`status` to `'accepted'`/`'skipped'` as part of the SAME request — a status
set earlier in the same `mutate()` call would just get clobbered a few lines
later. Checking on read, after every mutate()-internal side effect has
already run, is what makes archiving actually stick. **This exact bug was
caught by the rehearsal below**, not by reasoning about the code — the first
version of this feature set `status='archived'` inside
`saveFormalizedRecommendation()` itself, and the rehearsal's test 5 caught it
silently getting overwritten back to `'accepted'` a moment later.

**2026-07-21 rehearsal evidence (disposable local Docker `mysql:5.6` + local
PHP CLI — NOT this host's real data)**: exercised `WorkflowService::mutate()`
end to end (the real integration point, not just the repository in
isolation) across 5 scenarios:

1. Signal-backed `create_task` with fabricated frontend title/description
   ("FRONTEND FAKE TITLE") → confirmed the saved Recommendation's title came
   from the real Signal ("缺少 Title"), `generator_type='backend_rule'`,
   correct `signal_id`, `priority='high'` (mapped from the Signal's `high`
   severity) — the fabricated frontend text never appeared anywhere in the
   stored row.
2. Identical re-run → same `revision` (1→1, not bumped) — idempotency
   confirmed.
3. A legacy context_key (`dashboard:connect_ga`) with no `signal_context` →
   `generator_type='frontend_legacy'`, frontend title used as-is,
   `signal_id=NULL` — legacy path completely unaffected.
4. Workspace 2's identity calling with workspace 1's real `site_id` in
   `signal_context` → fell back to legacy (workspace 2's own frontend
   content used), confirming no cross-workspace Signal data leaked.
5. After the backing Signal transitioned to `resolved` (the SEO issue no
   longer detected on a re-scan) and Evidence/Explanation were refreshed
   accordingly, re-reading the Recommendation → `status='archived'`,
   confirming the archive/supersede rule actually fires (after the bug
   above was found and fixed).

Postflight confirmed 0 rows missing `generator_type`/`revision` and 0
cross-workspace signal/recommendation workspace mismatches on the resulting
data (1 `backend_rule` row, 2 `frontend_legacy` rows, matching the 3 distinct
context_keys exercised above).

**Not yet executed (needs the real host)**: applying `migrations/027`,
uploading `backend/api/src/Dashboard/WorkflowRepository.php`/
`WorkflowService.php`/`public/index.php` and the `seo/page.tsx` frontend
change, and a real end-to-end HTTP verification (create a real SEO task from
a real detected issue and confirm the Recommendation shown in the Dashboard
reflects backend-derived content, not what was typed/rendered on the
frontend).

## 10. V10-05 — Human Review & Decision Formalization (expands the already-live `decisions` table)

`migrations/028_decision_formalization_expand.sql` ALTERs the already-live
`decisions` table (migrations/011) — real rows may already exist from live
Dashboard usage. Run `backend/sql/preflight_v10_05_decision_inventory.sql`
first (confirms the current shape, existing row count, and that no existing
`decision` value falls outside the current 2-value ENUM), then paste
`migrations/028`, then run
`backend/sql/postflight_v10_05_decision_invariants.sql`.

**What changed**: `decision` widens from `ENUM('accepted','skipped')` to the
spec's full 6-value outcome set (`accepted`/`skipped`/`rejected`/`deferred`/
`modified`/`needs_more_evidence`) — the two original values keep meaning
exactly what they always did. Three columns are added:
`recommendation_revision` (which `recommendations.revision`, migrations/027,
this Decision was actually made against), `expected_outcome` (distinct from
`note`, the decision's reason), and an opt-in `idempotency_key` with a
`UNIQUE(workspace_id, idempotency_key)` key (MySQL treats every `NULL` as
distinct, so a caller that doesn't supply one is unaffected).

**Append-only, unchanged**: `decisions` was already append-only before this
task — `WorkflowRepository::recordDecision()` has always `INSERT`ed a new
row rather than `UPDATE`ing, and `latestDecision()` reads the most recent by
`ORDER BY id DESC`. This migration only widens what a single row can express;
it does not touch that discipline.

**`recommendations.status` mapping**: that column is a different, smaller
ENUM (`pending`/`accepted`/`skipped`/`archived`, migrations/011) than the new
6-value `decisions.decision` — it was always a simplified lifecycle flag, not
a mirror of the decision outcome. `recordDecision()` maps explicitly:
`accepted`/`modified` → `accepted` (still moving forward), `skipped`/
`rejected` → `skipped` (declined), `deferred`/`needs_more_evidence` →
`pending` (still open).

**Idempotency**: an opt-in `idempotency_key` short-circuits
`recordDecision()` — if a caller supplies one and it already matches a prior
Decision in the same workspace, the existing row is returned unchanged and
no second row (or second `recommendations.status` write) happens. A caller
that omits it gets no such guard (matching pre-existing behavior exactly).

**Transaction boundary**: `WorkflowService::mutate()` wraps the entire
action (Recommendation save + `recordDecision()`'s two writes + the
action-specific work + the audit log insert) in one `begin_transaction()`/
`commit()`/`rollback()` — a validation failure partway through (e.g. an
invalid `decision` value) rolls back everything, including the Recommendation
row that had already been saved earlier in the same call. There is no path
that leaves a Recommendation update committed with no matching Decision, or
vice versa.

**2026-07-21 rehearsal evidence (disposable local Docker `mysql:5.6` + local
PHP 7.4 CLI harness with `mysqli` — NOT this host's real data)**: built the
minimal schema chain migrations `010`/`011`/`012`/`024`/`025`/`026`/`027`
(the tables `decisions`/`recommendations` actually depend on; the
legacy-table-dependent Workspace-backfill migrations `014`-`022` aren't
needed for this Decision-only rehearsal), ran preflight, applied `028`, ran
postflight — all clean. Exercised `WorkflowService::mutate()`/`get()` and
`WorkflowRepository::recordDecision()` directly (45 assertions, all passed):

* All 6 outcome values (`accepted`, `modified`, `skipped`, `rejected`,
  `deferred`, `needs_more_evidence`) each recorded a Decision with the right
  `decision`/`note`/`expected_outcome`/`recommendation_revision`, and each
  correctly mapped to its expected `recommendations.status`.
* An invalid decision value (`bogus_outcome`) threw `ValidationException`,
  and confirmed the whole-`mutate()` transaction rollback left **zero**
  half-created Recommendation rows for that `context_key` — not a
  Recommendation with no matching Decision.
* Idempotency: submitting the same `idempotency_key` twice, the second time
  with a deliberately different decision (`rejected` instead of `accepted`)
  and reason, produced only 1 Decision row total; the second call returned
  the ORIGINAL decision unchanged, and `recommendations.status` matched the
  first decision, not the ignored retry.
* `create_task`'s implicit accept still records correctly and now stamps
  `recommendation_revision`.
* Append-only history: recording a second Decision on the same Recommendation
  created a genuinely new row (2 total, not an UPDATE), and `latestDecision()`
  correctly returned the newest one while the older row remained untouched.
* Cross-workspace isolation: Workspace 2's identity saw no Recommendation for
  Workspace 1's `context_key`, and had zero Decision rows throughout.
* Role-based fail-closed: `WorkspacePermissions::requirePermission()` denied
  `viewer` role for `workflow.mutate` (`AuthorizationException`) and allowed
  `member` role, confirming the existing permission matrix (unchanged by this
  task) still gates the mutate path this Decision logic sits behind.
* Transaction atomicity of `recordDecision()` itself: began a transaction,
  called it directly, confirmed the `recommendations.status` change was
  visible mid-transaction, then rolled back and confirmed BOTH of its writes
  (the Decision insert and the status update) were undone together — proving
  the repository method has no hidden autocommit or second connection that
  would defeat the caller's transaction.
* Re-running `028` a second time failed with `Duplicate column name
  'recommendation_revision'` (expected MySQL 5.6 behavior — DDL is not
  re-runnable, matching every prior migration's history).

**Not yet executed (needs the real host)**: applying `migrations/028`,
uploading `backend/api/src/Dashboard/WorkflowRepository.php`/
`WorkflowService.php`/`public/index.php`, and a real end-to-end HTTP
verification of all 6 outcomes plus a genuine cross-workspace negative test
(needs a second real test account/Workspace, same gap as every prior task).

## 11. V10-06 — Decision-first Dashboard (no new migration; `WorkflowService.php` + frontend only)

This task wires the Decision-first Dashboard (spec section 11: Signal →
Evidence → Explanation → Business Impact → Recommendation → Human Review →
Decision, one screen, one flow) against the real V10-01~05 APIs — no new
table, no new migration. Two small additions to
`backend/api/src/Dashboard/WorkflowService.php` were needed to make that
possible without re-implementing any detector/recommendation/permission rule
in the frontend:

* **`resolveSignalContext()` gained a `signal_context.signal_id` direct
  path**, alongside the original SEO-specific `{site_id, issue_type, url}` →
  `dedup_key` path (migrations/027). The Dashboard already has the real
  Signal row in hand (from `GET .../signals`) for ANY source domain — it
  doesn't know or need to know a detector's dedup-key formula just to
  formalize a Recommendation from a Signal it's already displaying. Still
  scoped to the caller's own workspace via the existing
  `SignalRepository::findForWorkspace()` — no new cross-workspace lookup.
* **A new `refresh_recommendation` mutate() action.** The Recommendation
  save/formalization step (`saveFormalizedRecommendation()`/
  `saveRecommendation()`) already runs unconditionally at the top of
  `mutate()` for every action — this new action adds no logic of its own, it
  only lets the Dashboard trigger that existing formalization pass WITHOUT
  implicitly recording a Decision or creating a Task, unlike `save_decision`/
  `create_task` which always did one of those as a side effect. This is what
  lets a human review the real, backend-computed
  title/priority/confidence/expected_impact/suggested_action/reason BEFORE
  deciding, instead of deciding blind or the frontend guessing at that
  content itself.

**Frontend**: `components/dashboard/TodaySignals.tsx` (new) — lists open
Signals for the current Workspace, and per-Signal shows Evidence (citation
count/ids), Explanation, Business Impact, the formalized Recommendation, and
a Human Review panel offering all 6 V10-05 outcomes with a reason/expected-
outcome form and a per-Signal idempotency key (regenerated after each
successful submit) to guard double-submit. Wired into
`components/dashboard/DashboardWorkspace.tsx` as a new top-level section.
Workspace switching: an `AbortController` created per Workspace change
cancels any in-flight Signal-list request, and all per-Signal
analysis/workflow/review state is cleared in the same effect — a late
response from a just-abandoned Workspace cannot render into the new one.
GA/SEO/AEO/GEO's own pages are untouched and remain the Evidence/raw-data
drill-down, per the task packet's explicit constraint.

**Scope cut, documented rather than silently dropped**: the review panel
shows only the LATEST Decision (`workflow.decision`, from
`WorkflowRepository::latestDecision()`), not the full append-only Decision
history for a Recommendation — V10-05 didn't add a "list all decisions for
this recommendation" endpoint, and adding one was judged out of this task's
scope (not required by V10-06's mandatory verification list, which only
requires refresh/resubmit-safety and single-flow review, not a history
viewer). The history rows themselves are fully persisted and correct
(proven in V10-05's rehearsal); only a UI to browse them doesn't exist yet.

**2026-07-21 rehearsal evidence (disposable local Docker `mysql:5.6` + local
PHP 7.4 CLI harness with `mysqli` — NOT this host's real data)**: built the
same minimal schema chain as V10-05 (`010`/`011`/`012`/`024`-`028`), seeded 2
workspaces each with one Signal, and exercised `WorkflowService::mutate()`
directly (12 assertions, all passed):

* `signal_context.signal_id` resolved the real Signal and formalized the
  Recommendation from it — title/priority came from the Signal
  (`generator_type='backend_rule'`), NOT the deliberately fake
  frontend-supplied title/description passed alongside it.
* `refresh_recommendation` created the formalized Recommendation but
  correctly left both `decision` and `task` `null` — no implicit side effect.
* A repeat `refresh_recommendation` call was a no-op on `revision`
  (idempotent, same as V10-04's formalization idempotency).
* Workspace 2's identity supplying Workspace 1's real `signal_id` correctly
  fell back to the legacy path (Workspace 2's own frontend content used,
  `generator_type` stayed `frontend_legacy`) — no cross-workspace Signal
  content leaked, same non-leaking-fallback principle V10-04 established for
  the `{site_id, issue_type, url}` path.
* Workspace 2 resolving its OWN `signal_id` (a different tenant, independent
  happy path, not just the forgery-rejection case) worked correctly with its
  own Signal's title/severity-mapped priority.
* `save_decision` immediately after a `refresh_recommendation` on the same
  `context_key` correctly recorded a real Decision while keeping the
  Signal-derived title — confirms the two actions compose correctly in
  sequence, `refresh_recommendation` doesn't leave the Recommendation row in
  a state `save_decision` can't build on.

**Static verification**: `php -l` passed on the modified
`WorkflowService.php`; `npm run typecheck`, `npm run lint`, and `npm run
build` all passed with the new `TodaySignals.tsx` component and its
`DashboardWorkspace.tsx` integration.

**Not yet executed (needs the real host / real login)**: a real interactive
click-through of the Decision-first flow in a browser. This project's
frontend dev server proxies to the real PHP backend over the network rather
than running PHP locally, so a genuine login requires live backend
credentials (`PHP_SERVICE_AUTH_SECRET` etc.) this environment does not have
and should not be given — attempting a real end-to-end session would mean
either exercising the real pre-launch host or fabricating credentials
neither of which is appropriate here. The static checks above (typecheck/
lint/build) plus the disposable-Docker behavioral rehearsal are the
practical substitute, same category of gap as every prior V10 task's "needs
the real host" note — Workspace A/B rapid-switch and refresh/resubmit-safety
behavior described above are implemented per the mandatory verification
list, but not yet clicked through live.

## 12. V10-07 — GA/SEO/AEO/GEO Adapter Alignment (no new migration)

No new table, no ALTER — this task converges the existing Signal detection
boundary so a second source (GA) can feed the same `signals`/`evidence_items`
tables SEO already writes to, and documents why AEO/GEO cannot yet do the
same honestly rather than faking it.

**Convergence (`backend/api/src/Signal/SignalService.php`)**: the
upsert/reopen/bump/resolve/audit loop that used to live only inside
`runSeoTechnicalIssueDetection()` is extracted into a private
`applyDetectionPlan(workspaceId, plan)`, which both
`runSeoTechnicalIssueDetection()` and the new
`runGaTrafficAnomalyDetection()` call through. Any future source only needs
to produce a `{to_upsert, to_resolve}` plan in this same shape — the actual
dedup/upsert/reopen/resolve/audit mechanics are never re-implemented per
source. `SignalRepository::findByDedupKey()` gained a `source` column in its
SELECT (additive, harmless) so the generalized audit-log call can report the
correct source instead of a hardcoded `'seo'`.

**GA vertical slice**: `backend/api/src/Signal/Detector/GaTrafficAnomalyDetector.php`
(new) — stateless, same discipline as `SeoTechnicalIssueDetector`: no
database access, caller supplies the day's observed sessions and a trailing
baseline it already computed. Emits at most one plan item per GA connection
(traffic-drop only — a real, narrower first GA rule, not a placeholder; more
GA anomaly types are later, additive tasks, the same way SEO started with
only technical issues in V10-01). Dedup key is stable per connection
(`ga_traffic_drop:{connectionId}`), so an ongoing anomaly bumps
`occurrence_count` instead of creating duplicate rows, and recovery
auto-resolves it (same reopen/resolve semantics V10-01 established).
Severity: ≥50% trailing-average drop → `high`, ≥25% → `medium`, below that →
resolved/not-anomalous. Guards against noise: fewer than 3 baseline days, or
a trailing average below 10 sessions, is a deliberate no-op (neither upsert
nor resolve) rather than a guess — same fail-closed spirit as V10-03's
`insufficient_evidence` state.

`backend/api/src/Evidence/EvidenceService.php` gained
`recordGaTrafficAnomalyEvidence()`, the GA counterpart to
`recordSeoTechnicalIssueEvidence()` — re-runs the same stateless detector
diff (cheap, no DB access, same decoupling rationale as the SEO method),
records an Evidence snapshot, and links it to the Signal. Unlike SEO's
`stableFact()` (which excludes scan-run metadata), the session numbers
themselves ARE the fact for GA — each day's traffic reading is a genuinely
new observation, so content-hash dedup only collapses byte-identical repeat
observations, not different days with different real numbers.

**Call site (`backend/api/ga/data_sync.php`)**: right after each day's
`ga_daily_summary` row is written, a new block computes a trailing 7-day
session average for that connection (`SELECT AVG(sessions), COUNT(*) FROM
(SELECT sessions ... ORDER BY date DESC LIMIT 7) recent_days`, excluding the
day just written) and calls both new methods, wrapped in try/catch exactly
like `si/seo/summary.php`'s existing Signal/Evidence call site — a detection
failure is logged and never breaks the sync console's own output. Uses the
already-resolved `$workspace_id` (via `hs_resolve_member_workspace_id()`,
established in V09-08), never a raw `member_id` boundary. No change to
`ga_daily_summary`'s own INSERT/response shape — fully backward compatible
with the existing sync console.

**Dashboard trace closes for free**: because `components/dashboard/
TodaySignals.tsx` (V10-06) already renders whatever Signals exist for the
workspace regardless of source, a GA-detected traffic anomaly shows up in
the exact same Decision-first flow as an SEO issue with zero frontend
change — this is the actual payoff of the shared Signal/Evidence/
Recommendation contract this task was asked to converge toward.

**AEO/GEO: deliberate, documented deferred gap, not a silent skip.** Read
`backend/api/si/generate_common.php` (`si_build_aeo_payload()`/
`si_build_geo_payload()`) in full before assuming otherwise: AEO/GEO output
is entirely derived, per-request copywriting/content-suggestion drafts
(FAQ questions, short-answer snippets, citation-page suggestions) computed
fresh from the SEO keyword/issue data already available — there is no
persisted AEO/GEO scan-history table, no stored prior-run snapshot to diff
against, and no stable "problem identity" comparable to a SEO issue
(site+type+url) or a GA connection's session count. Building a Signal
detector here would mean inventing a threshold for "how much did the
AI-visibility score change" with no historical data to validate it against
— exactly the unsupported-formula risk `SeoTechnicalIssueDetector`'s own
design notes warned against, and worse here since there is not even a
snapshot table to diff. **Deferred, not attempted**: a real AEO/GEO detector
needs a persisted scan-history-equivalent table (score + item list per
run, keyed by site+tab) before any diff/dedup logic can be written
honestly. That table does not exist today and creating one is out of this
task's scope (`不引入第二套 Signal/Evidence schema` — a scan-history table
is schema, not an Adapter). **Owner/next task**: track as a new task packet
(e.g. `V10-07b` or folded into a later V1.1 task) whose first step is
designing that persistence layer; until then, AEO/GEO pages remain
exactly what the task packet allows them to stay — Evidence/raw-data
drill-down with no Signal-backed Decision flow.

**2026-07-21 rehearsal evidence (disposable local Docker `mysql:5.6` + local
PHP 7.4 CLI harness with `mysqli` — NOT this host's real data)**: built a
minimal schema (`workspaces` + `signals`/`evidence_items`/
`signal_evidence_links` from migrations `010`/`024`/`025`, plus a synthetic
`ga_daily_summary` stand-in matching `data_sync.php`'s inferred columns,
same caveat as every `ga_*`/`seo_*` legacy-table rehearsal before this one),
seeded a 5-day session history for one GA connection, and ran 22 assertions
directly against `GaTrafficAnomalyDetector`/`SignalService`/`EvidenceService`
(all passed):

* Detector unit behavior: insufficient baseline days (<3) and too-small
  baseline (<10 sessions) both correctly no-op; a small (5%) drop resolves
  rather than flags; a 30% drop is `medium`, a 60% drop is `high`; the
  dedup key stays identical across different session numbers for the same
  connection (stable per-connection identity, not per-observation).
* Full Signal lifecycle via `runGaTrafficAnomalyDetection()`: first
  detection creates (`source='ga'`), a still-anomalous re-run bumps
  `occurrence_count` (not a 2nd row), recovery resolves it, recurrence
  reopens it — exactly ONE Signal row existed throughout the whole
  4-call lifecycle.
* Cross-workspace isolation: Workspace 2 running detection for the SAME
  numeric `connection_id` got its own independent Signal; Workspace 1's
  Signal was completely unaffected.
* `recordGaTrafficAnomalyEvidence()`: recorded and linked a snapshot;
  identical numbers the next day deduped (refreshed, not a new row);
  genuinely different numbers produced a real new row — exactly 2 distinct
  Evidence snapshots existed after 3 calls, both linked to the same Signal.
* **Regression check**: `runSeoTechnicalIssueDetection()` still creates and
  resolves Signals correctly after the `applyDetectionPlan()` extraction —
  the refactor did not change SEO's proven V10-01 behavior.
* The exact derived-table `AVG`/`COUNT` baseline SQL now used in
  `data_sync.php` was run directly against the seeded 5-day history and
  returned the correct `day_count=5`/`avg_sessions=100.0`.

**Static verification**: `php -l` passed on every new/modified PHP file
(`GaTrafficAnomalyDetector.php`, `SignalService.php`, `SignalRepository.php`,
`EvidenceService.php`, `ga/data_sync.php`).

**Not yet executed (needs the real host)**: a real GA sync run against a
live Google Analytics property with genuine multi-day history, to confirm
the detection fires correctly against real (not synthetic) session numbers,
plus a real cross-workspace HTTP negative test — same category of gap as
every prior V10 task.

## 13. V11-01 — Action & Manual Task Lifecycle

`migrations/029_action_manual_task_lifecycle.sql` creates a brand-new
`actions` table (real NOT NULL FKs from creation, `UNIQUE(decision_id)` —
one Action per Decision, idempotent by construction) and expands the
already-live `tasks` table (nullable `action_id`, widened `status` ENUM to
add `blocked`, new nullable `completion_note`) — `recommendation_id` stays
NOT NULL and dual-written, so every existing read-by-recommendation_id call
site is completely unaffected. Run
`backend/sql/preflight_v11_01_action_task_inventory.sql` first (confirms
`actions` doesn't already exist, inventories the current `tasks` shape/data,
and confirms every existing task's recommendation has a recoverable
accepted/modified Decision), then `migrations/029`, then
`migrations/030_action_manual_task_backfill.sql` (creates one Action per
pre-existing Task and backfills `tasks.action_id` — idempotent, safe to
re-run), then `backend/sql/postflight_v11_01_action_task_invariants.sql`.

**What an Action is, and why it's separate from Task/Queue Job**: per the
task packet's "Action、Task 與 Queue Job 必須保持不同語意" — an Action is the
formal authorization boundary between a human's accepted/modified Decision
(V10-05) and the Manual Task that gets worked on. It records WHO authorized
it (`authorized_by_member_id`), WHICH Decision authorized it (`decision_id`),
and a snapshot of the business intent at authorization time (`intent`) — not
a live pointer to the Recommendation's content, which keeps changing via
revisions after the Action already exists. Action's own `status`
(pending/in_progress/completed/cancelled) is kept in sync with Task's status
by `WorkflowService`/`WorkflowRepository`, but is a genuinely separate
column — Action has no `blocked` state (a Task execution detail, not an
authorization detail), and nothing here touches `queue_jobs` or any
execution-result concept (V11-02/03's job).

**Decision outcome → Action creation rule**: only `create_task`'s implicit
`accepted` decision path ever creates an Action — `save_decision` (covering
`rejected`/`skipped`/`deferred`/`needs_more_evidence`, and `accepted`/
`modified` submitted WITHOUT creating a task) never touches the `actions` or
`tasks` tables at all. This makes "Reject/Skip/Defer/Needs More Evidence 不得
自動建立可執行 Action" trivially true by construction, not by a runtime check
that could be bypassed.

**Task lifecycle state machine**
(`WorkflowService::TASK_STATUS_TRANSITIONS`): `pending → {in_progress,
blocked, cancelled}`, `in_progress → {blocked, cancelled}`, `blocked →
{in_progress, cancelled}`, `completed`/`cancelled` are terminal.
**`completed` is never a directly-reachable target from ANY state via the
new `update_task` action** — it is only ever set by
`WorkflowRepository::updateStep()`'s automatic step-driven recompute, which
itself now only fires `WHERE t.status IN ('pending', 'in_progress')` — a
`blocked` task is frozen (completing all its steps while blocked does NOT
auto-complete it; a human must explicitly unblock it first via
`update_task`, after which the next step touch recomputes correctly), and
`cancelled`/`completed` reject `update_step` entirely at the Service layer.
`update_task` also validates a new `assigned_member_id` is an active member
of the workspace (reusing `WorkspaceAccessPolicy::requireActiveMembership()`)
before accepting it, and syncs the Action to `cancelled` when the Task is
cancelled.

**Idempotency, the subtle part**: a resubmitted `create_task` for a
Recommendation that already has a Task is now a COMPLETE no-op — it doesn't
even call `recordDecision()`/`createOrFindForDecision()`/`createOutcome()`,
not just an early-return on the Task insert like before V11-01. This was
NOT the first version written: initially `create_task` still called
`recordDecision('accepted', ...)` unconditionally on every resubmit (matching
its pre-V11-01 behavior, since `decisions` is append-only and a resubmit
naturally appends a fresh row) and only THEN checked for an existing Task —
since an Action is keyed 1:1 to its OWN `decision_id`, every resubmit was
creating a genuinely new, second Action for the same Task. **This exact bug
was caught by the rehearsal below**, not by reasoning about the code, and
fixed by checking for an existing Task FIRST and skipping Decision/Action/
Outcome creation entirely when one is found.

**2026-07-21 rehearsal evidence (disposable local Docker `mysql:5.6` + local
PHP 7.4 CLI harness with `mysqli` — NOT this host's real data)**: built the
full schema chain (`010`-`028`), seeded a PRE-EXISTING recommendation/
decision/task trio (simulating real data from before this migration, the
way `create_task` has always worked), applied `029`+`030`, and exercised
`WorkflowService::mutate()`'s `create_task`/`update_step`/`update_task`
actions directly (29 assertions, all passed after the idempotency fix
above):

* The backfilled legacy task correctly got a non-null `action_id`, its
  Action's `status` matched the legacy task's `in_progress` status, and the
  Action was workspace-scoped correctly — proving old data is fully
  operable through the new lifecycle API, not just "doesn't crash".
* A brand-new `create_task` correctly created an Action (`status
  in_progress`) linked to a real `accepted` Decision, and a Task linked to
  that Action.
* A resubmitted `create_task` for the same Recommendation created NO
  duplicate Action (the bug above, now fixed) and returned the identical
  Task.
* Completing all of a task's steps auto-completed it AND synced its Action
  to `completed`; `update_step` was then correctly rejected on the now-
  completed task.
* Manual `blocked` → completing all steps while blocked did NOT
  auto-complete the task (frozen, confirmed by direct inspection after the
  step calls) → manual unblock to `in_progress` → the next step touch
  correctly recomputed to `completed`, syncing the Action too.
* Direct `status=completed` via `update_task` was rejected from every
  state (not directly settable, ever); `cancelled` was confirmed terminal
  (no transition out); `update_step` was rejected on a cancelled task;
  cancelling synced the Action to `cancelled`.
* Assigning a task to a non-member (`assigned_member_id=99999`) was
  rejected; assigning to a real active member succeeded.
* Cross-workspace: Workspace 2's identity calling `update_task` on
  Workspace 1's task correctly hit `NotFoundException` (task not found in
  the caller's own workspace scope).
* All 4 non-accepting decision outcomes (`rejected`/`skipped`/`deferred`/
  `needs_more_evidence`) via `save_decision` correctly created NO Task and
  NO Action.
* Role permission matrix unchanged: `viewer` still denied `workflow.mutate`.

**Static verification**: `php -l` passed on every new/modified PHP file
(`ActionRepository.php`, `WorkflowRepository.php`, `WorkflowService.php`,
`public/index.php`); `npm run typecheck`/`lint`/`build` all passed with the
new task-lifecycle controls added to `DashboardTasksPage.tsx`.

**Not yet executed (needs the real host)**: applying `migrations/029`/`030`
to the real database, uploading the PHP changes, a real end-to-end HTTP
verification of the blocked/cancel/assignee flows through a live browser
session (same login-credential gap as V10-06), and confirming the real
backfill recovers a sensible `action_id` for this host's actual pre-existing
task rows (this rehearsal's backfill scenario is synthetic, one seeded
legacy task, not the real host's actual data shape).

## 14. V11-02 — MySQL Queue Worker Reliability

`migrations/031_queue_worker_reliability_expand.sql` expands the
already-live `queue_jobs` table (migrations/010, ADR-004's Database Job
Queue decision) — it has existed since V0.9 but grep confirms zero
application code has ever written to it before this task. Adds
`idempotency_key` (opt-in per-workspace dedup, same NULL-is-distinct design
as `decisions.idempotency_key`) and `handler_version`. Everything else this
task needed (`status`/`priority`/`scheduled_at` for backoff scheduling,
`locked_at`/`locked_by` for claim + stuck detection, `attempts`/
`max_attempts`/`last_error` for retry + dead-letter) already existed —
this expand is intentionally small. Run
`backend/sql/preflight_v11_02_queue_inventory.sql` first, then
`migrations/031`, then
`backend/sql/postflight_v11_02_queue_invariants.sql`.

**Atomic claim on MySQL 5.6 (no `SELECT ... FOR UPDATE SKIP LOCKED`, which
is 8.0+ only)**: `QueueRepository::claimNext()` does
`UPDATE queue_jobs SET status='processing', locked_at=NOW(), locked_by=? WHERE status='queued' AND scheduled_at<=NOW() ORDER BY priority ASC, id ASC LIMIT 1`,
a single atomic statement — InnoDB's row locking guarantees two workers
racing this exact query can never both update the same row, because the
second worker's UPDATE re-evaluates `WHERE status='queued'` after acquiring
the row lock and finds it already changed by the first. `$claimToken` is a
fresh random value per claim ATTEMPT (not a static worker id), used only to
disambiguate which row a `SELECT ... WHERE locked_by=?` re-fetch just
claimed.

**Retry/backoff/dead-letter**
(`QueueService::executeClaimedJob()`): exponential backoff `30s * 2^(attempts-1)`,
capped at 1 hour. A job whose new attempt count reaches `max_attempts` goes
to `dead_letter` (audited — see below) instead of retrying again. **An
unknown `job_type` (no handler registered in the caller's handler registry)
fails closed through the EXACT SAME path as a handler throwing an
exception** — it is never silently skipped or left claimed forever; this
matters today because **V11-02 registers zero real job handlers** (the
handler registry passed to `runBatch()` in `public/index.php` is
deliberately `array()`) — the first real consumer is V11-06 Notification
delivery. Until then, anything actually enqueued in production would
dead-letter immediately, which is correct, safe behavior, not a bug to fix
later.

**Stuck-job recovery**: `QueueRepository::recoverStuckJobs()` runs at the
START of every `runBatch()` cycle (there is no daemon to run it on a
separate schedule) — a `processing` job whose `locked_at` is older than 5
minutes is presumed to belong to a crashed/killed worker; it is requeued if
retry budget remains, or dead-lettered if not, clearing `locked_at`/
`locked_by` either way.

**The worker trigger — the "how does this run without SSH/cron" decision
this task packet asked for**: `POST /api/v1/queue/run`
(`backend/api/public/index.php`), authenticated by a NEW
`WorkerRequestAuthenticator` (`backend/api/src/Queue/WorkerRequestAuthenticator.php`)
— deliberately NOT the existing `ServiceRequestAuthenticator`, since a
worker batch has no member/workspace identity to sign as. Same
HMAC-timestamp-nonce replay-safety shape (reuses the existing generic
`service_request_nonces` table), signed with its own secret
(`QUEUE_WORKER_SECRET`, must be set to a fresh value distinct from
`SERVICE_AUTH_SECRET` before this is relied on in production) so a leaked
frontend secret can never trigger the worker and vice versa. Batch size
(`QUEUE_WORKER_BATCH_SIZE`, default 10) and time budget
(`QUEUE_WORKER_TIME_BUDGET_SECONDS`, default 20) are both configurable via
environment variables. **Operational decision left to whoever configures
the real host**: which external scheduler actually calls this endpoint on a
schedule (a free cron-ping service, a GitHub Actions scheduled workflow, a
Cloudflare Cron Trigger, etc.) — this task guarantees the endpoint itself is
safe to expose publicly (unauthenticated calls are rejected), not which
specific always-on scheduler product to subscribe to.

**Audit**: only the operationally-critical event (a job exhausted its
retries and needs human attention) is audited
(`event_type='Queue Job Dead-Lettered'`, `entity_type='QueueJob'`) —
comprehensive mutation-to-audit coverage across every V09-V11 capability,
including whether more Queue events belong in the matrix, is V11-07's
explicit job, not duplicated piecemeal here.

**2026-07-21 rehearsal evidence (disposable local Docker `mysql:5.6` + local
PHP 7.4 CLI harness with `mysqli` — NOT this host's real data)**: 21
single-process assertions plus a REAL two-process concurrency test, all
passed:

* Enqueue validation: invalid `job_type` format, out-of-range priority, and
  an oversized (>64KB) payload were all rejected.
* Idempotent enqueue: the same `idempotency_key` submitted twice (with
  deliberately different payload content on the retry) returned the
  identical existing job — exactly 1 row, not 2.
* Retry/backoff: a handler that always throws — first failure requeued the
  job (`status=queued`, `attempts=1`, `scheduled_at` pushed into the
  future); forcing it claimable again and re-running hit `max_attempts=2`
  and correctly dead-lettered it (`attempts=2`).
* Unknown `job_type` with `max_attempts=1` dead-lettered on the very first
  run with a real, specific error message ("No handler registered for
  job_type: ...") — proving the fail-closed path, not a silent skip.
* A real handler succeeded and received the exact payload it was enqueued
  with; the job completed with `completed_at` set.
* Stuck-job recovery: one job manually left `processing` with a
  20-minute-old `locked_at` and `attempts < max_attempts` was correctly
  requeued; a second with `attempts >= max_attempts` was correctly
  dead-lettered — both in the same `recoverStuckJobs()` call, both with
  `locked_at`/`locked_by` cleared.
* Cross-workspace: Workspace 2 attempting to cancel Workspace 1's job had no
  effect; Workspace 1 cancelling its own still-`queued` job succeeded; a job
  already `processing` could NOT be cancelled (only `queued` jobs are
  cancellable).
* **Real concurrency, not just reasoning about the SQL**: seeded 20 queued
  jobs, then launched TWO actual separate OS processes (`docker run`
  instances, run in parallel via shell backgrounding, each in a tight claim
  loop with a small `usleep` to force real time overlap) racing to claim
  them. Verified directly against the database (by `job_type`/`locked_by`,
  not just trusting each process's own stdout): all 20 jobs ended up
  `processing`, each with a UNIQUE `locked_by` claim token — 10 claimed by
  "worker A", 10 by "worker B", **zero jobs claimed by both, zero jobs
  claimed twice, zero jobs missed**.
* Dead-letter audit: a job dead-lettered via the no-handler-registered path
  produced exactly one `audit_logs` row with the job's `job_type` and error
  message in its metadata.

**Static verification**: `php -l` passed on every new/modified PHP file
(`WorkerRequestAuthenticator.php`, `QueueRepository.php`, `QueueService.php`,
`public/index.php`). No frontend changes in this task (Queue Job has no UI
surface yet — nothing in V1.1 reads/displays queue state; V11-06
Notification will be the first consumer with any user-facing surface).

**Not yet executed (needs the real host)**: applying `migrations/031`,
uploading the PHP changes, setting a real `QUEUE_WORKER_SECRET`, and
configuring a real external scheduler to call `POST /api/v1/queue/run` on
an interval — this rehearsal proves the mechanism is correct, not that a
production scheduler has been wired up (there is nothing to schedule
against yet either, since zero job handlers exist until V11-06).

## 15. V11-03 — Execution Result

`migrations/032_execution_result_persistence.sql` creates a brand-new
`execution_results` table (real FKs from creation, same rule as
`signals`/`evidence_items`/`actions`). Run
`backend/sql/preflight_v11_03_execution_result_inventory.sql` first
(confirms `execution_results` doesn't already exist and that `tasks`/
`queue_jobs` are already at the shape this task's FKs need — migrations
029/030 and 031 must already be applied), then `migrations/032`, then
`backend/sql/postflight_v11_03_execution_result_invariants.sql`.

**Exactly one of Task/Queue Job, enforced in code, not the database**:
MySQL 5.6 parses but silently ignores `CHECK` constraints (not enforced
until 8.0.16) — `task_id`/`queue_job_id` being mutually exclusive-and-
exhaustive is enforced by `ExecutionResultService` only ever calling
`recordForTask()` (never sets `queue_job_id`) or `recordForQueueJob()`
(never sets `task_id`), never both. The postflight file's own query
(`(task_id IS NULL AND queue_job_id IS NULL) OR (both NOT NULL)`) is the
real invariant check — documented as code-enforced specifically so it is
never mistaken for a database guarantee.

**The source's own attempt number is the idempotency key** —
`UNIQUE(task_id, attempt)` / `UNIQUE(queue_job_id, attempt)` (both
nullable-safe: MySQL allows unlimited NULLs in a unique key, so a
Task-sourced row's null `queue_job_id` never collides with another
Task-sourced row's null `queue_job_id`). No separate `idempotency_key`
column was needed, unlike `decisions`/`queue_jobs` — a Task completes
exactly once (`completed` is terminal in
`WorkflowService::TASK_STATUS_TRANSITIONS`, V11-01), so `attempt` is always
`1` for a Task-sourced Result; a Queue Job's own `attempts` counter (V11-02)
IS the attempt number, incrementing on every real retry.

**Redaction and size limit, applied BEFORE anything reaches the database**
(`ExecutionResultService::redactAndLimit()`): targeted patterns for Bearer
tokens, `api_key`/`secret`/`token=`, and `password=` are replaced with
`[REDACTED]` — deliberately NOT a broad "redact anything that looks like a
long string" rule, which would mangle legitimate debugging content (real
IDs, hashes) a human might need. Output is then capped at 4KB with a
truncation note pointing at `output_reference` (a free-text field for an
external artifact location — this task does not build an artifact storage
system, only the reference field for one to plug into later).

**Integration, not just a standalone table**: `WorkflowService`'s
`update_step` action (when the step-driven recompute completes a Task) and
`QueueService`'s `executeClaimedJob()` (on EVERY attempt, success or
failure, not just the final dead-lettered one) both call
`ExecutionResultService` directly — both classes' constructors now take it
as a dependency (`public/index.php` wires one shared instance into each).
This is deliberately NOT deferred to a later integration task: an
Execution Result table nobody writes to would be undetectable dead code.

**2026-07-21 rehearsal evidence (disposable local Docker `mysql:5.6` + local
PHP 7.4 CLI harness with `mysqli` — NOT this host's real data)**: 13
assertions, all passed:

* Redaction: a Bearer token and a `password=` value were both correctly
  redacted from a recorded output summary, with a `[REDACTED]` marker
  present.
* Size limit: a 10,000-byte output was truncated with a note referencing
  `output_reference`.
* Idempotency: recording the same (task, attempt=1) twice with
  DIFFERENT content on the second call returned the ORIGINAL row unchanged
  — exactly 1 row exists, the second call's content was correctly ignored.
* **Real integration through `WorkflowService`**: created a real Task via
  `create_task`, completed its one step via `update_step`, and confirmed a
  `success` `execution_results` row was written for that Task — not tested
  in isolation from the actual completion code path.
* **Real integration through `QueueService`**: one job that always succeeds
  and one that always throws (with a fake token embedded in the exception
  message) were run through a real `runBatch()` call — the successful job
  produced a `success` Result, the failing job produced a `failure` Result
  with the token correctly redacted from `error_message`. Forcing the
  failing job claimable again and re-running produced a SECOND, separate
  Result row (`attempt=2`), not an overwrite of the first.
* Exactly-one-of-source invariant: confirmed zero violating rows across
  every row created during the whole rehearsal.

**Static verification**: `php -l` passed on every new/modified PHP file
(`ExecutionResultRepository.php`, `ExecutionResultService.php`,
`QueueService.php`, `WorkflowService.php`, `public/index.php`). A real bug
was caught and fixed during this task, before any rehearsal ran: the
`bind_param()` type string in `ExecutionResultRepository::recordForTask()`/
`recordForQueueJob()` was miscounted by hand (12 characters for 13
parameters, with the wrong types from position 7 onward) — caught by
carefully recounting the parameter list against the type string
character-by-character before ever running the rehearsal, not by a runtime
failure.

**Not yet executed (needs the real host)**: applying `migrations/032`,
uploading the PHP changes, and a real end-to-end HTTP verification of both
the Task-completion and Queue-Job-completion Result-recording paths — same
category of gap as every prior task.

## 16. V11-04 — Business Outcome (formal, Action-linked, multi-metric)

**Design decision, documented up front**: the task packet's own hint
("移除/延後既有 task unique constraint的安全遷移方案") points toward reshaping
the EXISTING `business_outcomes` table (migrations/012 — one row per Task, a
single JSON blob covering all 4 metrics). That table is real, shipped, and
read by the V10-04~06 Dashboard/Tasks UI today. Reshaping it would mean
either a destructive migration of live data the UI depends on, or
maintaining two competing shapes in the same table. Instead, this task adds
a brand-new, ADDITIVE table — `business_outcome_metrics`
(`migrations/033_business_outcome_metric_persistence.sql`) — linked to
`actions` (not `tasks`, per this task's own "連回 Action" requirement), with
real per-metric grain, populated ALONGSIDE the legacy blob at the exact same
two call sites. **Nothing about the legacy table changes**: not its schema,
not its constraint, not its data — confirmed by both preflight/postflight
recording its row count and asserting it is identical after the migration.
Run `backend/sql/preflight_v11_04_business_outcome_metric_inventory.sql`
first, then `migrations/033`, then
`backend/sql/postflight_v11_04_business_outcome_metric_invariants.sql`.

**One Action, many Outcome metrics**: `UNIQUE(action_id, metric_key)` is the
table's real grain — not a JSON blob subdivided at the application layer.
Four metric keys are defined today (`ga.sessions`, `ga.conversions`,
`seo.health_score`, `seo.issues` — mapped 1:1 from the SAME legacy
`sessions`/`conversions`/`seo_score`/`seo_issues` dict `WorkflowService::
metrics()` already produces from REAL GA/SEO data flowing through the
Dashboard, not synthetic numbers invented for this task), each with its own
`direction` (`increase` for sessions/conversions/health_score, `decrease`
for issues — fewer is better) baked in as a fact about the metric, not a
per-call choice.

**Baseline is write-once** — `BusinessOutcomeMetricRepository::createBaseline()`'s
early return means a resubmitted baseline for the same Action+metric is a
no-op returning the ORIGINAL row untouched. "baseline 必須...鎖定" is a real
guarantee enforced in code (MySQL's UNIQUE key alone would still allow an
`ON DUPLICATE KEY UPDATE` to silently overwrite it — this repository
deliberately never issues one for the baseline write).

**Fail-closed, per metric independently**: a metric whose baseline was
meaningfully positive but whose current reading is non-positive is recorded
as `status='unavailable'` with `actual_value=NULL` — never a fabricated
"100% regression". This mirrors the EXISTING legacy validation
(`WorkflowService`'s `measure_outcome` branch already throws when
`baseline.sessions > 0 && current.sessions <= 0`), but per-metric and
non-throwing: one metric being unavailable doesn't block the other three
from recording a real measurement.

**`outcome_status` computation**: `improved`/`regressed`/`flat`/`unknown`,
computed from `direction` + baseline + actual — a ±2% change is treated as
noise (`flat`), never guessed as a real signal from rounding-level movement.

**Integration, not a standalone table**: `WorkflowService`'s `create_task`
branch calls `recordBaselineSet()` right after the legacy
`createOutcome()` call (same real baseline dict); `measure_outcome` calls
`recordMeasurementSet()` right after the legacy `measureOutcome()` call
(same real current-metrics dict). `get()`'s read response gained a new
`outcome_metrics` array, additive alongside the existing `outcome` key.

**2026-07-21 rehearsal evidence (disposable local Docker `mysql:5.6` + local
PHP 7.4 CLI harness with `mysqli` — NOT this host's real data)**: 17
assertions, all passed:

* Baseline set: recording a 4-metric baseline created exactly 4 rows with
  the correct direction per metric; a resubmit with deliberately different
  values returned the ORIGINAL baseline untouched, still exactly 4 rows.
* Measurement: all four `improved`/`flat`/`regressed` combinations were
  exercised across BOTH directions (an increase-direction metric going up
  → `improved`, one moving <2% → `flat`, one going down → `regressed`; a
  decrease-direction metric — fewer issues — going down → `improved`,
  proving the direction-aware logic, not a hardcoded "up is good").
* Fail-closed: a positive baseline with a zero current reading correctly
  recorded `status='unavailable'`, `actual_value=NULL`,
  `outcome_status='unknown'` — never a fabricated value.
* Cross-workspace isolation: Workspace 2 querying Workspace 1's `action_id`
  saw zero rows.
* **Real end-to-end integration through `WorkflowService`**: created a real
  Task via `create_task` with a real baseline dict — confirmed BOTH the
  legacy outcome blob AND 4 new formal per-metric rows were created
  together (additive, not a replacement); completed the task's step; called
  `measure_outcome` with real current metrics — confirmed BOTH
  representations updated together, with the formal `ga.sessions` metric
  correctly computed as `improved`.

**Static verification**: `php -l` passed on every new/modified PHP file
(`BusinessOutcomeMetricRepository.php`, `BusinessOutcomeMetricService.php`,
`WorkflowService.php`, `public/index.php`). Another `bind_param()`
type-string miscount (`createBaseline()`, same class of hand-counting error
as V11-03's) was caught and fixed by character-by-character recounting
before the rehearsal ran, not by a runtime crash.

**Not yet executed (needs the real host)**: applying `migrations/033`,
uploading the PHP changes, and a real end-to-end HTTP verification using
actual GA/SEO data (this rehearsal used realistic but synthetic numbers) —
same category of gap as every prior task.

## 17. V11-05 — Evaluation & Feedback

`migrations/034_evaluation_feedback_persistence.sql` creates a brand-new
`evaluations` table. Run `backend/sql/preflight_v11_05_evaluation_inventory.sql`
first, then `migrations/034`, then
`backend/sql/postflight_v11_05_evaluation_invariants.sql`.

**One table, `source` discriminates system Evaluation from human
Feedback** — the task packet's own field list describes one shared shape
("均具 workspace、subject type/id、evaluator/actor、rating/outcome、reason、
source、version、timestamps"), not two divergent schemas.
`actor_member_id` is NULL for `source='system'` rows and required for
`source='human'` rows — enforced in `EvaluationService` (MySQL 5.6 cannot
express a conditional NOT NULL), checked by the postflight file's own
invariant query.

**No FK on `subject_id`** — `subject_type` can point at four different
tables (Recommendation/Decision/Task/Action) and MySQL has no polymorphic
FK. Every read/write is workspace-scoped instead, the same discipline
`signals.source_ref_id`/`evidence_items.source_ref_id` already established
for their own polymorphic pointers.

**Append-only, with a real idempotent-if-unchanged rule for system
Evaluation**: re-evaluating a subject NEVER updates a prior row. A `system`
evaluation only inserts a NEW row when the computed rating/value actually
CHANGED since the last one for that exact (subject, metric) —
`EvaluationService::recordIfChanged()`/`recordIfChangedNumeric()` — so
calling it on every read (see below) doesn't flood the table with identical
rows. Human `Feedback` always inserts (a real event each time), with an
OPT-IN `idempotency_key` for the double-click-resubmit case only, same
NULL-is-distinct pattern as `decisions.idempotency_key`.

**Six basic metrics, computed from data this codebase already has** —
no synthetic scoring, no new "Learning" abstraction:

* `recommendation.adoption` (subject=Recommendation): the latest Decision
  mapped to `adopted` (accepted/modified), `not_adopted` (rejected/skipped),
  or `pending` (deferred/needs_more_evidence, or no Decision yet).
* `decision.outcome` (subject=Decision): the Decision's own outcome value,
  surfaced as a queryable Evaluation row for reporting.
* `task.completion` (subject=Task): the Task's own lifecycle status
  (V11-01).
* `outcome.achievement` (subject=Action): aggregates V11-04's per-metric
  `outcome_status` values for that Action — majority `improved` →
  `achieved`, majority `regressed` → `not_achieved`, tied/mixed →
  `partial`, nothing measured yet → `unknown` (fail-closed, never guessed).
* `time_to_decision` (subject=Recommendation) / `time_to_outcome`
  (subject=Action): real elapsed hours, bucketed into `same_day`/
  `same_week`/`over_a_week`.

**Computed lazily on read, same established pattern as V10-06's
`refresh_recommendation` and V10-03's `readOrGenerateForSignal`**:
`WorkflowService::get()` computes/refreshes every applicable evaluation
for whatever Recommendation/Decision/Task/Action/outcome metrics it just
assembled, on every call — never a scheduled job, since nothing here is
allowed to run autonomously. This is why the idempotent-if-unchanged rule
above matters: without it, every dashboard page load would append a new
row even when nothing changed.

**Structural guarantee, not just a promise**: `EvaluationService` has no
dependency on `WorkflowRepository`, `ActionRepository`, or any other
write-path class that could create a Decision/Action/Recommendation change
— it only depends on `EvaluationRepository`. "No autonomous Decision/Action
path exists" is therefore a fact about the dependency graph, checkable by
reading the constructor, not a runtime check that could silently be
bypassed.

**Permission**: reading evaluations (`GET .../evaluations`) is available to
any active member (a reporting surface); submitting human Feedback
(`PATCH .../evaluations`) reuses the exact same `workflow.mutate`
permission gate as Decision/Task mutation — a `viewer` cannot leave
feedback any more than they can accept a Recommendation.

**2026-07-21 rehearsal evidence (disposable local Docker `mysql:5.6` + local
PHP 7.4 CLI harness with `mysqli` — NOT this host's real data)**: 28
assertions, all passed:

* Recommendation adoption mapping exercised across all 4 real Decision
  outcomes plus the no-decision case; idempotent-if-unchanged confirmed (a
  repeat call with the same rating returned the SAME row, no new insert);
  append-only history confirmed (4 real rating changes produced exactly 4
  rows, and the very FIRST row from the start of the test was still present
  and unmodified at the end).
* `outcome.achievement` aggregation exercised all 4 real combinations:
  majority improved → achieved, majority regressed → not_achieved, a tie →
  partial, nothing measured → unknown.
* Time-bucketing exercised both a same-day and an over-a-week real elapsed
  duration.
* Human Feedback: rejected an actor_member_id of 0 and an invalid
  subject_type; idempotency confirmed (a resubmit with a DELIBERATELY
  different rating under the same key returned the ORIGINAL feedback,
  ignored); a genuinely new submission (no key) correctly created a
  separate row; `source='system'` vs `source='human'` rows were confirmed
  structurally distinguishable, and directly inspected via SQL to confirm
  system rows have NULL `actor_member_id` while human rows have a real one.
* Cross-workspace isolation: Workspace 2 saw zero rows for Workspace 1's
  subject.
* **Real integration through `WorkflowService::get()`**: a fresh
  Recommendation's first `get()` call correctly created a real
  `recommendation.adoption` evaluation (`pending`, no Decision yet); a
  repeat `get()` with nothing changed created zero new rows; after a real
  Decision was recorded via `mutate()`, the NEXT `get()` (called internally
  by `mutate()` itself) correctly created exactly 2 new rows — the adoption
  rating changing to `adopted`, AND `time_to_decision` being recorded for
  the first time ever (it had no prior row to compare against, so it's
  always "new" on its first real occurrence). This two-row result was
  initially asserted as one row in the rehearsal script itself — caught by
  inspecting the actual database rows directly, not a product bug: both
  metrics are legitimately new information in that single `get()` call.

**Static verification**: `php -l` passed on every new/modified PHP file
(`EvaluationRepository.php`, `EvaluationService.php`,
`EvaluationController.php`, `WorkflowService.php`, `public/index.php`).

**Not yet executed (needs the real host)**: applying `migrations/034`,
uploading the PHP changes, and a real end-to-end HTTP verification of the
Feedback submission endpoint through a live, authenticated browser session
— same login-credential gap as every V10-06-onward task.

## 18. V11-06 — Notification

`migrations/035_notification_persistence.sql` creates three brand-new
tables (real FKs from creation). Run
`backend/sql/preflight_v11_06_notification_inventory.sql` first (also
confirms `queue_jobs`/migrations 010+031 are already applied, since email
delivery FKs into it), then `migrations/035`, then
`backend/sql/postflight_v11_06_notification_invariants.sql`.

**Dedup, the real DB guarantee**: `UNIQUE(workspace_id,
recipient_member_id, dedup_key)` on `notifications` plus
`NotificationRepository::createIfNotExists()`'s early return means "同一
event/recipient 重放不重複通知" cannot be violated by a resubmit — a repeat
call for the same recipient+dedup_key always returns the ORIGINAL row,
even if the caller supplied different title/body content on the retry
(proven in the rehearsal, not just asserted).

**Preferences: opt-out for `in_app`, opt-in for `email`** — no preference
row for a given (member, event_type, channel) means the DEFAULT applies
(`NotificationService::DEFAULT_CHANNEL_ENABLED`). Everyone gets in-app
notifications unless they explicitly disable a specific `event_type`;
nobody gets email until they explicitly enable it — and even then, a
SECOND independent gate (the provider being genuinely configured) must
also pass.

**Honest degraded state, not a promise the code can't back up** — three
distinct `notification_deliveries.status` outcomes make the difference
observable via the API, never silently conflated: `skipped_disabled`
(preference off), `skipped_unconfigured` (preference ON but no real email
provider configured — `NotificationService::isEmailProviderConfigured()`
checks `NOTIFICATION_EMAIL_PROVIDER_API_KEY`), and `pending`/`sent`/
`failed`/`dead_letter` (the real, queue-driven attempt path once both gates
pass). `EmailDeliveryHandler::send()` (`backend/api/src/Notification/EmailDeliveryHandler.php`)
is a documented stub with NO real provider integration — it always throws,
so even a "configured" environment with a fake/placeholder key correctly
fails and goes through V11-02's normal retry/dead-letter path rather than
fabricating a successful send. Swapping in a real provider later only
requires replacing this one class's method body.

**Delivery via Queue, never synchronous** — `deliverEmail()` only ever
calls `QueueService::enqueue('notification.email', ...)`; the actual send
attempt happens later, in a worker batch, via the `notification.email`
handler now registered in `public/index.php`'s `/api/v1/queue/run`
endpoint (V11-02's first real handler, exactly as that task's own docs
predicted). `workspace_id` travels inside the job payload itself, since a
Queue Job handler only ever receives the decoded payload, never the raw
job row — keeping that boundary means a handler can never accidentally
read another job's metadata.

**Recipient resolution**: `notifyWorkspace()` resolves to every ACTIVE
member of the workspace (`NotificationRepository::listActiveWorkspaceMemberIds()`)
— a simple, defensible default; per-member/per-event opt-out via
preferences is what actually narrows who gets bothered, not a role filter
at the resolution step.

**Two real domain events wired** (task packet: "至少兩種 event 可產生正確
notification"): `signal.detected` — from `si/seo/summary.php` (day-level
deduped, so repeated re-scans of the same site within one day don't spam)
and `ga/data_sync.php` (per connection+day deduped), both firing only on a
genuinely NEW or reopened Signal, never on an occurrence-count bump of an
already-open one; and `task.completed` — from `WorkflowService`'s
`update_step` completion branch, targeted at the Task's own assignee (not
the whole workspace). Neither of these creates a Recommendation, Decision,
or Action — Notification only reads what already happened and tells
someone.

**2026-07-21 rehearsal evidence (disposable local Docker `mysql:5.6` + local
PHP 7.4 CLI harness with `mysqli` — NOT this host's real data)**: 22
assertions, all passed:

* `notifyWorkspace()` correctly notified ALL 3 seeded active members
  (owner/member/viewer, no role filtering); a resubmit with the SAME
  dedup_key and DELIBERATELY different title/body content created zero
  duplicate rows and returned the ORIGINAL content.
* In-app delivery was immediate (`status=delivered`); email defaulted to
  `skipped_disabled` with no preference set.
* Enabling the email preference WITHOUT a configured provider correctly
  produced `skipped_unconfigured` with `queue_job_id=NULL` — no job was
  even enqueued for something that couldn't be sent.
* With a provider configured (`putenv()` in the rehearsal), the SAME
  preference correctly enqueued a REAL `notification.email` Queue Job
  (`status=pending`, real `queue_job_id`) in the right workspace.
* Running the REAL queue batch with the REAL handler registry (not a fake
  test handler) correctly claimed and failed that job — `EmailDeliveryHandler`'s
  stub always throws — and the delivery row updated to `status=failed`
  with the actual stub exception message captured, never a fabricated
  success.
* Preferences are per-event_type, not a blanket mute: unsubscribing from
  `in_app` for `task.completed` was honored, while a DIFFERENT event_type
  (`signal.detected`) for the same member was delivered normally.
* Read/dismiss lifecycle: marking read succeeded once, was a no-op (not an
  error) on a second attempt; dismissing succeeded; a DIFFERENT member
  could not mark someone else's notification as read.
* Cross-workspace isolation: Workspace 2 listed zero of Workspace 1's
  notifications.
* **Real integration through `WorkflowService`**: completing a real Task's
  one step via the actual `update_step` code path fired a real
  `task.completed` notification to the Task's real assignee — not tested
  in isolation from the completion logic.

This rehearsal's initial schema setup was incomplete twice before running
successfully — first missing `migrations/011`/`029` (tasks/actions, needed
because `execution_results` FKs into `tasks`), then missing
`migrations/012` (the legacy `business_outcomes` table, needed because
`WorkflowService::mutate()`'s `create_task` action still writes it
alongside V11-04's formal per-metric rows). Both were caught by a real
`bind_param() on bool` fatal error (a failed `->prepare()` from a missing
table/column) pointing directly at the incomplete schema, not silently
producing wrong results.

**Static verification**: `php -l` passed on every new/modified PHP file
(`NotificationRepository.php`, `NotificationService.php`,
`NotificationController.php`, `EmailDeliveryHandler.php`,
`WorkflowService.php`, `si/seo/summary.php`, `ga/data_sync.php`,
`public/index.php`).

**Not yet executed (needs the real host)**: applying `migrations/035`,
uploading the PHP changes, configuring a real email provider (currently
none is chosen — `EmailDeliveryHandler` is a deliberate, documented stub),
and a real end-to-end HTTP verification of the notification list/read/
dismiss/preferences endpoints through a live browser session — same
login-credential gap as every V10-06-onward task.

## 19. V11-07 — Audit Log Complete Coverage

No new table — `audit_logs` has existed since `migrations/010` and stays
append-only (grep-verified across the whole codebase: zero `UPDATE
audit_logs` or `DELETE ... audit_logs` call sites, and `AuditRepository`
exposes no such method). `migrations/036_audit_log_search_index.sql` adds
exactly one index (`idx_audit_logs_workspace_event`, additive `ADD INDEX`
only). Run `backend/sql/preflight_v11_07_audit_log_inventory.sql` first,
then `migrations/036`, then
`backend/sql/postflight_v11_07_audit_log_invariants.sql`.

### Mutation-to-audit coverage matrix (as of this task)

Before this task, exactly **four** call sites wrote to `audit_logs`
(`SignalService`, `WorkflowService`, `QueueService`, `GaIntegrationService`),
each with its own hand-rolled private `audit()` method — two of them
(`WorkflowService`, `QueueService`) duplicated a runtime `SHOW COLUMNS ...
LIKE 'metadata_json'` detection dance that has never needed its fallback
branch since the column has been `metadata_json` since `migrations/010`.
Every mutation below now goes through the single converged writer,
`backend/api/src/Audit/AuditLogger.php`:

| Domain | Event(s) | Entity | Actor | Status before this task |
|---|---|---|---|---|
| Signal | `signal.acknowledged`/`signal.dismissed` (human), `signal.detected`/`signal.reopened`/`signal.auto_resolved` (system) | Signal | member or null | Covered, but `applyDetectionPlan()` had NO transaction — a crash between the signal upsert and its audit row could leave one without the other. Now atomic (see below). |
| Decision/Action/Task/Outcome (`WorkflowService::mutate()`) | `decision.recorded`, `action.created`, `action.status_changed`, `task.created`, `task.step_updated`, `task.completed`, `task.lifecycle_updated`, `outcome.baseline_recorded`, `outcome.measured`, `outcome_metric.baseline_set`, `outcome_metric.measured`, `recommendation.refreshed` | Decision/Action/Task/BusinessOutcome/Recommendation (own `public_id`) | member | Was ONE generic `"Dashboard Workflow {action}"` row per API call, naming neither which entity changed nor its own id — only the Recommendation's `context_key`. Now one granular event per real state change, same transaction. |
| Execution Result (`ExecutionResultService::recordForTask()`, triggered from `update_step`) | `execution_result.recorded` | Task | member (via `WorkflowService`) | Zero coverage. Now audited from `WorkflowService` (same transaction) whenever a Task completes. |
| Queue Job | `queue.job_dead_lettered` (both the immediate handler-exception path AND the stale-lease-recovery path), `queue.job_cancelled` | QueueJob | null (system) or member | Only the handler-exception dead-letter path was covered. The stale-lease `recoverStuckJobs()` dead-letter path (a SECOND, functionally identical "exhausted retries" event) was completely unaudited. `cancel()` had none at all (also not wired to any HTTP route yet — audited anyway so coverage exists by construction whenever it is). |
| GA Integration | `integration.ga_status_updated` (toggle), `integration.ga_connected` (OAuth connect) | WorkspaceIntegration | member | The toggle was covered; the actual "connect" flow (`ga/oauth_callback.php`) and a legacy shadow endpoint (`ga/update_connection_status.php`, mutates the exact same field through a different code path) had zero coverage. |
| Human Feedback (`EvaluationService::recordFeedback()`) | `evaluation.feedback_recorded` | Evaluation | member (structurally required > 0) | Zero coverage — the one genuinely human-initiated mutation in a class whose only other writes are system-computed. |
| Notification | `notification.read`, `notification.dismissed`, `notification.preference_updated` | Notification / NotificationPreference | member | Zero coverage on all three human-initiated actions (notification CREATION itself is intentionally not audited — it is not a human mutation, and Notification is explicitly not a substitute for audit per the task packet's own out-of-scope line). |
| Workspace provisioning (`WorkspaceProvisioningService`) | `workspace.provisioned` | Workspace | member | Zero coverage on the entry point every other Workspace-scoped mutation depends on. |

**Deliberately still NOT audited (P2, documented rather than silently
gapped)**: Evidence recording, Explanation/Business-Impact generation, and
system-computed Evaluation rows (`EvaluationService::recordIfChanged*()`) —
all derived/system data, not P0/P1 security, Decision, Task, or Integration
mutations per the task packet's acceptance criteria. AI usage
(`dashboard/ai_compose.php`, `ai_plan.php`) is already covered by its own
dedicated `dashboard_ai_logs`/`dashboard_ai_plan_logs` tables (workspace +
actor + prompt + response) — duplicating that into `audit_logs` would be
exactly the "stuff every debug/application log into audit_logs" the task
packet explicitly rules out. Queue job `claimNext()`/`markCompleted()` (the
high-frequency success path) stay unaudited by design — dead-lettering is
the "needs human attention" signal, a normal completion is not.

### Converged writer: redaction, size limit, versioning

`AuditLogger::record()` is the only INSERT path left. Metadata goes through
`redact()` before encoding: a key matching
`password|passwd|secret|token|api[_-]?key|credential` has its ENTIRE value
replaced with `[REDACTED]` regardless of shape; independently, a
`Bearer <token>` substring or a `key: value`-shaped secret pattern inside
any OTHER string value is scrubbed in place — the same two-layer approach
`ExecutionResultService::redactAndLimit()` already uses, converged into one
place. Every payload gets a `_schema_version` field; anything over 4KB
(`AuditLogger::MAX_METADATA_BYTES`) is replaced with a `_truncated` marker
recording only the original byte count, never a partial/garbled JSON blob.

### Read/search API — Workspace-scoped, owner/admin only

`GET /api/v1/workspaces/{workspaceId}/audit-logs`
(`AuditController`/`AuditRepository`) filters by `event_type`/`entity_type`/
`entity_id`/`actor_member_id`/`from`/`to`, paginated. Gated behind a NEW
`audit.read` permission — deliberately narrower than plain `read`
(`WorkspacePermissions::MATRIX`): an audit trail exposes every OTHER
member's actions, not just the caller's own, so only `owner`/`admin` are
allowed. No create/update/delete route exists for this resource anywhere —
immutability is enforced by the absence of a code path, not a runtime check.

### Retention, export, and incident-query rules

`audit_logs` has no automated deletion job in this task — a retention
*policy* is defined here so V11-08 (Retention, Cleanup & Backup Jobs, whose
dependency list already includes V11-07) has a concrete target to implement
against, rather than V11-07 quietly building deletion logic outside its own
stated scope:

* **Retention**: keep every row indefinitely until V11-08 defines and
  implements an explicit retention window (the task packet's own
  data-class inventory is the right place to decide the actual number of
  days/months) — audit data is the one class of data in this project where
  "keep it" is the safe default, not "delete it early."
* **Export**: the search API IS the export path — page through
  `GET .../audit-logs` with a `from`/`to` window (ordered `id DESC`,
  `per_page` up to 100) for any incident investigation or compliance
  request; no separate bulk-export endpoint exists or is needed yet.
* **Incident query**: `entity_type`+`entity_id` answers "what happened to
  THIS Decision/Task/Signal/QueueJob"; `actor_member_id`+`from`/`to`
  answers "what did THIS member do, and when" — both are real indexed
  query shapes (`idx_audit_logs_entity`, `idx_audit_logs_actor`,
  `idx_audit_logs_workspace_event` new in this task), not full scans.

### 2026-07-22 rehearsal evidence (disposable local Docker `mysql:5.6` + local PHP 7.4 CLI harness with `mysqli` — NOT this host's real data)

41 assertions, all passed:

* **Redaction**: a `password`/`api_key` key's value was wholly replaced; a
  `Bearer <token>` substring embedded inside an otherwise-legitimate string
  field was scrubbed in place while the rest of that field's text survived;
  a non-sensitive field was left untouched; every row carries
  `_schema_version`.
* **Size limit**: an 8000-byte metadata payload was replaced by a
  `_truncated` marker, never stored raw.
* **Signal atomicity (the actual gap this task closed)**: a forced FK
  violation mid-`applyDetectionPlan()` (a nonexistent workspace) rolled
  back BOTH the signal insert and its would-be audit row — confirmed by
  querying for zero rows in either table for that workspace afterward, not
  just that the call threw.
* **Signal domain naming convergence**: `signal.detected`/
  `signal.reopened`/`signal.auto_resolved` (system) and
  `signal.acknowledged` (human, with the REAL member id as actor, not
  null) all produced exactly the expected single row each; a "bumped"
  repeat occurrence produced zero audit noise.
* **WorkflowService granular cascade**: `save_decision` alone produced
  exactly one `decision.recorded` row; `create_task` (new task) produced
  the full 6-event cascade (`decision.recorded`, `action.created`,
  `action.status_changed`, `task.created`, `outcome.baseline_recorded`,
  `outcome_metric.baseline_set`) with `task.created`'s `entity_id` proven
  to be the Task's own `public_id`, not the `context_key` the old generic
  row used; an idempotent resubmit of the SAME `create_task` added ZERO
  audit rows; completing a Task's last step produced
  `task.step_updated`+`task.completed`+`execution_result.recorded`+
  `action.status_changed` together; `measure_outcome` produced
  `outcome.measured`+`outcome_metric.measured`; cancelling a second Task
  via `update_task` produced `task.lifecycle_updated`+
  `action.status_changed(to_status=cancelled)`; `refresh_recommendation`
  alone produced exactly one `recommendation.refreshed` row; and a
  workspace-wide query proved the OLD `"Dashboard Workflow *"` event_type
  no longer appears anywhere.
* **Queue**: a job exhausted at `max_attempts=1` was dead-lettered with
  `reason=handler_exception`; a manually-crafted stale-lease job (this
  task's second, previously-unaudited dead-letter path) was dead-lettered
  by `recoverStuckJobs()` with `reason=stale_lease_expired`; `cancel()`
  audited the real cancellation and added ZERO rows on a repeat no-op call
  against an already-cancelled job.
* **GA Integration**: `updateConnectionStatus()` audited with the real
  actor and connection id. (`oauth_callback.php`'s new `integration.ga_connected`
  event and `update_connection_status.php`'s converged `integration.ga_status_updated`
  reuse were verified via `php -l` + code review only — both are flat
  legacy scripts that `header()`/`exit()`/depend on `db_connect.php`'s own
  connection, not independently runnable inside this harness the way the
  namespaced Service classes are.)
* **Notification**: `markRead()`/`setPreference()` audited on the real
  transition; a repeat `markRead()` on an already-read notification added
  ZERO rows (guarded by the repository's own status-WHERE, same as the
  original V11-06 dedup discipline).
* **Human Feedback**: `recordFeedback()` audited with the real human
  actor; an idempotency-key replay returned the SAME row and added ZERO
  new audit rows (fixed a design mistake caught during this task's own
  code review, before the rehearsal ran: the first draft always audited
  regardless of replay, which would have produced misleading noise for a
  no-op).
* **Permission matrix**: `member` and `viewer` roles are denied
  `audit.read`; `admin` and `owner` are allowed — matches "一般使用者不可
  update/delete Audit Log" plus the narrower-than-`read` design choice
  above.
* **Cross-workspace isolation**: a second workspace's signal-detection
  audit rows never appeared in the first workspace's `search()` results.

**Static verification**: `php -l` passed on every new/modified PHP file
(`Audit/AuditLogger.php`, `Audit/AuditRepository.php`,
`Audit/AuditController.php`, `SignalService.php`, `WorkflowService.php`,
`QueueService.php`, `QueueRepository.php`,
`GaIntegrationService.php`, `EvaluationService.php`,
`WorkspaceProvisioningService.php`, `NotificationService.php`,
`WorkspacePermissions.php`, `public/index.php`,
`ga/oauth_callback.php`, `ga/update_connection_status.php`).

**Not yet executed (needs the real host)**: applying `migrations/036`,
uploading the PHP changes, and a real end-to-end HTTP verification of the
new `GET .../audit-logs` endpoint (owner/admin login) through a live
browser session — same login-credential gap as every V10-06-onward task.
V11-08's retention/cleanup job implementation (deferred by design, see
above) is also not yet built.

## 20. V11-08 — Retention, Cleanup & Backup Jobs

One new table — `migrations/037_retention_cleanup_runs.sql` — the
operational ledger every cleanup batch writes to (nullable `workspace_id`:
NULL for a workspace-agnostic class or a batch spanning multiple
workspaces; per-workspace visibility instead comes from `audit_logs`, see
below). Run `backend/sql/preflight_v11_08_retention_inventory.sql` first,
then `migrations/037`, then
`backend/sql/postflight_v11_08_retention_invariants.sql`.

### Data-class inventory & retention matrix

| Data class | Retention | Reason | Deletion mode | Owner approval |
|---|---|---|---|---|
| `service_request_nonces` | 7 days past `expires_at` | Pure replay-protection artifact — already expired the 60–600s window it protected; zero business value afterward. | Hard delete | None (non-business, non-personal, purely technical) |
| `queue_jobs` (`completed`/`cancelled`) | 30 days since `updated_at` | Superseded by `execution_results` (the real technical record of what happened); the job row itself has no further operational value once terminal. | Hard delete | None |
| `queue_jobs` (`dead_letter`) | 90 days since `updated_at` | Needs a human-investigation window — this is the "needs attention" signal V11-07's audit convention already treats specially. | Hard delete | **Required** — gated behind `RETENTION_DEAD_LETTER_CLEANUP_APPROVED=true`; unset (the default) means NEVER included, regardless of age. |
| `execution_results` | 180 days since `created_at` | Technical execution telemetry; superseded once the Business Outcome/Evaluation rows computed from it already exist. | Hard delete | None (system telemetry) |
| `notifications` (+`notification_deliveries`) where `status IN ('read','dismissed')` | 90 days since `read_at`/`dismissed_at` | Acted-upon notifications have no further operational value. | Hard delete | None (already acted upon by the owning member) |
| `notifications` (`status = 'unread'`) | **Never** — structurally excluded from the eligibility query itself, not just a wide window | Still needs the recipient's attention regardless of age. | N/A | N/A |
| `audit_logs` | **Indefinite, no automated deletion** — explicit exception (task packet: "不用 retention 刪除法規或稽核要求保留的 Audit Log") | Compliance/incident-investigation record; see V11-07 section 19. | N/A | Any future deletion would need its own explicit task and legal/compliance sign-off. |
| Domain business records (Signal/Recommendation/Decision/Action/Task/BusinessOutcome/Evaluation) | **Indefinite, no automated deletion** — explicit out-of-scope boundary ("不誤刪 active business records") | Active business records with ongoing decision/outcome-tracking value. | N/A | Any future archival policy needs its own task and owner sign-off. |
| `seo_scan_history`/`ga_daily_summary` and other legacy SI/GA analytics snapshots | Identified, deferred | Legacy tables that predate `migrations/`, not fully mapped by this task — cleanup would need its own dedicated task. | N/A | N/A |
| Personal data (`members`/`workspace_members`) | No automated retention | A legal/GDPR-style deletion request is a manual, owner-approved process — never an automated job. | N/A | Always manual |

### Cleanup jobs: dry-run first, batched, idempotent, rate-limited

`backend/api/src/Retention/RetentionCleanupService.php` implements the 4
classes with an automated job (nonces, terminal Queue Jobs, old Execution
Results, acted-upon Notifications). Every call is dry-run-capable (the
`POST /api/v1/retention/run` endpoint defaults to `dry_run`, requiring an
explicit `?mode=delete` to ever remove anything); each batch is bounded
(`BATCH_LIMIT=500`, rate limit); re-running the exact same call after a
partial failure is always safe — the eligibility query is re-evaluated
fresh every time (no stored cursor to desync), so rows already deleted
simply stop matching rather than being deleted twice.

**A real cross-table dependency found via schema review, not trial and
error**: `execution_results.queue_job_id` and
`notification_deliveries.queue_job_id` are both `ON DELETE RESTRICT`
against `queue_jobs` (migrations/032, /035). Deleting a terminal Queue Job
that's still referenced by either would simply fail the DELETE with an FK
violation — `RetentionRepository::findEligibleQueueJobs()` LEFT JOINs
against both and excludes any job still referenced, so a job effectively
stays around until whichever referencing telemetry ages out too (the
CORRECT behavior — never delete a job while technical history about it
still exists — not a bug to route around).

### Read/search access

No new HTTP read endpoint for `retention_cleanup_runs` itself — the table
has no clean per-workspace granularity (a batch can span multiple
workspaces, recorded with `workspace_id=NULL`), so building a new
workspace-scoped auth surface for it would be redundant. Per-workspace
visibility into cleanup activity instead comes through the EXISTING V11-07
audit read API: `GET .../audit-logs?event_type=retention.cleanup_executed`
(or `retention.cleanup_dry_run`). The ledger table itself is queried
directly (same "manual observability via direct DB access" precedent this
project already uses for `schema_migrations`).

### Backup & restore procedure

This hosting plan has no SSH/cron (same constraint as every prior V1.1
task) and no programmatic hook for triggering a backup from application
code. The real, honest procedure:

* **Database backup**: owner-triggered phpMyAdmin **Export** (full DB,
  `mysqldump`-equivalent), run periodically (recommended: weekly, or
  before any risky manual migration/data operation) and downloaded off the
  host.
* **Config/artifact backup**: `.env`/config files backed up separately via
  the hosting panel's file manager or FTP, also owner-triggered.
* **Storage**: both kept off-host, in a location the owner controls access
  to (e.g. encrypted local storage or the owner's own encrypted cloud
  storage) — NEVER committed to this git repository.
* **A real, current risk this task surfaces rather than glossing over**:
  `ga_connections.refresh_token` is a genuine secret persisted IN THE
  DATABASE (not an env var) — any full DB backup necessarily contains it.
  The mitigation is that the BACKUP FILE ITSELF must be
  encrypted/access-controlled (per the point above), not that the backup
  should exclude that column (which isn't practical — a restore needs a
  working refresh token to reconnect GA). This is a real operational risk
  factor to carry forward, not a gap this task can close by itself.
* **Scheduler**: retention cleanup itself IS schedulable today, the same
  way V11-02/V11-06 already established — an external free scheduler (a
  cron-ping service, a GitHub Actions scheduled workflow, a Cloudflare Cron
  Trigger) hits the new signed `POST /api/v1/retention/run` endpoint
  (reuses `WorkerRequestAuthenticator`/`QUEUE_WORKER_SECRET` verbatim — its
  HMAC canonical string is bound to `$request->path`, so a signature for
  this endpoint never validates against `/api/v1/queue/run`, no shared-secret
  cross-endpoint replay risk). Database/config backup itself has NO such
  programmatic trigger available on this host — it stays a manual,
  owner-run phpMyAdmin/file-manager procedure.
* **Alerting**: `RetentionCleanupService::runAll()` returns `ok=false` when
  any one data class fails, surfaced directly in the endpoint's JSON
  response — the external scheduler polling this endpoint can page/notify
  through whatever channel it already has. This codebase has no dedicated
  ops-alerting channel of its own (Notification is member+workspace scoped,
  not a fit for a system-wide job failure) — documented honestly as a gap,
  not fabricated.

### 2026-07-22 rehearsal evidence (disposable local Docker `mysql:5.6` + local PHP 7.4 CLI harness with `mysqli` — NOT this host's real data)

**Functional cleanup logic — 35 assertions, all passed** (after fixing one
real `bind_param()` type-string count bug caught by the rehearsal itself,
not by review — `RetentionRepository::recordRun()`'s type string had 12
characters for 11 parameters):

* Every one of the 4 data classes: `dry_run` matched the expected count and
  deleted ZERO rows; the real run then deleted EXACTLY the matched rows;
  ineligible (too-recent) rows survived.
* The FK-blocked-exclusion design worked as intended: a terminal Queue Job
  still referenced by an `execution_results` row AND a separate one still
  referenced by a `notification_deliveries` row both SURVIVED cleanup with
  no FK error thrown; once the blocking `execution_results` row was itself
  cleaned up (aged past its own 180-day retention), a FOLLOW-UP queue_jobs
  cleanup call correctly picked up and deleted the now-unblocked job —
  proving the cross-table dependency resolves itself correctly over time,
  not just that it doesn't crash.
* The dead-letter owner-approval gate: with
  `RETENTION_DEAD_LETTER_CLEANUP_APPROVED` unset, an old dead-lettered
  Queue Job survived indefinitely; after `putenv()`-setting it to `true`,
  BOTH a pre-existing old dead-letter job and a newly-seeded one were
  correctly included and deleted — the gate is a global on/off switch, not
  a per-row flag.
* Notifications: old `read`/`dismissed` rows (and their
  `notification_deliveries`) were deleted; a recent `read` row survived; an
  OLD `unread` row was NEVER touched regardless of age — proving the
  structural exclusion, not just a generous window.
* Every dry_run/delete call produced its own `retention_cleanup_runs`
  ledger row; `runAll()` aggregated all 4 classes with `ok=true` when
  nothing failed.
* **Failure isolation, forced for real**: `notifications` was temporarily
  renamed away mid-rehearsal to force a genuine failure in exactly that one
  class — `runAll()` correctly reported `ok=false` with only
  `notifications` marked `failed`, while `service_request_nonces`,
  `queue_jobs`, and `execution_results` all completed successfully in the
  SAME call — real failure isolation, not just try/catch reasoning.
* Cross-workspace audit attribution: Workspace 2's own cleanup activity
  (the FK-blocked job that eventually got cleaned up) was correctly
  attributed to Workspace 2's audit trail, never leaking into Workspace 1's
  `search()` results.

**Real disposable restore verification** (mandatory verification: "真實
backup 在 disposable 環境可還原並通過 invariants") — NOT simulated, NOT
fabricated numbers:

1. After the functional rehearsal above, the disposable DB held a real,
   varied mix of surviving rows across 13 tables (workspaces, queue_jobs,
   execution_results, notifications, retention_cleanup_runs, audit_logs,
   decisions, actions, tasks, etc.).
2. `mysqldump --routines --triggers --single-transaction` produced a real
   53KB, 989-line backup file. **Backup duration: 362ms.**
3. A SECOND, completely fresh disposable `mysql:5.6` container (a
   from-scratch "replacement host") was started and the dump restored into
   it. **Restore duration (RTO): 693ms.**
4. Row counts for all 13 tables, and `CHECKSUM TABLE` on 5 representative
   tables (`workspaces`, `queue_jobs`, `notifications`, `audit_logs`,
   `retention_cleanup_runs`), were IDENTICAL between the original and the
   restored database — `diff` on both outputs showed zero differences.
5. The restored database's foreign keys are genuinely enforced, not just
   structurally present: an attempted INSERT into `queue_jobs` with a
   nonexistent `workspace_id` was correctly rejected with a real FK
   violation (`ERROR 1452`) on the RESTORED database.
6. **RPO**: for this rehearsal, 0 (the dump was taken immediately before
   the simulated "failure"). In production, RPO is bounded by how
   frequently the owner actually performs a manual phpMyAdmin export — this
   task defines the recommended cadence (weekly / before risky operations)
   but cannot measure a real production RPO number since no periodic backup
   automation exists on this host (the same "no SSH/cron" constraint as
   everything else in V1.1). The rehearsal proves the RESTORE MECHANICS
   work end-to-end and gives a real RTO figure; it does not substitute for
   the owner actually running backups on a real schedule.

**Static verification**: `php -l` passed on every new file
(`Retention/RetentionRepository.php`, `Retention/RetentionCleanupService.php`,
`public/index.php`).

**Not yet executed (needs the real host)**: applying `migrations/037`,
uploading the PHP changes, configuring the external scheduler for
`POST /api/v1/retention/run`, and the owner establishing a REAL periodic
phpMyAdmin export cadence (this task defines the procedure and verifies
restore mechanics; it does not and cannot automate the export trigger
itself on a host with no SSH/cron). Setting
`RETENTION_DEAD_LETTER_CLEANUP_APPROVED=true` is an explicit owner decision
deferred until the owner reviews dead-letter cleanup dry-run output on real
data.

With this task complete, all 8 V1.1 Execution & Operations tasks
(`V11-01`–`V11-08`) are code+SQL+disposable-rehearsal complete — VERIFY,
not DONE, pending real-host application per the standing project rule (see
the top of `docs/00_V07_TO_V12_PROGRESS_TRACKER.md`).
