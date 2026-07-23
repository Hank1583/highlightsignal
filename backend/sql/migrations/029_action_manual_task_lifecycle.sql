-- V11-01: Action & Manual Task Lifecycle.
--
-- `actions` is a brand-new table (Recommendation Domain, spec section 6-8)
-- -- same rule as signals/evidence_items/signal_analyses (migrations/024-026):
-- real NOT NULL FKs from creation, no expand/backfill/deferred-contract
-- phases for the table itself.
--
--   * An Action is the formal authorization boundary between a human's
--     Decision and the Manual Task that actually gets worked on -- it
--     records WHO authorized it (`authorized_by_member_id`), WHICH Decision
--     authorized it (`decision_id`, UNIQUE -- one Action per Decision,
--     idempotent by construction), and WHAT the business intent was at
--     authorization time (`intent`, a snapshot -- not a live pointer to the
--     Recommendation's current content, which can keep changing via
--     revisions after the Action already exists).
--   * `status` is Action's OWN lifecycle (pending/in_progress/completed/
--     cancelled) -- deliberately a SEPARATE field from `tasks.status` even
--     though they're kept in sync by WorkflowService/WorkflowRepository, per
--     the task packet's "Action、Task 與 Queue Job 必須保持不同語意"
--     requirement. Action has no 'blocked' state -- that is a Task
--     execution detail, not a business-authorization detail.
--   * No FK to `queue_jobs` or an execution-result table -- Action never
--     touches technical execution (V11-02/03's job), only business intent
--     and authorization.
--
-- `tasks` (migrations/011) gets a nullable, additive expand -- same
-- discipline as every prior expand-on-a-live-table migration (015, 018,
-- 021, 027, 028): `recommendation_id` stays NOT NULL and continues to be
-- dual-written (existing reads by recommendation_id are completely
-- unaffected), `action_id` is added nullable and backfilled separately
-- (migrations/030) so a pre-existing Task row is never left half-migrated
-- mid-statement. `status` ENUM widens to add 'blocked' (existing values
-- unchanged). `completion_note` is a new nullable free-text field for
-- however a human explains why a Task was blocked or cancelled (or any
-- other completion context) -- distinct from `description` (what the task
-- is) and from Business Outcome (V11-04's job, whether it actually worked).

CREATE TABLE IF NOT EXISTS actions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id CHAR(36) NOT NULL,
  workspace_id BIGINT UNSIGNED NOT NULL,
  recommendation_id BIGINT UNSIGNED NOT NULL,
  decision_id BIGINT UNSIGNED NOT NULL,
  intent TEXT NOT NULL,
  status ENUM('pending', 'in_progress', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
  authorized_by_member_id BIGINT UNSIGNED NOT NULL,
  revision INT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_actions_public_id (public_id),
  UNIQUE KEY uk_actions_decision (decision_id),
  KEY idx_actions_workspace_status (workspace_id, status, updated_at),
  KEY idx_actions_recommendation (recommendation_id),
  CONSTRAINT fk_actions_workspace
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_actions_recommendation
    FOREIGN KEY (recommendation_id) REFERENCES recommendations(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_actions_decision
    FOREIGN KEY (decision_id) REFERENCES decisions(id)
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE tasks
  ADD COLUMN action_id BIGINT UNSIGNED NULL AFTER recommendation_id,
  MODIFY COLUMN status ENUM('pending', 'in_progress', 'blocked', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
  ADD COLUMN completion_note TEXT NULL AFTER description,
  ADD KEY idx_tasks_action (action_id),
  ADD CONSTRAINT fk_tasks_action
    FOREIGN KEY (action_id) REFERENCES actions(id)
    ON DELETE RESTRICT;
