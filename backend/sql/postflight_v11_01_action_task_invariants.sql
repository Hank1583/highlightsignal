-- Read-only. Run after migrations/029 and migrations/030 both apply.

SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'tasks'
  AND COLUMN_NAME IN ('action_id', 'status', 'completion_note');

SELECT TABLE_NAME, CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('actions', 'tasks')
  AND REFERENCED_TABLE_NAME IS NOT NULL
ORDER BY TABLE_NAME, CONSTRAINT_NAME;

-- Every task should have action_id backfilled after migrations/030 -- a
-- nonzero count here means the backfill's assumption didn't hold for some
-- rows (see preflight's tasks_unrecoverable) and needs manual review.
SELECT COUNT(*) AS tasks_missing_action_id FROM tasks WHERE action_id IS NULL;

-- One Action per Decision (the UNIQUE KEY already enforces this at the DB
-- level -- this is a defensive double-check, should always be empty).
SELECT decision_id, COUNT(*) AS action_count
FROM actions
GROUP BY decision_id
HAVING COUNT(*) > 1;

-- Cross-workspace sanity: an Action's workspace_id must match its
-- Recommendation's and its Decision's workspace_id -- a mismatch here would
-- mean a cross-tenant data leak.
SELECT a.id AS action_id, a.workspace_id AS action_workspace, r.workspace_id AS recommendation_workspace, d.workspace_id AS decision_workspace
FROM actions a
INNER JOIN recommendations r ON r.id = a.recommendation_id
INNER JOIN decisions d ON d.id = a.decision_id
WHERE a.workspace_id <> r.workspace_id OR a.workspace_id <> d.workspace_id;

-- Every backfilled Action's Decision must actually be accepted/modified --
-- a rejected/skipped/deferred/needs_more_evidence Decision must NEVER back
-- an Action (the core rule this task enforces).
SELECT a.id AS action_id, d.decision
FROM actions a
INNER JOIN decisions d ON d.id = a.decision_id
WHERE d.decision NOT IN ('accepted', 'modified');

-- Informational: Action/Task status distribution after backfill.
SELECT status, COUNT(*) AS action_count FROM actions GROUP BY status;
SELECT status, COUNT(*) AS task_count FROM tasks GROUP BY status;
