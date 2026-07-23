-- Read-only. Run after migrations/037_retention_cleanup_runs.sql.

SELECT TABLE_NAME, CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'retention_cleanup_runs'
  AND REFERENCED_TABLE_NAME IS NOT NULL;

-- Every non-NULL workspace_id must resolve to a real workspace (defensive
-- double-check; the FK already enforces this going forward).
SELECT r.workspace_id, COUNT(*) AS c
FROM retention_cleanup_runs r
LEFT JOIN workspaces w ON w.id = r.workspace_id
WHERE r.workspace_id IS NOT NULL AND w.id IS NULL
GROUP BY r.workspace_id;

-- No cleanup run should ever show deleted_count > matched_count (would mean
-- more rows were removed than were ever found eligible).
SELECT * FROM retention_cleanup_runs WHERE deleted_count > matched_count;

-- A dry_run row must NEVER show deleted_count > 0 -- the one invariant that
-- most directly proves "dry-run never actually deletes."
SELECT * FROM retention_cleanup_runs WHERE mode = 'dry_run' AND deleted_count > 0;

SELECT data_class, mode, status, COUNT(*) AS c FROM retention_cleanup_runs GROUP BY data_class, mode, status;
