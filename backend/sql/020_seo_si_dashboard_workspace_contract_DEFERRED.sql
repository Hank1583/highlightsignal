-- DRAFTED, NOT APPLIED. Deliberately kept outside backend/sql/migrations/ so
-- the runner cannot pick it up, same as
-- 017_ga_connections_workspace_contract_DEFERRED.sql. Do not move this file
-- into migrations/ until ALL of the following are true and there is written
-- evidence of each:
--
--   1. backend/sql/postflight_v09_04_seo_si_dashboard_workspace_backfill_invariants.sql
--      reports every without_workspace / mapped_to_missing_workspace /
--      mapped_to_inaccessible_workspace count as 0 (or every remaining NULL
--      row has been explicitly, manually resolved -- never auto-guessed).
--   2. Legacy/compatibility tests for every SEO/SI/dashboard-AI/PageSpeed
--      endpoint still pass against the now workspace_id-scoped queries (see
--      si/common.php, si/save_common.php, si/sites/list.php, si/seo/*.php,
--      dashboard/ai_*.php).
--   3. A backup of the real database has been taken AND a restore has
--      actually been rehearsed -- MySQL DDL auto-commits, so these 9 ALTERs
--      cannot be undone by a transaction rollback if something is wrong.
--
-- Once promoted into migrations/ (as the next free version number at that
-- time, re-checksummed by the runner), this drops the "workspace_id can be
-- NULL" escape hatch for good and adds the FK to workspaces(id). user_id
-- itself is intentionally kept for now, same rationale as the GA contract
-- migration ("保留 member_id 到 V1 migration 安全完成").
--
-- Not included here: seo_site_integrations, si_analysis_metrics,
-- si_analysis_items, si_analysis_actions, si_analysis_side_items. They never
-- got a workspace_id column (migrations/018's header explains why), so there
-- is nothing to contract on them.

ALTER TABLE seo_sites
  MODIFY workspace_id BIGINT UNSIGNED NOT NULL,
  ADD CONSTRAINT fk_seo_sites_workspace
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
    ON DELETE RESTRICT;

ALTER TABLE seo_summary_cache
  MODIFY workspace_id BIGINT UNSIGNED NOT NULL,
  ADD CONSTRAINT fk_seo_summary_cache_workspace
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
    ON DELETE RESTRICT;

ALTER TABLE seo_scan_history
  MODIFY workspace_id BIGINT UNSIGNED NOT NULL,
  ADD CONSTRAINT fk_seo_scan_history_workspace
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
    ON DELETE RESTRICT;

ALTER TABLE si_sites
  MODIFY workspace_id BIGINT UNSIGNED NOT NULL,
  ADD CONSTRAINT fk_si_sites_workspace
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
    ON DELETE RESTRICT;

ALTER TABLE si_analysis_runs
  MODIFY workspace_id BIGINT UNSIGNED NOT NULL,
  ADD CONSTRAINT fk_si_analysis_runs_workspace
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
    ON DELETE RESTRICT;

ALTER TABLE dashboard_ai_logs
  MODIFY workspace_id BIGINT UNSIGNED NOT NULL,
  ADD CONSTRAINT fk_dashboard_ai_logs_workspace
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
    ON DELETE RESTRICT;

ALTER TABLE dashboard_ai_plan_logs
  MODIFY workspace_id BIGINT UNSIGNED NOT NULL,
  ADD CONSTRAINT fk_dashboard_ai_plan_logs_workspace
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
    ON DELETE RESTRICT;

ALTER TABLE seo_pagespeed_cache
  MODIFY workspace_id BIGINT UNSIGNED NOT NULL,
  ADD CONSTRAINT fk_seo_pagespeed_cache_workspace
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
    ON DELETE RESTRICT;

ALTER TABLE seo_pagespeed_history
  MODIFY workspace_id BIGINT UNSIGNED NOT NULL,
  ADD CONSTRAINT fk_seo_pagespeed_history_workspace
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
    ON DELETE RESTRICT;
