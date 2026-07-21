-- Read-only. Run before migrations/028_decision_formalization_expand.sql.
-- `decisions` already has real rows possible from live usage -- confirm its
-- current shape first, same discipline as preflight_v10_04.

SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'decisions'
ORDER BY ORDINAL_POSITION;

SELECT COUNT(*) AS existing_decision_rows FROM decisions;

-- Confirms no existing decision value would be rejected by (i.e. is outside)
-- the new expanded ENUM -- should always be empty since we're only adding
-- values, never removing, but a cheap defensive check before altering.
SELECT DISTINCT decision FROM decisions
WHERE decision NOT IN ('accepted', 'skipped');
