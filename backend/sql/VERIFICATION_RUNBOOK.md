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
