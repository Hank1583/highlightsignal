-- V09-03 expand phase. Adds workspace_id nullable, no FK yet -- this is
-- deliberately additive only. GaIntegrationRepository still has to keep
-- working against `owner_member_id`-joined rows until 016's backfill runs,
-- so nothing here is allowed to be NOT NULL or have a foreign key.
--
-- Verify this specific ALTER on the real MySQL 5.6-compatible target before
-- trusting it: 5.6's online-DDL (ALGORITHM=INPLACE) support for ADD COLUMN
-- is far more limited than 8.0's instant add, and behavior should be checked
-- against the real table's size/engine, not assumed from this file alone.

ALTER TABLE ga_connections
  ADD COLUMN workspace_id BIGINT UNSIGNED NULL AFTER member_id,
  ADD KEY idx_ga_connections_workspace (workspace_id, status, created_at);
