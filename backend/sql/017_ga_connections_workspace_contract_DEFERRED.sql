-- DRAFTED, NOT APPLIED. Deliberately kept outside backend/sql/migrations/ so
-- the runner cannot pick it up. Do not move this file into migrations/ until
-- ALL of the following are true and there is written evidence of each:
--
--   1. backend/sql/postflight_ga_workspace_backfill_invariants.sql reports
--      connections_without_workspace = 0 (or every remaining NULL row has
--      been explicitly, manually resolved -- never auto-guessed).
--   2. Legacy/compatibility tests for GA list/sync/report still pass against
--      the now-direct workspace_id-scoped queries (see
--      GaIntegrationRepository).
--   3. A backup of the real database has been taken AND a restore has
--      actually been rehearsed -- MySQL DDL auto-commits, so this ALTER
--      cannot be undone by a transaction rollback if something is wrong.
--
-- Once promoted into migrations/ (as the next free version number at that
-- time, re-checksummed by the runner), this drops the owner_member_id
-- join-fake path for good -- member_id itself is intentionally kept for now
-- (see the tracker: "保留 member_id 到 V1 migration 安全完成").

ALTER TABLE ga_connections
  MODIFY workspace_id BIGINT UNSIGNED NOT NULL,
  ADD CONSTRAINT fk_ga_connections_workspace
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
    ON DELETE RESTRICT;
