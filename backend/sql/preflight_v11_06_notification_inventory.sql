-- Read-only. Run before migrations/035_notification_persistence.sql.
SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('notifications', 'notification_preferences', 'notification_deliveries');

SELECT
  (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'queue_jobs') AS queue_jobs_table_exists;
