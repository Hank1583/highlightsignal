-- V11-08: Retention, Cleanup & Backup Jobs. One brand-new table -- the
-- operational ledger for every retention/cleanup batch this task's
-- `RetentionCleanupService` runs, real FK from creation.
--
-- Design decisions:
--   * `workspace_id` is NULLABLE on purpose. Some data classes this task
--     cleans up are workspace-scoped (`queue_jobs`, `execution_results`,
--     `notifications`) and get one row per run; others are genuinely
--     workspace-agnostic (`service_request_nonces` has no workspace_id
--     column at all -- it protects the signed-request/OAuth-state layer,
--     not any one workspace's data) and get workspace_id=NULL. For the
--     workspace-scoped classes, a single batch can span multiple
--     workspaces (the cleanup query is NOT grouped by workspace for
--     efficiency) -- this row is the OVERALL batch's ledger entry;
--     `audit_logs` additionally gets one row PER DISTINCT workspace found
--     in that batch (see RetentionCleanupService), giving workspace
--     owners/admins visibility into cleanup activity affecting their own
--     data via the existing V11-07 audit read API, without audit_logs
--     ever needing a nullable workspace_id (its FK stays NOT NULL).
--   * `mode` (`dry_run`/`delete`) is a real, persisted distinction -- the
--     task packet's mandatory verification ("Dry-run 與實際小批次結果
--     一致") is checkable after the fact by comparing two runs' rows, not
--     just trusted from the moment it ran.
--   * `has_more` supports the batch+re-enqueue pattern: one queue job
--     invocation processes exactly one bounded batch (rate limit) and, if
--     more eligible rows remain, the job handler re-enqueues itself --
--     the SAME idempotent "delete whatever currently matches the
--     eligibility WHERE clause" query is safe to run again on retry or
--     resume, so no separate checkpoint cursor is needed (see task
--     packet's "Job 中斷/重跑不重複刪除或跳過資料" -- re-running a batch
--     that already deleted its rows just matches zero rows the second
--     time, not a duplicate delete).
--   * No FK from anywhere else INTO this table -- it is a pure append-only
--     observability record, never joined by application logic.

CREATE TABLE IF NOT EXISTS retention_cleanup_runs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id CHAR(36) NOT NULL,
  data_class VARCHAR(100) NOT NULL,
  workspace_id BIGINT UNSIGNED NULL,
  mode ENUM('dry_run', 'delete') NOT NULL,
  matched_count INT UNSIGNED NOT NULL DEFAULT 0,
  deleted_count INT UNSIGNED NOT NULL DEFAULT 0,
  has_more TINYINT(1) NOT NULL DEFAULT 0,
  status ENUM('completed', 'failed') NOT NULL DEFAULT 'completed',
  error_message TEXT NULL,
  started_at DATETIME NOT NULL,
  completed_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_retention_cleanup_runs_public_id (public_id),
  KEY idx_retention_cleanup_runs_class_created (data_class, created_at),
  KEY idx_retention_cleanup_runs_workspace (workspace_id, created_at),
  CONSTRAINT fk_retention_cleanup_runs_workspace
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
