-- Read-only. Run before migrations/025_evidence_persistence.sql.
--
-- Same shape as preflight_v10_01_signal_inventory.sql -- evidence_items and
-- signal_evidence_links are brand-new tables, so this only confirms they
-- don't already exist under a conflicting definition and that both FK
-- targets (workspaces.id, signals.id) are in the expected shape.

SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('evidence_items', 'signal_evidence_links')
ORDER BY TABLE_NAME, ORDINAL_POSITION;

-- Confirms migrations/024 (signals) has already been applied -- this
-- migration's FK to signals(id) will fail at CREATE TABLE time otherwise.
SELECT COLUMN_NAME, COLUMN_TYPE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'signals'
  AND COLUMN_NAME = 'id';

SELECT COLUMN_NAME, COLUMN_TYPE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'workspaces'
  AND COLUMN_NAME = 'id';
