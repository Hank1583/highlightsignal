-- Manual-apply bookkeeping for phpMyAdmin ("MySQL資料庫設定").
--
-- This host's hosting plan (智邦生活館 虛擬主機) has no SSH/cron, so
-- backend/api/bin/migrate.php cannot run here. This file is the paper trail
-- instead: every migration is pasted into phpMyAdmin's SQL tab by hand, then
-- its matching bookkeeping row here records what/when/checksum, so the
-- schema_migrations table stays an honest audit log even without the runner.
-- If SSH or a cron/scheduled-task feature is ever enabled later, `php
-- bin/migrate.php status` will read these rows correctly and recognize them
-- as already applied (checksums below match the files as of this writing --
-- if a migration file changes after you've already applied it, do not reuse
-- its old checksum row).
--
-- Before running any INSERT below: replace REPLACE_WITH_YOUR_NAME with your
-- own name/identity (kept out of git history as an actual name on purpose --
-- fill it in locally in phpMyAdmin, don't commit a real name into this file).
--
-- ============================================================
-- Step 0: run once. Creates the bookkeeping table itself.
-- ============================================================

CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(20) NOT NULL,
  name VARCHAR(190) NOT NULL,
  checksum CHAR(64) NOT NULL,
  applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  duration_ms INT UNSIGNED NOT NULL,
  executor VARCHAR(150) NOT NULL,
  PRIMARY KEY (version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Step 1: 010-012 were already applied by hand before this tracking existed
-- (confirmed in the tracker's earlier DB smoke tests). Record them as
-- baselined -- do NOT re-run their CREATE TABLE statements.
-- ============================================================

INSERT INTO schema_migrations (version, name, checksum, duration_ms, executor) VALUES
  ('010', '010_v1_foundation.sql', 'b7230b34709775d3f5fb34ec269b01563a499998f70ce112be1c86b222c5349f', 0, 'REPLACE_WITH_YOUR_NAME'),
  ('011', '011_dashboard_decision_workflow.sql', '52b0f0ec78d854a721dea29228df97b218062716cbaebb5eb02806eeb2b53fb0', 0, 'REPLACE_WITH_YOUR_NAME'),
  ('012', '012_business_outcomes.sql', 'd25b67481d4ef5e8d3624eedb679ae879d01111ef631887adb38f153af70d864', 0, 'REPLACE_WITH_YOUR_NAME')
ON DUPLICATE KEY UPDATE version = version;

-- ============================================================
-- Step 2: open backend/sql/migrations/013_runtime_ddl_extraction.sql,
-- paste its FULL content into phpMyAdmin's SQL tab and run it first.
-- Only after it succeeds, run the bookkeeping row below.
-- ============================================================

INSERT INTO schema_migrations (version, name, checksum, duration_ms, executor) VALUES
  ('013', '013_runtime_ddl_extraction.sql', '40f897ba5935f59291b87f15bc1b2ca3bcf9906e9b56498222125078d9c5137c', 0, 'REPLACE_WITH_YOUR_NAME')
ON DUPLICATE KEY UPDATE version = version;

-- ============================================================
-- Step 3 (V09-02): FIRST review the owner-candidate counts from the new
-- queries at the end of backend/sql/000_preflight_inventory.sql against
-- real data. Only then open backend/sql/migrations/014_workspace_owner_backfill.sql,
-- paste and run it, then run the bookkeeping row below. Afterward, run
-- backend/sql/postflight_workspace_backfill_invariants.sql and confirm
-- every count is 0 (or explicitly understood as an anomaly to review).
-- ============================================================

INSERT INTO schema_migrations (version, name, checksum, duration_ms, executor) VALUES
  ('014', '014_workspace_owner_backfill.sql', '7dc43fa61cfba938853d186985747f3362483334718a837d66070180db231c2b', 0, 'REPLACE_WITH_YOUR_NAME')
ON DUPLICATE KEY UPDATE version = version;

-- ============================================================
-- Step 4 (V09-03 expand): open
-- backend/sql/migrations/015_ga_connections_workspace_expand.sql, paste and
-- run it. Confirm via phpMyAdmin's table structure view that ga_connections
-- now has a nullable workspace_id column and the new index, then run the
-- bookkeeping row below.
-- ============================================================

INSERT INTO schema_migrations (version, name, checksum, duration_ms, executor) VALUES
  ('015', '015_ga_connections_workspace_expand.sql', '5e76549d98c248f56f00e9bf842c44c29c8b271b715661d65df9989336a873f2', 0, 'REPLACE_WITH_YOUR_NAME')
ON DUPLICATE KEY UPDATE version = version;

-- ============================================================
-- Step 5 (V09-03 backfill): open
-- backend/sql/migrations/016_ga_connections_workspace_backfill.sql, paste
-- and run it, then run the bookkeeping row below. Afterward, run
-- backend/sql/postflight_ga_workspace_backfill_invariants.sql and confirm
-- connections_without_workspace / connections_with_missing_workspace /
-- connections_mapped_to_inaccessible_workspace are all 0.
-- ============================================================

INSERT INTO schema_migrations (version, name, checksum, duration_ms, executor) VALUES
  ('016', '016_ga_connections_workspace_backfill.sql', '8511bda717f319d110c5c04de29302e6974a610a4475a36a3195d7bd352cc3b7', 0, 'REPLACE_WITH_YOUR_NAME')
ON DUPLICATE KEY UPDATE version = version;

-- Do NOT add a row for 017_ga_connections_workspace_contract_DEFERRED.sql.
-- It is not a migration yet -- see that file's own header for its gate
-- conditions (all postflight counts 0, compatibility tests pass, backup
-- restore rehearsed).

-- ============================================================
-- Step 6 (V09-04 expand): FIRST run
-- backend/sql/preflight_v09_04_seo_si_dashboard_inventory.sql and compare its
-- real output against the assumptions written into migrations/018's header
-- (seo_sites, seo_site_integrations, seo_summary_cache, seo_scan_history,
-- si_sites, and si_analysis_runs are not created by any migration in this
-- repo, so their real schema on this host is unverified until that query
-- runs). Only then open
-- backend/sql/migrations/018_seo_si_dashboard_workspace_expand.sql, paste and
-- run it. Confirm via phpMyAdmin's table structure view that all 9 tables
-- now have a nullable workspace_id column and the new index, then run the
-- bookkeeping row below.
-- ============================================================

INSERT INTO schema_migrations (version, name, checksum, duration_ms, executor) VALUES
  ('018', '018_seo_si_dashboard_workspace_expand.sql', '53ee3029e37627d28e5368ff8a401a09bb1f9be5b2714755a2917aa6536ef512', 0, 'REPLACE_WITH_YOUR_NAME')
ON DUPLICATE KEY UPDATE version = version;

-- ============================================================
-- Step 7 (V09-04 backfill): open
-- backend/sql/migrations/019_seo_si_dashboard_workspace_backfill.sql, paste
-- and run it, then run the bookkeeping row below. Afterward, run
-- backend/sql/postflight_v09_04_seo_si_dashboard_workspace_backfill_invariants.sql
-- and confirm every without_workspace / mapped_to_missing_workspace /
-- mapped_to_inaccessible_workspace count is 0 (or an explicitly reviewed
-- anomaly). Do NOT upload the PHP changes in this batch (si/common.php,
-- si/save_common.php, si/generate_common.php, si/sites/list.php,
-- si/seo/*.php, dashboard/ai_*.php, legacy_auth.php, api_helpers.php) to
-- production before this step's postflight has been reviewed -- those files
-- assume workspace_id is already backfilled and will 500 or silently return
-- empty lists if it isn't.
-- ============================================================

INSERT INTO schema_migrations (version, name, checksum, duration_ms, executor) VALUES
  ('019', '019_seo_si_dashboard_workspace_backfill.sql', '72a98d548b3038dfc3ecec9e5f537005443d20b7c2ddac3d1c29392963a102fb', 0, 'REPLACE_WITH_YOUR_NAME')
ON DUPLICATE KEY UPDATE version = version;

-- Do NOT add a row for 020_seo_si_dashboard_workspace_contract_DEFERRED.sql.
-- It is not a migration yet -- see that file's own header for its gate
-- conditions (all postflight counts 0, compatibility tests pass, backup
-- restore rehearsed), same rule as 017.

-- ============================================================
-- Step 8 (V09-08 expand): FIRST run
-- backend/sql/preflight_v09_08_ga_reporting_inventory.sql and compare its
-- real output against the assumptions written into migrations/021's header
-- (ga_report_schedules, ga_daily_summary, ga_pages, ga_events,
-- ga_traffic_sources, and ga_conversions are not created by any migration in
-- this repo, so their real schema on this host is unverified until that
-- query runs -- also confirms ga_connections.workspace_id is still fully
-- backfilled right now, since the 5 child tables depend entirely on that).
-- Only then open backend/sql/migrations/021_ga_reporting_workspace_expand.sql,
-- paste and run it. Confirm via phpMyAdmin's table structure view that
-- ga_report_schedules now has a nullable workspace_id column and the new
-- index, then run the bookkeeping row below.
-- ============================================================

INSERT INTO schema_migrations (version, name, checksum, duration_ms, executor) VALUES
  ('021', '021_ga_reporting_workspace_expand.sql', '0c337f5b1136c49d81de6932528241a7f1725c5027d1b564a4e076f58fe8d4c2', 0, 'REPLACE_WITH_YOUR_NAME')
ON DUPLICATE KEY UPDATE version = version;

-- ============================================================
-- Step 9 (V09-08 backfill): open
-- backend/sql/migrations/022_ga_reporting_workspace_backfill.sql, paste and
-- run it, then run the bookkeeping row below. Afterward, run
-- backend/sql/postflight_v09_08_ga_reporting_workspace_backfill_invariants.sql
-- and confirm every without_workspace / mapped_to_missing_workspace /
-- mapped_to_inaccessible_workspace count is 0 (or an explicitly reviewed
-- anomaly), the child-table sanity join (section 5) is 0, and the
-- schedule/connection cross-workspace leakage check (section 6) returns zero
-- rows. Do NOT upload the PHP changes in this batch (ga_report_list.php,
-- ga_report_detail.php, ga_report_save.php, ga_report_update.php,
-- data_sync.php, get_query.php, ga/ownership.php, ga/report/report_excel.php,
-- ga/report/report_mailer.php) to production before this step's postflight
-- has been reviewed -- those files assume ga_report_schedules.workspace_id is
-- already backfilled and will 500 or fail closed on every request otherwise.
-- ============================================================

INSERT INTO schema_migrations (version, name, checksum, duration_ms, executor) VALUES
  ('022', '022_ga_reporting_workspace_backfill.sql', 'f941de09da3146a381844799610a6087abf8182aa85869a2c94d6fcf439c3424', 0, 'REPLACE_WITH_YOUR_NAME')
ON DUPLICATE KEY UPDATE version = version;

-- Do NOT add a row for 023_ga_reporting_workspace_contract_DEFERRED.sql.
-- It is not a migration yet -- see that file's own header for its gate
-- conditions (all postflight counts 0, compatibility tests pass, backup
-- restore rehearsed), same rule as 017/020.

-- ============================================================
-- Step 10 (V10-01): FIRST run
-- backend/sql/preflight_v10_01_signal_inventory.sql (confirms `signals`
-- doesn't already exist and that seo_scan_history/seo_sites still have
-- workspace_id). Only then open
-- backend/sql/migrations/024_signal_persistence.sql, paste and run it.
-- Unlike every migration above, this is a brand-new table with a real
-- NOT NULL FK to workspaces(id) from the start -- no expand/backfill/
-- deferred-contract phases needed, since there is no existing data to be
-- compatible with. Confirm via phpMyAdmin's table structure view that
-- `signals` was created with its FK and two unique keys, then run the
-- bookkeeping row below.
-- ============================================================

INSERT INTO schema_migrations (version, name, checksum, duration_ms, executor) VALUES
  ('024', '024_signal_persistence.sql', '2156bd7ba5581977c4fd61dd2a4b338526553f57ee3f7d3e14bfd295b2bc4bd6', 0, 'REPLACE_WITH_YOUR_NAME')
ON DUPLICATE KEY UPDATE version = version;

-- Afterward, run backend/sql/postflight_v10_01_signal_invariants.sql to
-- confirm the FK/unique-key structure. Do NOT upload the PHP changes in this
-- batch (backend/api/src/Signal/**, backend/api/public/index.php,
-- backend/api/si/seo/summary.php) to production before this migration has
-- been applied -- si/seo/summary.php's new Signal-detection call will fail
-- (caught and logged, not fatal to the SEO scan response itself -- see that
-- file's try/catch) on every scan until the `signals` table exists.

-- ============================================================
-- Step 11 (V10-02): FIRST run
-- backend/sql/preflight_v10_02_evidence_inventory.sql (confirms
-- evidence_items/signal_evidence_links don't already exist, and that
-- migrations/024 -- signals -- is already applied, since this migration's
-- FK needs signals.id to exist). Only then open
-- backend/sql/migrations/025_evidence_persistence.sql, paste and run it.
-- Same as 024: brand-new tables, real NOT NULL FKs from the start, no
-- expand/backfill phases. Confirm via phpMyAdmin's table structure view that
-- both tables and all 4 FKs (evidence_items -> workspaces;
-- signal_evidence_links -> workspaces/signals/evidence_items) were created,
-- then run the bookkeeping row below.
-- ============================================================

INSERT INTO schema_migrations (version, name, checksum, duration_ms, executor) VALUES
  ('025', '025_evidence_persistence.sql', '4b4a2ddcaabdc7dc8201bae793710df998d5b498d745dcc8adf14ca7bb327e4c', 0, 'REPLACE_WITH_YOUR_NAME')
ON DUPLICATE KEY UPDATE version = version;

-- Afterward, run backend/sql/postflight_v10_02_evidence_invariants.sql. Do
-- NOT upload the PHP changes in this batch (backend/api/src/Evidence/**,
-- backend/api/public/index.php, backend/api/si/seo/summary.php) to
-- production before this migration has been applied -- summary.php's new
-- Evidence-recording call will fail (caught and logged, not fatal -- see
-- that file's try/catch) on every scan until both `signals` (024) and
-- `evidence_items`/`signal_evidence_links` (025) exist.

-- ============================================================
-- Step 12 (V10-03): FIRST run
-- backend/sql/preflight_v10_03_signal_analysis_inventory.sql (confirms
-- migrations/024 is applied, since this migration's FK needs signals.id).
-- Only then open backend/sql/migrations/026_signal_analysis_persistence.sql,
-- paste and run it. Brand-new table, real NOT NULL FKs from the start.
-- ============================================================

INSERT INTO schema_migrations (version, name, checksum, duration_ms, executor) VALUES
  ('026', '026_signal_analysis_persistence.sql', 'bb2a1b191dd20d0cc13299f38c224363635928a7c1c598c1649a83aa44531701', 0, 'REPLACE_WITH_YOUR_NAME')
ON DUPLICATE KEY UPDATE version = version;

-- Afterward run backend/sql/postflight_v10_03_signal_analysis_invariants.sql.
-- Do NOT upload backend/api/src/Explanation/**/public/index.php/
-- si/seo/summary.php changes before this migration is applied.

-- ============================================================
-- Step 13 (V10-04): FIRST run
-- backend/sql/preflight_v10_04_recommendation_inventory.sql (confirms the
-- CURRENT shape of the already-live `recommendations` table and that
-- migrations/024 is applied, since the new FK needs signals.id). Only then
-- open backend/sql/migrations/027_recommendation_formalization_expand.sql,
-- paste and run it. Nullable expand only -- every existing row keeps
-- working, `generator_type` defaults to 'frontend_legacy' for them.
-- ============================================================

INSERT INTO schema_migrations (version, name, checksum, duration_ms, executor) VALUES
  ('027', '027_recommendation_formalization_expand.sql', 'f215e22886edeca64131fc5a9b5ef1ce044078ef295b154c50274c1ec8dd0377', 0, 'REPLACE_WITH_YOUR_NAME')
ON DUPLICATE KEY UPDATE version = version;

-- Afterward run backend/sql/postflight_v10_04_recommendation_invariants.sql.
-- Do NOT upload backend/api/src/Dashboard/WorkflowRepository.php/
-- WorkflowService.php/public/index.php/app/(app)/seo/page.tsx changes before
-- this migration is applied -- WorkflowService now queries the new columns
-- unconditionally.

-- ============================================================
-- After all of the above: run `SELECT * FROM schema_migrations ORDER BY version;`
-- and confirm all 15 rows (010-016, 018-019, 021-022, 024-027) are present
-- with the checksums shown here.
-- ============================================================
