CREATE TABLE IF NOT EXISTS business_outcomes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id CHAR(36) NOT NULL,
  workspace_id BIGINT UNSIGNED NOT NULL,
  task_id BIGINT UNSIGNED NOT NULL,
  status ENUM('awaiting_execution', 'awaiting_measurement', 'measured') NOT NULL DEFAULT 'awaiting_execution',
  baseline_metrics_TEXT TEXT NOT NULL,
  measured_metrics_TEXT TEXT NULL,
  result_TEXT TEXT NULL,
  measured_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_business_outcomes_public_id (public_id),
  UNIQUE KEY uk_business_outcomes_task (task_id),
  KEY idx_business_outcomes_workspace_status (workspace_id, status, updated_at),
  CONSTRAINT fk_business_outcomes_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE RESTRICT,
  CONSTRAINT fk_business_outcomes_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
