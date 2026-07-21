-- Read-only. Run after migrations/024_signal_persistence.sql applies.
--
-- Unlike the Workspace-retrofit postflights, `signals` has an enforced
-- NOT NULL + FK from creation, so "row without a workspace" or "row pointing
-- at a nonexistent workspace" are impossible by construction -- MySQL itself
-- rejects such an INSERT. This file instead confirms the table/constraints
-- were created as designed, and gives a few informational queries useful
-- once the SEO detector has actually run.

-- ============================================================
-- 1. Structural check: confirms the table, its FK, and its two unique keys
--    exist as designed. Expect exactly one row for fk_signals_workspace with
--    REFERENCED_TABLE_NAME = 'workspaces'.
-- ============================================================
SELECT CONSTRAINT_NAME, TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'signals'
  AND REFERENCED_TABLE_NAME IS NOT NULL;

SELECT INDEX_NAME, NON_UNIQUE, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS indexed_columns
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'signals'
GROUP BY INDEX_NAME, NON_UNIQUE
ORDER BY INDEX_NAME;

-- ============================================================
-- 2. Defensive invariant (should always be 0 given the FK, included as a
--    cheap sanity check in case the FK was somehow not enforced -- e.g. a
--    hosting plan running with foreign_key_checks disabled by default).
-- ============================================================
SELECT COUNT(*) AS signals_with_missing_workspace
FROM signals s
LEFT JOIN workspaces w ON w.id = s.workspace_id AND w.deleted_at IS NULL
WHERE w.id IS NULL;

-- ============================================================
-- 3. Defensive invariant: uk_signals_workspace_dedup should make this
--    impossible, included as a cheap sanity check.
-- ============================================================
SELECT workspace_id, dedup_key, COUNT(*) AS duplicate_count
FROM signals
GROUP BY workspace_id, dedup_key
HAVING COUNT(*) > 1;

-- ============================================================
-- 4. Informational, once the SEO technical-issue detector has run at least
--    once (via si/seo/summary.php triggering a real scan): a quick summary
--    of what got created, useful for confirming the mandatory verification
--    scenarios (new/resolved/dedup) against real data.
-- ============================================================
SELECT source, status, COUNT(*) AS signal_count, SUM(occurrence_count) AS total_occurrences
FROM signals
GROUP BY source, status
ORDER BY source, status;
