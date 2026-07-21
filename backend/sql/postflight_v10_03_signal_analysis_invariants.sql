-- Read-only. Run after migrations/026_signal_analysis_persistence.sql applies.

SELECT CONSTRAINT_NAME, TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'signal_analyses'
  AND REFERENCED_TABLE_NAME IS NOT NULL;

SELECT COUNT(*) AS analyses_with_missing_workspace
FROM signal_analyses a
LEFT JOIN workspaces w ON w.id = a.workspace_id AND w.deleted_at IS NULL
WHERE w.id IS NULL;

SELECT workspace_id, analysis_key, COUNT(*) AS duplicate_count
FROM signal_analyses
GROUP BY workspace_id, analysis_key
HAVING COUNT(*) > 1;

-- Every analysis's signal_id should belong to the SAME workspace as the
-- analysis row itself.
SELECT a.id AS analysis_id, a.workspace_id AS analysis_workspace_id, s.workspace_id AS signal_workspace_id
FROM signal_analyses a
INNER JOIN signals s ON s.id = a.signal_id
WHERE a.workspace_id <> s.workspace_id;

-- Fail-closed states must never carry fabricated content.
SELECT id, status
FROM signal_analyses
WHERE status IN ('insufficient_evidence', 'failed')
  AND (explanation_text IS NOT NULL OR impact_direction NOT IN ('unknown'));

-- Informational: coverage once the SEO generator has actually run.
SELECT status, generator_type, COUNT(*) AS analysis_count
FROM signal_analyses
GROUP BY status, generator_type
ORDER BY status, generator_type;
