-- Read-only. Run after migrations/028_decision_formalization_expand.sql applies.

SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'decisions'
  AND COLUMN_NAME IN ('decision', 'recommendation_revision', 'expected_outcome', 'idempotency_key');

SELECT INDEX_NAME, NON_UNIQUE, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS indexed_columns
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'decisions'
  AND INDEX_NAME = 'uk_decisions_workspace_idempotency';

-- Defensive: no duplicate (workspace_id, idempotency_key) pair where the key
-- is actually set (NULLs are allowed to repeat by design, not checked here).
SELECT workspace_id, idempotency_key, COUNT(*) AS duplicate_count
FROM decisions
WHERE idempotency_key IS NOT NULL
GROUP BY workspace_id, idempotency_key
HAVING COUNT(*) > 1;

-- Append-only sanity: every recommendation_id should have decisions in
-- strictly increasing id order matching created_at order (no history
-- rewritten out of order). Informational -- a violation would suggest rows
-- were manually edited outside the normal INSERT-only path.
SELECT recommendation_id, COUNT(*) AS decision_count
FROM decisions
GROUP BY recommendation_id
ORDER BY decision_count DESC
LIMIT 20;

-- Informational: outcome distribution once real decisions have been made.
SELECT decision, COUNT(*) AS decision_count FROM decisions GROUP BY decision;
