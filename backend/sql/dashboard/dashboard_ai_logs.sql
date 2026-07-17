CREATE TABLE IF NOT EXISTS dashboard_ai_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL DEFAULT 0,
  question TEXT NOT NULL,
  lens VARCHAR(40) NOT NULL DEFAULT 'overview',
  context_json LONGTEXT NULL,
  response_json LONGTEXT NULL,
  model VARCHAR(80) NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'success',
  error_message TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_dashboard_ai_logs_user_created (user_id, created_at),
  KEY idx_dashboard_ai_logs_lens (lens)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
