-- Read-only. Run before migrations/032_execution_result_persistence.sql.
-- Confirms `execution_results` doesn't already exist under a conflicting
-- definition, and that its FK targets (tasks, queue_jobs, workspaces) are
-- already in place (tasks needs migrations/011+029/030, queue_jobs needs
-- migrations/010+031).

SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'execution_results';

SELECT
  (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tasks') AS tasks_table_exists,
  (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'queue_jobs') AS queue_jobs_table_exists,
  (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tasks' AND COLUMN_NAME = 'action_id') AS tasks_has_action_id;
