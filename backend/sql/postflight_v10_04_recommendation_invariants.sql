-- Read-only. Run after migrations/027_recommendation_formalization_expand.sql applies.

-- Structural check: confirms the new FK and column set.
SELECT CONSTRAINT_NAME, TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'recommendations'
  AND REFERENCED_TABLE_NAME IS NOT NULL;

-- Every existing row must have picked up the safe defaults -- no row should
-- ever have a NULL generator_type or revision (both have NOT NULL DEFAULT).
SELECT COUNT(*) AS rows_missing_generator_type
FROM recommendations
WHERE generator_type IS NULL OR revision IS NULL;

-- signal_id, where set, must belong to the SAME workspace as the
-- recommendation itself -- a mismatch would mean a cross-workspace signal
-- got linked, which the Service-level lookup (scoped by the caller's own
-- workspace_id) should make impossible.
SELECT r.id AS recommendation_id, r.workspace_id AS recommendation_workspace_id, s.workspace_id AS signal_workspace_id
FROM recommendations r
INNER JOIN signals s ON s.id = r.signal_id
WHERE r.workspace_id <> s.workspace_id;

-- Informational: how many recommendations are backend-verified (real Signal
-- behind them) vs still legacy frontend-trusted content.
SELECT generator_type, COUNT(*) AS recommendation_count
FROM recommendations
GROUP BY generator_type;
