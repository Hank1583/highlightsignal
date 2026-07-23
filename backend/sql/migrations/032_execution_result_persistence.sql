-- V11-03: Execution Result. Brand-new table, same rule as signals/
-- evidence_items/actions (migrations/024/025/029): real FKs from creation,
-- no expand/backfill/deferred-contract phases.
--
--   * Exactly ONE of `task_id`/`queue_job_id` must be set, never both,
--     never neither -- this is the "supports Task OR Queue Job as source"
--     requirement. MySQL 5.6 parses but does NOT enforce CHECK constraints
--     (silently ignored until 8.0.16), so this is enforced in
--     ExecutionResultService, not the database -- documented here so it is
--     not mistaken for a real constraint.
--   * `UNIQUE(task_id, attempt)` / `UNIQUE(queue_job_id, attempt)`: the
--     source's own `attempt` number IS the natural idempotency key -- no
--     separate idempotency_key column needed. Re-recording the same
--     attempt for the same source is a duplicate, caught by these keys
--     (both are nullable-safe: MySQL allows unlimited NULLs in a unique
--     key, so a Task-sourced row's null queue_job_id never collides with
--     another Task-sourced row's null queue_job_id, and vice versa).
--   * `output_summary`/`error_message` are size-limited and redacted by
--     ExecutionResultService BEFORE being persisted here (never raw,
--     unbounded handler output) -- `output_reference` is where a large or
--     sensitive output's real location goes instead (an external artifact
--     reference, e.g. a storage path/URL -- this task does not build an
--     artifact storage system, only the reference field for one to plug
--     into later).
--   * No column here computes or implies Business Outcome -- "the task
--     completed successfully" and "it actually worked" are deliberately
--     different questions (V11-04's job).

CREATE TABLE IF NOT EXISTS execution_results (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id CHAR(36) NOT NULL,
  workspace_id BIGINT UNSIGNED NOT NULL,
  task_id BIGINT UNSIGNED NULL,
  queue_job_id BIGINT UNSIGNED NULL,
  status ENUM('success', 'failure') NOT NULL,
  attempt INT UNSIGNED NOT NULL DEFAULT 1,
  started_at DATETIME NOT NULL,
  completed_at DATETIME NOT NULL,
  duration_ms INT UNSIGNED NOT NULL,
  output_summary TEXT NULL,
  output_reference VARCHAR(500) NULL,
  error_code VARCHAR(100) NULL,
  error_message TEXT NULL,
  handler_version VARCHAR(50) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_execution_results_public_id (public_id),
  UNIQUE KEY uk_execution_results_task_attempt (task_id, attempt),
  UNIQUE KEY uk_execution_results_queue_job_attempt (queue_job_id, attempt),
  KEY idx_execution_results_workspace_status (workspace_id, status, completed_at),
  CONSTRAINT fk_execution_results_workspace
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_execution_results_task
    FOREIGN KEY (task_id) REFERENCES tasks(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_execution_results_queue_job
    FOREIGN KEY (queue_job_id) REFERENCES queue_jobs(id)
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
