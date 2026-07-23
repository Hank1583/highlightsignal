-- Read-only. Run after migrations/034_evaluation_feedback_persistence.sql.

SELECT TABLE_NAME, CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'evaluations'
  AND REFERENCED_TABLE_NAME IS NOT NULL;

-- source='system' rows must never have an actor (no human involved);
-- source='human' rows must always have one -- enforced in code, this is
-- the real invariant check.
SELECT id, source, actor_member_id FROM evaluations
WHERE (source = 'system' AND actor_member_id IS NOT NULL)
   OR (source = 'human' AND actor_member_id IS NULL);

SELECT source, subject_type, COUNT(*) AS row_count FROM evaluations GROUP BY source, subject_type;
