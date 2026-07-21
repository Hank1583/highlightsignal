-- Read-only. Run before migrations/026_signal_analysis_persistence.sql, and
-- only after migrations/024 (signals) is already applied -- this migration's
-- FK needs signals.id.

SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'signal_analyses'
ORDER BY ORDINAL_POSITION;

SELECT COLUMN_NAME, COLUMN_TYPE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'signals'
  AND COLUMN_NAME = 'id';
