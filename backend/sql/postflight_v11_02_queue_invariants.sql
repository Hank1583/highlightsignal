-- Read-only. Run after migrations/031_queue_worker_reliability_expand.sql.

SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'queue_jobs'
  AND COLUMN_NAME IN ('idempotency_key', 'handler_version');

SELECT INDEX_NAME, NON_UNIQUE, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS indexed_columns
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'queue_jobs'
  AND INDEX_NAME = 'uk_queue_jobs_workspace_idempotency';

-- Defensive: no duplicate (workspace_id, idempotency_key) where the key is
-- actually set.
SELECT workspace_id, idempotency_key, COUNT(*) AS duplicate_count
FROM queue_jobs
WHERE idempotency_key IS NOT NULL
GROUP BY workspace_id, idempotency_key
HAVING COUNT(*) > 1;

-- Informational: no job should stay 'processing' with a stale locked_at
-- forever -- this is only informational since a real stuck job requires a
-- crashed worker, which the postflight run itself cannot simulate; the
-- stuck-recovery mechanism is proven separately in the disposable rehearsal.
SELECT id, public_id, job_type, locked_at, locked_by
FROM queue_jobs
WHERE status = 'processing' AND locked_at < DATE_SUB(NOW(), INTERVAL 10 MINUTE);

SELECT status, COUNT(*) AS job_count FROM queue_jobs GROUP BY status;
