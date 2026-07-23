-- Read-only. Run before migrations/034_evaluation_feedback_persistence.sql.
SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'evaluations';
