-- Read-only. Run after migrations/032_execution_result_persistence.sql.

SELECT TABLE_NAME, CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'execution_results'
  AND REFERENCED_TABLE_NAME IS NOT NULL;

-- Exactly one of task_id/queue_job_id should be set -- MySQL 5.6 cannot
-- enforce this as a DB constraint (see migration header), so this is the
-- real invariant check. Should always be empty.
SELECT id, task_id, queue_job_id FROM execution_results
WHERE (task_id IS NULL AND queue_job_id IS NULL)
   OR (task_id IS NOT NULL AND queue_job_id IS NOT NULL);

-- Cross-workspace sanity: a Result's workspace_id must match its source's.
SELECT er.id, er.workspace_id AS result_workspace, t.workspace_id AS task_workspace
FROM execution_results er
INNER JOIN tasks t ON t.id = er.task_id
WHERE er.workspace_id <> t.workspace_id;

SELECT er.id, er.workspace_id AS result_workspace, q.workspace_id AS queue_job_workspace
FROM execution_results er
INNER JOIN queue_jobs q ON q.id = er.queue_job_id
WHERE er.workspace_id <> q.workspace_id;

SELECT status, COUNT(*) AS result_count FROM execution_results GROUP BY status;
