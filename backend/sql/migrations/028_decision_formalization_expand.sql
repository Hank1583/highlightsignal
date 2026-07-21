-- V10-05: Human Review & Decision Formalization -- expand phase on the
-- EXISTING, already-live `decisions` table (migrations/011). Same
-- Workspace-retrofit discipline as migrations/027 -- nullable/safe-default
-- expand only, never destructive, since real rows may already exist.
--
-- `decisions` was ALREADY append-only by design before this migration --
-- WorkflowRepository::recordDecision() has always INSERTed a new row rather
-- than UPDATE-ing an existing one, and latestDecision() reads the most
-- recent by `ORDER BY id DESC`. This migration does not change that --
-- it only widens what a single Decision row can express and record.
--
--   * ENUM expand: spec section 6 requires at least Accepted/Rejected/
--     Deferred/Modified/Needs More Evidence. The existing
--     ENUM('accepted','skipped') keeps both values exactly as-is (task
--     packet: "保留既有 accepted/skipped 資料語意") -- 'rejected',
--     'deferred', 'modified', 'needs_more_evidence' are ADDED alongside,
--     not a replacement. Existing rows and existing frontend callers using
--     'accepted'/'skipped' are completely unaffected.
--   * `recommendation_revision`: snapshots which `recommendations.revision`
--     (see migrations/027) this Decision was actually made against --
--     without this, a Decision row alone can't say whether it was a
--     response to the Recommendation content the human actually saw, or a
--     since-superseded version.
--   * `expected_outcome`: spec-required field for what the decision maker
--     expects to happen -- distinct from `note` (the decision's reason).
--   * `idempotency_key` + a per-workspace UNIQUE key: MySQL treats every
--     NULL as distinct in a unique index, so this is opt-in -- a caller that
--     doesn't supply one is completely unaffected; a caller that does gets a
--     real duplicate-submission guard (e.g. a double-click resubmitting the
--     exact same decision request returns the existing row instead of
--     inserting a second one).

ALTER TABLE decisions
  MODIFY COLUMN decision ENUM(
    'accepted', 'skipped', 'rejected', 'deferred', 'modified', 'needs_more_evidence'
  ) NOT NULL,
  ADD COLUMN recommendation_revision INT UNSIGNED NULL AFTER recommendation_id,
  ADD COLUMN expected_outcome TEXT NULL AFTER note,
  ADD COLUMN idempotency_key VARCHAR(191) NULL AFTER expected_outcome,
  ADD UNIQUE KEY uk_decisions_workspace_idempotency (workspace_id, idempotency_key);
