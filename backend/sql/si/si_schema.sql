-- Search Intelligence AEO/GEO schema
-- MySQL 8+ / MariaDB 10.4+

CREATE TABLE IF NOT EXISTS si_sites (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  site_name VARCHAR(120) NOT NULL,
  site_url VARCHAR(500) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_si_sites_user_id (user_id),
  KEY idx_si_sites_active (is_active),
  UNIQUE KEY uk_si_sites_user_url (user_id, site_url(180))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS si_analysis_runs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  site_id BIGINT UNSIGNED NOT NULL,
  module VARCHAR(20) NOT NULL,
  tab_key VARCHAR(40) NOT NULL DEFAULT 'overview',
  title VARCHAR(200) NOT NULL,
  description TEXT NULL,
  panel_title VARCHAR(200) NULL,
  side_title VARCHAR(200) NULL,
  recommendation TEXT NULL,
  source VARCHAR(80) NOT NULL DEFAULT 'manual',
  status VARCHAR(30) NOT NULL DEFAULT 'ready',
  analyzed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_si_runs_lookup (user_id, site_id, module, tab_key, analyzed_at),
  KEY idx_si_runs_site_id (site_id),
  CONSTRAINT fk_si_runs_site_id
    FOREIGN KEY (site_id) REFERENCES si_sites(id)
    ON DELETE CASCADE,
  CONSTRAINT chk_si_runs_module
    CHECK (module IN ('aeo', 'geo'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS si_analysis_metrics (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  run_id BIGINT UNSIGNED NOT NULL,
  label VARCHAR(120) NOT NULL,
  value VARCHAR(80) NOT NULL,
  note VARCHAR(160) NULL,
  basis TEXT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_si_metrics_run_id (run_id, sort_order),
  CONSTRAINT fk_si_metrics_run_id
    FOREIGN KEY (run_id) REFERENCES si_analysis_runs(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS si_analysis_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  run_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(500) NOT NULL,
  meta VARCHAR(200) NULL,
  status VARCHAR(200) NULL,
  source VARCHAR(160) NULL,
  tags_json LONGTEXT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_si_items_run_id (run_id, sort_order),
  CONSTRAINT fk_si_items_run_id
    FOREIGN KEY (run_id) REFERENCES si_analysis_runs(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS si_analysis_actions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  run_id BIGINT UNSIGNED NOT NULL,
  action_text VARCHAR(500) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_si_actions_run_id (run_id, sort_order),
  CONSTRAINT fk_si_actions_run_id
    FOREIGN KEY (run_id) REFERENCES si_analysis_runs(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS si_analysis_side_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  run_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(200) NOT NULL,
  score DECIMAL(6,2) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_si_side_items_run_id (run_id, sort_order),
  CONSTRAINT fk_si_side_items_run_id
    FOREIGN KEY (run_id) REFERENCES si_analysis_runs(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
