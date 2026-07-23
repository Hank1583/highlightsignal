-- Read-only. Run before migrations/037_retention_cleanup_runs.sql.
SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'retention_cleanup_runs';

-- Confirms the tables this task's cleanup jobs touch already exist with
-- the columns the eligibility queries depend on (updated_at on queue_jobs,
-- created_at on execution_results, read_at/dismissed_at on notifications).
SELECT
  (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'service_request_nonces') AS nonces_table_exists,
  (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'queue_jobs') AS queue_jobs_table_exists,
  (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'execution_results') AS execution_results_table_exists,
  (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications') AS notifications_table_exists;

-- Baseline row counts before any cleanup job ever runs on this host.
SELECT 'service_request_nonces' AS data_class, COUNT(*) AS c FROM service_request_nonces
UNION ALL SELECT 'queue_jobs', COUNT(*) FROM queue_jobs
UNION ALL SELECT 'execution_results', COUNT(*) FROM execution_results
UNION ALL SELECT 'notifications', COUNT(*) FROM notifications;
