# SQL execution order

Executable, versioned migrations live in `migrations/` and are applied by the
runner at `backend/api/bin/migrate.php` (see "Migration runner" below), never
by hand and never by an HTTP endpoint. Everything else in this directory is
read-only preflight, a template, or a review script, and the runner will
never touch it:

1. `000_preflight_inventory.sql` — read-only; save the results before running
   anything. Includes the V09-02 owner-source discovery queries (there is no
   local members/users table; candidate owners are the union of every table
   that already records product usage by member/user id — review the count
   here against real data before relying on `migrations/014`).
2. `migrations/010_v1_foundation.sql` — creates the V1 Workspace foundation tables.
3. `migrations/011_dashboard_decision_workflow.sql` — creates Recommendation, Decision, Task, and Task Step tables.
4. `migrations/012_business_outcomes.sql` — creates task-linked baseline and measured outcome storage.
5. `migrations/013_runtime_ddl_extraction.sql` — creates the 4 tables that used
   to be `CREATE TABLE IF NOT EXISTS`'d on every request (`dashboard_ai_logs`,
   `dashboard_ai_plan_logs`, `seo_pagespeed_cache`, `seo_pagespeed_history`).
6. `migrations/014_workspace_owner_backfill.sql` — idempotent Workspace
   backfill for existing owners (V09-02).
7. `migrations/015_ga_connections_workspace_expand.sql` — adds nullable
   `ga_connections.workspace_id` (V09-03 expand phase).
8. `migrations/016_ga_connections_workspace_backfill.sql` — backfills
   `workspace_id` via `legacy_member_workspace_map` (V09-03 backfill phase).
9. `020_workspace_backfill_template.sql` — historical template only, superseded
   by `migrations/014_workspace_owner_backfill.sql`; kept for reference, never
   run directly. It intentionally rolls back.
10. `030_ga_connections_workspace_backfill_review.sql` — historical review
    queries, superseded by `migrations/015`/`016`; kept for reference.
11. `017_ga_connections_workspace_contract_DEFERRED.sql` — drafted contract
    migration (NOT NULL + FK on `ga_connections.workspace_id`, drops the
    `owner_member_id` join-fake). Deliberately kept **outside** `migrations/`
    and not applied — see the file header for the backup-restore rehearsal
    and zero-null-count gate it's waiting on.
12. `preflight_v09_04_seo_si_dashboard_inventory.sql` — read-only; run before
    `migrations/018`, same purpose as `000_preflight_inventory.sql` was for
    `014`-`016`. Confirms the real column list/engine/indexes of every
    SEO/SI(AEO/GEO)/dashboard-AI/PageSpeed table in scope, several of which
    (`seo_sites`, `seo_site_integrations`, `seo_summary_cache`,
    `seo_scan_history`, `si_sites`, `si_analysis_runs` and its child tables)
    are not created by any migration in this repo.
13. `migrations/018_seo_si_dashboard_workspace_expand.sql` — adds nullable
    `workspace_id` (V09-04 expand phase) to the 9 SEO/SI/dashboard-AI/
    PageSpeed tables that have a direct `user_id` column: `seo_sites`,
    `seo_summary_cache`, `seo_scan_history`, `si_sites`, `si_analysis_runs`,
    `dashboard_ai_logs`, `dashboard_ai_plan_logs`, `seo_pagespeed_cache`,
    `seo_pagespeed_history`. Child tables that only carry a foreign key back
    to one of these roots (`seo_site_integrations`, `si_analysis_metrics`,
    `si_analysis_items`, `si_analysis_actions`, `si_analysis_side_items`) are
    deliberately NOT altered — their ownership is established by joining
    back to the root row, not by a duplicated column.
14. `migrations/019_seo_si_dashboard_workspace_backfill.sql` — backfills the 9
    `workspace_id` columns above via `legacy_member_workspace_map` (V09-04
    backfill phase).
15. `020_seo_si_dashboard_workspace_contract_DEFERRED.sql` — drafted contract
    migration (NOT NULL + FK) for the same 9 tables. Deliberately kept
    **outside** `migrations/` and not applied — same gate as `017`.
16. `preflight_v09_08_ga_reporting_inventory.sql` — read-only; run before
    `migrations/021`, same purpose as the V09-04 preflight was for `018`.
    Confirms the real column list of the 6 GA reporting tables V09-03/04 never
    covered: `ga_report_schedules` (root, has `user_id`) and
    `ga_daily_summary`/`ga_pages`/`ga_events`/`ga_traffic_sources`/
    `ga_conversions` (child tables, only have `connection_id` referencing
    `ga_connections`, which already has a reliable `workspace_id` since
    `migrations/015`/`016`).
17. `migrations/021_ga_reporting_workspace_expand.sql` — adds nullable
    `workspace_id` (V09-08 expand phase) to `ga_report_schedules` only — the
    one root table in this batch with a direct `user_id` column. The 5 child
    tables above are NOT altered — their ownership resolves by joining back to
    `ga_connections.workspace_id`, same pattern as `seo_site_integrations` /
    `si_analysis_metrics` etc. in the V09-04 batch.
18. `migrations/022_ga_reporting_workspace_backfill.sql` — backfills
    `ga_report_schedules.workspace_id` via `legacy_member_workspace_map`
    (V09-08 backfill phase).
19. `023_ga_reporting_workspace_contract_DEFERRED.sql` — drafted contract
    migration (NOT NULL + FK) for `ga_report_schedules`. Deliberately kept
    **outside** `migrations/` and not applied — same gate as `017`/`020`.
20. `postflight_workspace_backfill_invariants.sql` — read-only; run after
    `migrations/014` applies. Every count should be 0; a nonzero anomaly
    report needs manual review, not a re-run.
21. `postflight_ga_workspace_backfill_invariants.sql` — read-only; run after
    `migrations/015`/`016` apply. Same rule: every count should be 0 or an
    explicitly reviewed anomaly.
22. `postflight_v09_04_seo_si_dashboard_workspace_backfill_invariants.sql` —
    read-only; run after `migrations/018`/`019` apply. Same rule, covering all
    9 root tables plus a child-table sanity join.
23. `postflight_v09_08_ga_reporting_workspace_backfill_invariants.sql` —
    read-only; run after `migrations/021`/`022` apply. Same rule, plus a
    schedule/connection cross-workspace leakage check specific to
    `ga_report_schedules.connection_ids` (a hand-maintained JSON list, not a
    normalized foreign key) — confirmed working against a synthetic disposable
    MySQL 5.6 rehearsal (see V09-08's tracker note and task packet execution
    log for the exact scenarios and results).
24. `preflight_v10_01_signal_inventory.sql` — read-only; run before
    `migrations/024`. Unlike the Workspace-retrofit preflights, `signals` is a
    brand-new table with no existing data, so this only confirms it doesn't
    already exist under a conflicting definition and that its FK target
    (`workspaces.id`) is in the expected shape.
25. `migrations/024_signal_persistence.sql` — creates the `signals` table
    (V10-01, first table in the Signal Domain). Unlike the Workspace-retrofit
    migrations, this is a brand-new table with no existing data to stay
    compatible with, so `workspace_id` is a normal `NOT NULL` column with a
    real FK from creation — no expand/backfill/deferred-contract phases.
26. `postflight_v10_01_signal_invariants.sql` — read-only; run after
    `migrations/024` applies. Confirms the table/FK/unique-key structure, plus
    a few informational queries once the SEO technical-issue detector
    (`backend/api/src/Signal/Detector/SeoTechnicalIssueDetector.php`,
    triggered from `si/seo/summary.php`) has actually run.
27. `preflight_v10_02_evidence_inventory.sql` — read-only; run before
    `migrations/025`, and only after `migrations/024` (signals) is already
    applied — `evidence_items`/`signal_evidence_links` FK into `signals`.
28. `migrations/025_evidence_persistence.sql` — creates `evidence_items` and
    `signal_evidence_links` (V10-02, first tables in the Evidence Domain).
    Same brand-new-table rule as `signals`: normal `NOT NULL` FKs from
    creation, no expand/backfill phases. `evidence_items` stores an immutable
    snapshot (`payload_json`/`content_hash`) rather than a live reference to
    the source row, so Evidence survives that source row later being deleted
    or pruned (V11-08 retention).
29. `postflight_v10_02_evidence_invariants.sql` — read-only; run after
    `migrations/025` applies. Confirms structure/FKs, plus informational
    queries once the SEO detector has recorded Evidence (every `source='seo'`
    Signal should have at least one linked Evidence row).
30. `preflight_v10_03_signal_analysis_inventory.sql` /
    `migrations/026_signal_analysis_persistence.sql` /
    `postflight_v10_03_signal_analysis_invariants.sql` — V10-03 Explanation &
    Business Impact. `signal_analyses` is a brand-new table (real NOT NULL
    FK, no expand/backfill), storing Explanation and Business Impact
    together (spec allows this as one Evidence Domain analysis record) but
    keeping their fields separable in the API/normalize layer. Idempotency
    key (`analysis_key`) is a hash of the Signal's dedup_key + the sorted set
    of cited Evidence ids + generator version, so retries never create
    unbounded duplicate versions — see
    `backend/api/src/Explanation/ExplanationService.php`.
32. `preflight_v10_04_recommendation_inventory.sql` /
    `migrations/027_recommendation_formalization_expand.sql` /
    `postflight_v10_04_recommendation_invariants.sql` — V10-04 Recommendation
    Formalization. Unlike 024-026, this ALTERs the already-live
    `recommendations` table (migrations/011) — nullable expand only,
    following the Workspace-retrofit discipline (see the migration file's own
    header) rather than the "brand-new table" convention, since real rows
    may already exist from live Dashboard/SEO usage. Adds `signal_id` (FK,
    nullable) plus `priority`/`confidence`/`expected_impact`/
    `suggested_action`/`reason`/`generator_type`/`generator_version`/
    `revision`. See `backend/api/src/Dashboard/WorkflowService.php` for how a
    Recommendation becomes signal-backed (`generator_type='backend_rule'`)
    vs. stays on the untouched legacy path (`generator_type='frontend_legacy'`,
    the default for every pre-existing row).
33. `manual_apply_bookkeeping.sql` — **the actual procedure on this hosting
    plan today** (no SSH/cron). Paste each migration into phpMyAdmin by hand,
    then run this file's matching bookkeeping row so `schema_migrations`
    stays accurate. See `VERIFICATION_RUNBOOK.md`.

Back up the database before running the runner for the first time against a
database that isn't already tracked in `schema_migrations`.

## Current hosting reality: no SSH

The production hosting plan (智邦生活館 虛擬主機) has no SSH or cron, so
`bin/migrate.php` cannot actually run there today. **The real operating
procedure is `manual_apply_bookkeeping.sql`**: paste each migration file into
phpMyAdmin by hand, then run that file's matching bookkeeping `INSERT` so
`schema_migrations` stays accurate even though the runner itself never
executes. The runner and the section below are kept as-is — they're correct,
tested-in-design tooling for if SSH/cron is ever enabled or the app moves
host, not dead code.

## Migration runner (requires CLI/SSH — see note above)

```bash
# from backend/api/
php bin/migrate.php status
php bin/migrate.php migrate --executor=<release-or-run-identity>
php bin/migrate.php baseline --executor=<identity> --versions=010,011,012
```

- `status` is read-only and never takes a lock.
- `migrate` acquires a MySQL named lock (`GET_LOCK('hs_schema_migrations', 10)`)
  before touching anything, verifies the checksum of every already-applied
  migration file first (fails closed on any drift), then applies pending
  migrations one at a time in version order. A failed migration stops the
  run immediately; later-numbered migrations are never attempted.
- `baseline` records specific versions as applied **without executing them** —
  use this once, for the versions a database already has from before the
  runner existed (today's pre-launch DB has 010-012 applied by hand). Do not
  use `baseline` to paper over a failed `migrate` run.
- `--executor` is a release/run/operator identity for the audit trail, never
  a database credential. Credentials are only ever read from the environment
  (same `Environment::require(...)` path `ConnectionFactory` already uses),
  never accepted as a CLI argument.
- There is no `--rollback`. MySQL DDL auto-commits, so a failed or unwanted
  migration is recovered by restoring from backup or writing a new
  forward-fixing migration — never by editing an applied file or scripting a
  rollback that DDL can't actually honor.
- Reproducible verification evidence (empty DB, repeat run, checksum
  mismatch, induced failure, concurrent runners, template/review files being
  unreachable, partial-schema rehearsal, and confirmation that the 5
  extracted DDL call sites no longer run at request time) lives under
  `migration-rehearsal/`.

## MySQL 5.6 compatibility

- Structured JSON values are stored in `TEXT`; PHP handles JSON encoding and decoding.
- `si/si_migration_aeo_metric_basis.sql` checks `information_schema` and safely
  skips the change when `basis` already exists.
- Workspace integration index columns are kept below the legacy InnoDB
  767-byte index limit when using `utf8mb4`.
- MySQL 5.6 parses but does not enforce `CHECK` constraints. Application
  validation remains required for SI module values.
