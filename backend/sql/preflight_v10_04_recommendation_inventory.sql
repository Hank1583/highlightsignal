-- Read-only. Run before migrations/027_recommendation_formalization_expand.sql,
-- and only after migrations/024 (signals) is already applied -- this
-- migration's new FK needs signals.id.
--
-- Unlike 024-026 (brand-new tables), `recommendations` already has real rows
-- from live Dashboard/SEO usage -- confirm its current shape before altering
-- it, same discipline as the V09 Workspace-retrofit preflights.

SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY, COLUMN_DEFAULT
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'recommendations'
ORDER BY ORDINAL_POSITION;

SELECT COUNT(*) AS existing_recommendation_rows FROM recommendations;

SELECT COLUMN_NAME, COLUMN_TYPE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'signals'
  AND COLUMN_NAME = 'id';
