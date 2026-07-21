-- V09-08 expand phase. Adds workspace_id nullable to ga_report_schedules, the
-- one root table in the "6 GA reporting tables" gap left by V09-03 (see
-- docs/00_V07_TO_V12_PROGRESS_TRACKER.md's V09-05 dated note) -- it has a
-- direct user_id column, same shape as V09-04's root tables. No FK, no NOT
-- NULL -- deliberately additive only, same rule as migrations/015 and 018.
--
-- ga_daily_summary, ga_pages, ga_events, ga_traffic_sources, and
-- ga_conversions are NOT altered here on purpose -- they only carry a
-- connection_id foreign key back to ga_connections (already workspace-scoped
-- and fully backfilled since migrations/015/016) and no user_id of their own,
-- so their ownership is established by joining back to ga_connections, not by
-- adding a column that would just duplicate ga_connections.workspace_id and
-- could drift from it. See backend/sql/preflight_v09_08_ga_reporting_inventory.sql
-- for the query that confirms this root/child classification against the
-- real schema, and the ga/report/ownership.php change (this task) that scopes
-- connection_ids ownership checks by workspace_id on ga_connections directly.
--
-- Verify this specific ALTER on the real MySQL 5.6-compatible target before
-- trusting it: ga_report_schedules is not created by any migration in this
-- repo, so its real column order/engine/index set on this host is not
-- guaranteed to match what backend/api/ga/ga_report_save.php's INSERT implies.

ALTER TABLE ga_report_schedules
  ADD COLUMN workspace_id BIGINT UNSIGNED NULL AFTER user_id,
  ADD KEY idx_ga_report_schedules_workspace (workspace_id, is_active);
