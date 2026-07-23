-- V11-04: Business Outcome (formal, Action-linked, multi-metric).
--
-- Design decision made in this task (documented, not silently deviating
-- from the task packet): the EXISTING `business_outcomes` table
-- (migrations/012, one row per Task, a single JSON blob covering all
-- metrics) is left COMPLETELY UNTOUCHED -- it still powers the shipped
-- V10-04~06 Dashboard/Tasks UI exactly as before (`WorkflowRepository::
-- createOutcome()`/`measureOutcome()`/`getOutcome()` and every frontend
-- consumer of `workflow.outcome`). The task packet's own hint to migrate
-- the existing `UNIQUE(task_id)` constraint would mean either destructively
-- reshaping a table real UI already renders, or maintaining two competing
-- shapes in the SAME table -- both riskier than the alternative chosen
-- here: a brand-new, ADDITIVE `business_outcome_metrics` table, linked to
-- `actions` (not `tasks`, per this task's own "連回 Action" requirement)
-- with real per-metric granularity, populated ALONGSIDE (not instead of)
-- the legacy blob at the exact same two call sites
-- (WorkflowService::mutate()'s create_task/measure_outcome branches). This
-- satisfies "不抹除既有 outcome 資料" literally -- nothing is migrated,
-- reshaped, or at risk.
--
--   * `UNIQUE(action_id, metric_key)`: one row per Action per metric --
--     "一個 Action 可有多個 Outcome metric" is the table's actual grain,
--     not a JSON blob subdivided at the application layer.
--   * `baseline_value`/`baseline_captured_at` are set ONCE at creation and
--     never updated afterward (enforced in
--     BusinessOutcomeMetricRepository, not the database) -- "baseline 必須
--     在 Action 執行前...鎖定" is a write-once guarantee, not just a
--     convention.
--   * `direction` (`increase`/`decrease`) says which way is an improvement
--     for THIS metric (e.g. more GA sessions is good, fewer SEO issues is
--     good) -- `outcome_status` is computed from `direction` + baseline +
--     actual, never guessed from the raw numbers alone.
--   * `status='unavailable'` (with `actual_value` left NULL) is the
--     fail-closed state when a real measurement genuinely cannot be
--     fetched -- "來源不足時標示 unavailable，不猜值" is a stored, queryable
--     state, not a fabricated zero or a thrown exception hiding the gap.
--   * `source_type`/`source_ref`/`calculation_version` give every measured
--     value a traceable origin and a way to detect a stale calculation
--     formula later.

CREATE TABLE IF NOT EXISTS business_outcome_metrics (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id CHAR(36) NOT NULL,
  workspace_id BIGINT UNSIGNED NOT NULL,
  action_id BIGINT UNSIGNED NOT NULL,
  metric_key VARCHAR(50) NOT NULL,
  baseline_value DECIMAL(18,4) NOT NULL,
  baseline_captured_at DATETIME NOT NULL,
  target_value DECIMAL(18,4) NULL,
  measurement_window_days INT UNSIGNED NOT NULL DEFAULT 30,
  actual_value DECIMAL(18,4) NULL,
  measured_at DATETIME NULL,
  direction ENUM('increase', 'decrease') NOT NULL DEFAULT 'increase',
  status ENUM('awaiting_measurement', 'measured', 'unavailable') NOT NULL DEFAULT 'awaiting_measurement',
  outcome_status ENUM('improved', 'regressed', 'flat', 'unknown') NOT NULL DEFAULT 'unknown',
  source_type VARCHAR(50) NOT NULL,
  source_ref VARCHAR(191) NULL,
  calculation_version VARCHAR(50) NOT NULL DEFAULT 'outcome-v1',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_bom_public_id (public_id),
  UNIQUE KEY uk_bom_action_metric (action_id, metric_key),
  KEY idx_bom_workspace_status (workspace_id, status),
  CONSTRAINT fk_bom_workspace
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_bom_action
    FOREIGN KEY (action_id) REFERENCES actions(id)
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
