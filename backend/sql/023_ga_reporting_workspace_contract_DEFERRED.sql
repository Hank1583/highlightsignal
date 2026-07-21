-- DRAFTED, NOT APPLIED. Deliberately kept outside backend/sql/migrations/ so
-- the runner cannot pick it up. Do not move this file into migrations/ until
-- ALL of the following are true and there is written evidence of each --
-- same gate as 017 (GA connections) and 020 (SEO/SI):
--
--   1. backend/sql/postflight_v09_08_ga_reporting_workspace_backfill_invariants.sql
--      reports without_workspace = 0 for ga_report_schedules (or every
--      remaining NULL row has been explicitly, manually resolved -- never
--      auto-guessed), and the schedule/connection cross-workspace leakage
--      check in that same file returns zero rows.
--   2. Legacy/compatibility tests for GA report list/detail/save/update/sync
--      still pass against the now workspace_id-scoped queries.
--   3. A backup of the real database has been taken AND a restore has
--      actually been rehearsed -- MySQL DDL auto-commits, so this ALTER
--      cannot be undone by a transaction rollback if something is wrong.
--
-- Once promoted into migrations/ (as the next free version number at that
-- time, re-checksummed by the runner), this makes ga_report_schedules.user_id
-- itself no longer the tenant boundary -- user_id is intentionally kept for
-- now (same reasoning as ga_connections.member_id: see the tracker).

ALTER TABLE ga_report_schedules
  MODIFY workspace_id BIGINT UNSIGNED NOT NULL,
  ADD CONSTRAINT fk_ga_report_schedules_workspace
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
    ON DELETE RESTRICT;
