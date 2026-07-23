-- V11-01 backfill: create one `actions` row for every PRE-EXISTING `tasks`
-- row (created before this migration, via the old recommendation_id-only
-- path), then point `tasks.action_id` at it.
--
-- The authorizing Decision for an old task is recovered the same way
-- WorkflowService::mutate()'s create_task action has always created one:
-- an implicit 'accepted' Decision recorded in the SAME request as the Task
-- (see WorkflowRepository::recordDecision() called from the create_task
-- branch, unchanged since V10-05). The EARLIEST accepted/modified Decision
-- for that Recommendation is used -- for a task, that is necessarily the
-- one that authorized its creation, since Decisions are append-only and
-- ordered by id.
--
-- Idempotent and safe to re-run: every INSERT is NOT EXISTS-guarded against
-- an Action already existing for that decision_id, and the UPDATE only
-- touches rows where action_id IS NULL.
--
-- Known, accepted gap (flagged by postflight, not silently guessed here): a
-- task whose recommendation has NO accepted/modified decision at all should
-- not exist given how create_task has always worked -- if postflight finds
-- one, it means the data doesn't match this migration's assumption and
-- needs manual review, not a fabricated backfill.

INSERT INTO actions (public_id, workspace_id, recommendation_id, decision_id, intent, status, authorized_by_member_id, revision, created_at, updated_at)
SELECT
  UUID(),
  t.workspace_id,
  t.recommendation_id,
  firstdec.decision_id,
  t.title,
  CASE t.status
    WHEN 'completed' THEN 'completed'
    WHEN 'cancelled' THEN 'cancelled'
    ELSE 'in_progress'
  END,
  d.actor_member_id,
  1,
  t.created_at,
  t.updated_at
FROM tasks t
INNER JOIN (
  SELECT recommendation_id, MIN(id) AS decision_id
  FROM decisions
  WHERE decision IN ('accepted', 'modified')
  GROUP BY recommendation_id
) firstdec ON firstdec.recommendation_id = t.recommendation_id
INNER JOIN decisions d ON d.id = firstdec.decision_id
WHERE t.action_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM actions a WHERE a.decision_id = firstdec.decision_id
  );

UPDATE tasks t
INNER JOIN actions a ON a.recommendation_id = t.recommendation_id
SET t.action_id = a.id
WHERE t.action_id IS NULL;
