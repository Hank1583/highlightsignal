-- Read-only. Run before migrations/033_business_outcome_metric_persistence.sql.
-- Confirms `business_outcome_metrics` doesn't already exist, `actions`
-- already exists (needs migrations/029), and that the LEGACY
-- `business_outcomes` table (migrations/012) is untouched by this task --
-- its row count is recorded here purely for the record, this migration
-- does not read or modify it.

SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'business_outcome_metrics';

SELECT
  (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'actions') AS actions_table_exists,
  (SELECT COUNT(*) FROM business_outcomes) AS legacy_business_outcomes_rows_untouched;
