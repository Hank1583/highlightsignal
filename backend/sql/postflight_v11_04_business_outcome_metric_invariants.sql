-- Read-only. Run after migrations/033_business_outcome_metric_persistence.sql.

SELECT TABLE_NAME, CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'business_outcome_metrics'
  AND REFERENCED_TABLE_NAME IS NOT NULL;

-- Cross-workspace sanity: a metric row's workspace_id must match its
-- Action's.
SELECT bom.id, bom.workspace_id AS metric_workspace, a.workspace_id AS action_workspace
FROM business_outcome_metrics bom
INNER JOIN actions a ON a.id = bom.action_id
WHERE bom.workspace_id <> a.workspace_id;

-- 'unavailable'/'awaiting_measurement' rows should never have a non-null
-- actual_value (fail-closed, never a fabricated placeholder value).
SELECT id, status, actual_value FROM business_outcome_metrics
WHERE status IN ('unavailable', 'awaiting_measurement') AND actual_value IS NOT NULL;

-- Confirm the legacy business_outcomes table is completely unaffected by
-- this migration (row count should match the preflight snapshot exactly).
SELECT COUNT(*) AS legacy_business_outcomes_rows_still_here FROM business_outcomes;

SELECT status, outcome_status, COUNT(*) AS metric_count FROM business_outcome_metrics GROUP BY status, outcome_status;
