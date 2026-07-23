-- Read-only. Run before migrations/036_audit_log_search_index.sql.
-- V11-07 adds no new table -- `audit_logs` has existed since migrations/010.
-- This confirms the table/columns/existing indexes are exactly what the
-- new index is being added alongside, and inventories every distinct
-- event_type already recorded before the converged naming/writer went live.

SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'audit_logs'
ORDER BY ORDINAL_POSITION;

SELECT INDEX_NAME, COLUMN_NAME, SEQ_IN_INDEX
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'audit_logs'
ORDER BY INDEX_NAME, SEQ_IN_INDEX;

SELECT event_type, COUNT(*) AS c FROM audit_logs GROUP BY event_type ORDER BY c DESC;
SELECT COUNT(*) AS total_rows FROM audit_logs;
