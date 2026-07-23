-- V11-05: Evaluation & Feedback. Brand-new table, same rule as
-- signals/evidence_items/actions: real FKs from creation (workspace_id
-- only -- `subject_id` deliberately has NO FK, since `subject_type` can
-- point at four different tables (Recommendation/Decision/Task/Action) and
-- MySQL has no polymorphic FK; workspace-scoping every read/write is the
-- real integrity boundary here, same as `signals.source_ref_id`/
-- `evidence_items.source_ref_id` already do for their own polymorphic
-- pointers).
--
--   * ONE table for both system Evaluation and human Feedback --
--     `source` (`system`/`human`) is the discriminator, per the task
--     packet's own field list ("Evaluation 與 Feedback...均具 workspace、
--     subject type/id、evaluator/actor、rating/outcome、reason、source、
--     version、timestamps" -- describing one shared shape, not two
--     divergent ones). `actor_member_id` is NULL for `system` rows (no
--     human involved) and NOT NULL for `human` rows (enforced in
--     EvaluationService, not the database -- MySQL 5.6 cannot express
--     "NOT NULL only when source='human'" as a constraint).
--   * Append-only, same discipline as `decisions` -- re-evaluating a
--     subject NEVER updates a prior row; the latest row by `id` is
--     authoritative. `EvaluationService` only inserts a new `system` row
--     when the computed rating/value actually CHANGED since the last one
--     (idempotent no-op otherwise, same as `signal_analyses`'s
--     upsert-if-changed spirit, but via a real INSERT-if-different since
--     the table is genuinely append-only, not an UPSERT target).
--   * `idempotency_key` on human Feedback submissions -- same opt-in,
--     NULL-is-distinct pattern as `decisions.idempotency_key`.
--   * No column here can ever trigger a Decision, Action, or model update
--     -- this table is read-only input for reporting; nothing in this
--     codebase queries it to make an automated decision (a structural fact
--     enforced by code review discipline, not a database mechanism).

CREATE TABLE IF NOT EXISTS evaluations (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id CHAR(36) NOT NULL,
  workspace_id BIGINT UNSIGNED NOT NULL,
  subject_type VARCHAR(50) NOT NULL,
  subject_id BIGINT UNSIGNED NOT NULL,
  source ENUM('system', 'human') NOT NULL,
  actor_member_id BIGINT UNSIGNED NULL,
  metric_key VARCHAR(50) NULL,
  rating VARCHAR(50) NULL,
  value DECIMAL(18,4) NULL,
  reason TEXT NULL,
  calculation_version VARCHAR(50) NULL,
  idempotency_key VARCHAR(191) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_evaluations_public_id (public_id),
  UNIQUE KEY uk_evaluations_workspace_idempotency (workspace_id, idempotency_key),
  KEY idx_evaluations_subject (workspace_id, subject_type, subject_id, source, created_at),
  CONSTRAINT fk_evaluations_workspace
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
