-- V09-04 expand phase. Adds workspace_id nullable to every SEO / SI (AEO/GEO)
-- / dashboard-AI / PageSpeed table that has a direct user_id column (a
-- "root" table per the task packet's root/child split -- see
-- backend/sql/preflight_v09_04_seo_si_dashboard_inventory.sql for the query
-- that confirms this classification against the real schema). No FK, no NOT
-- NULL -- this is deliberately additive only, same as migrations/015 was for
-- ga_connections. PHP is not switched to read/write these columns until this
-- file AND migrations/019 (backfill) have both been applied and their
-- postflight checks reviewed -- see
-- backend/sql/postflight_v09_04_seo_si_dashboard_workspace_backfill_invariants.sql.
--
-- Child tables (seo_site_integrations, si_analysis_metrics, si_analysis_items,
-- si_analysis_actions, si_analysis_side_items) are NOT altered here on
-- purpose -- they only carry a foreign key back to a root table (site_id or
-- run_id) and no user_id of their own, so their ownership is established by
-- joining back to the now-workspace-scoped root row, not by adding a column
-- that would just duplicate the root's workspace_id and could drift from it.
--
-- Verify every ALTER below against the real schema first (run the preflight
-- file above): seo_sites, seo_site_integrations, seo_summary_cache,
-- seo_scan_history, si_sites, and si_analysis_runs are not created by any
-- migration in this repo (see that file's header for why), so their real
-- column order/engine/index set on this host is not guaranteed to match the
-- historical reference copies this migration was written against
-- (backend/sql/si/si_schema.sql, backend/sql/si/seo_scan_history.sql).
-- dashboard_ai_logs, dashboard_ai_plan_logs, seo_pagespeed_cache, and
-- seo_pagespeed_history ARE tracked (migrations/013) and should match exactly.

ALTER TABLE seo_sites
  ADD COLUMN workspace_id BIGINT UNSIGNED NULL AFTER user_id,
  ADD KEY idx_seo_sites_workspace (workspace_id);

ALTER TABLE seo_summary_cache
  ADD COLUMN workspace_id BIGINT UNSIGNED NULL AFTER user_id,
  ADD KEY idx_seo_summary_cache_workspace (workspace_id, site_id);

ALTER TABLE seo_scan_history
  ADD COLUMN workspace_id BIGINT UNSIGNED NULL AFTER user_id,
  ADD KEY idx_seo_scan_history_workspace (workspace_id, scanned_at);

ALTER TABLE si_sites
  ADD COLUMN workspace_id BIGINT UNSIGNED NULL AFTER user_id,
  ADD KEY idx_si_sites_workspace (workspace_id);

ALTER TABLE si_analysis_runs
  ADD COLUMN workspace_id BIGINT UNSIGNED NULL AFTER user_id,
  ADD KEY idx_si_analysis_runs_workspace (workspace_id, module, tab_key, analyzed_at);

ALTER TABLE dashboard_ai_logs
  ADD COLUMN workspace_id BIGINT UNSIGNED NULL AFTER user_id,
  ADD KEY idx_dashboard_ai_logs_workspace (workspace_id, created_at);

ALTER TABLE dashboard_ai_plan_logs
  ADD COLUMN workspace_id BIGINT UNSIGNED NULL AFTER user_id,
  ADD KEY idx_dashboard_ai_plan_logs_workspace (workspace_id, created_at);

ALTER TABLE seo_pagespeed_cache
  ADD COLUMN workspace_id BIGINT UNSIGNED NULL AFTER user_id,
  ADD KEY idx_seo_pagespeed_cache_workspace (workspace_id, site_id, strategy);

ALTER TABLE seo_pagespeed_history
  ADD COLUMN workspace_id BIGINT UNSIGNED NULL AFTER user_id,
  ADD KEY idx_seo_pagespeed_history_workspace (workspace_id, site_id, strategy, fetched_at);
