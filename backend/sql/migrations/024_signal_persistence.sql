-- V10-01: Signal Persistence. Signal is a brand-new Domain (spec section 6/7)
-- with no existing data to stay compatible with -- unlike the Workspace
-- retrofit migrations (014-016, 018-019, 021-022), this does NOT need an
-- expand/backfill/deferred-contract three-phase rollout. workspace_id is a
-- normal NOT NULL column with a real FK from the day this table is created.
--
-- Column/design decisions made in this task (see task packet's execution log
-- for full reasoning, not repeated here):
--   * No separate `priority` column -- ordering uses `severity` only.
--     `priority` is deferred to V10-04 (Recommendation), which is expected to
--     compute an actual priority formula from Signal + Evidence + Business
--     Impact together; guessing one here would be exactly the kind of
--     unsupported-formula problem the task packet warned against.
--   * No independent `signal_status_history` table -- status transitions
--     (new -> acknowledged / resolved / dismissed, and resolved -> new on
--     recurrence) are recorded in the existing `audit_logs` table with
--     entity_type='Signal', entity_id=<signals.public_id>, same pattern
--     WorkflowService already uses for Recommendation/Decision/Task mutations
--     (entity_type='RecommendationWorkflow'). Revisit only if a real query
--     need (e.g. "how many times did this flip state") proves audit_logs'
--     free-form event_type insufficient.
--   * `source_ref_type`/`source_ref_id` are a forward-compatible pointer for
--     V10-02's Evidence records to reference back to -- this migration does
--     not create any Evidence table or FK to it.

CREATE TABLE IF NOT EXISTS signals (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id CHAR(36) NOT NULL,
  workspace_id BIGINT UNSIGNED NOT NULL,
  type VARCHAR(100) NOT NULL,
  severity ENUM('critical', 'high', 'medium', 'low', 'info') NOT NULL,
  status ENUM('new', 'acknowledged', 'resolved', 'dismissed') NOT NULL DEFAULT 'new',
  source VARCHAR(50) NOT NULL,
  source_ref_type VARCHAR(50) NULL,
  source_ref_id BIGINT UNSIGNED NULL,
  dedup_key VARCHAR(191) NOT NULL,
  title VARCHAR(255) NOT NULL,
  summary TEXT NULL,
  detected_at DATETIME NOT NULL,
  last_seen_at DATETIME NOT NULL,
  occurrence_count INT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_signals_public_id (public_id),
  UNIQUE KEY uk_signals_workspace_dedup (workspace_id, dedup_key),
  KEY idx_signals_workspace_status_detected (workspace_id, status, detected_at),
  KEY idx_signals_workspace_source_ref (workspace_id, source, source_ref_type, source_ref_id),
  CONSTRAINT fk_signals_workspace
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
