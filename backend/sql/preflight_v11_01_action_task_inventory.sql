-- Read-only. Run before migrations/029_action_manual_task_lifecycle.sql.
-- Confirms `actions` doesn't already exist under a conflicting definition,
-- and inventories the CURRENT shape/data of `tasks` since it already has
-- real rows (this is an expand on a live table, same discipline as 027/028).

SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('tasks', 'actions')
ORDER BY TABLE_NAME, ORDINAL_POSITION;

SELECT COUNT(*) AS existing_task_rows FROM tasks;

-- Confirms no existing task.status value would be rejected by the widened
-- ENUM -- should always be empty since we're only adding 'blocked', never
-- removing a value.
SELECT DISTINCT status FROM tasks
WHERE status NOT IN ('pending', 'in_progress', 'completed', 'cancelled');

-- How many existing tasks the backfill migration (030) expects to be able
-- to recover an authorizing accepted/modified Decision for. A nonzero
-- "unrecoverable" count here means migrations/030's assumption doesn't hold
-- for this data and needs manual review before relying on the backfill.
SELECT
  (SELECT COUNT(*) FROM tasks) AS total_tasks,
  (
    SELECT COUNT(*) FROM tasks t
    WHERE EXISTS (
      SELECT 1 FROM decisions d
      WHERE d.recommendation_id = t.recommendation_id
        AND d.decision IN ('accepted', 'modified')
    )
  ) AS tasks_with_recoverable_decision,
  (
    SELECT COUNT(*) FROM tasks t
    WHERE NOT EXISTS (
      SELECT 1 FROM decisions d
      WHERE d.recommendation_id = t.recommendation_id
        AND d.decision IN ('accepted', 'modified')
    )
  ) AS tasks_unrecoverable;
