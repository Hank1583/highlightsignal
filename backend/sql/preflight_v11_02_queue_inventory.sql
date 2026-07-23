-- Read-only. Run before migrations/031_queue_worker_reliability_expand.sql.
-- `queue_jobs` has existed since migrations/010 but no application code has
-- ever written to it (confirmed by grep) -- still following expand
-- discipline in case a manual/experimental row exists on the real host.

SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'queue_jobs'
ORDER BY ORDINAL_POSITION;

SELECT COUNT(*) AS existing_queue_job_rows FROM queue_jobs;
SELECT status, COUNT(*) AS job_count FROM queue_jobs GROUP BY status;
