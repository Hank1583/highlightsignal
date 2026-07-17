-- SEO scan snapshots used by the execution/outcome loop.
CREATE TABLE IF NOT EXISTS seo_scan_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  site_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  health_score SMALLINT UNSIGNED NOT NULL,
  issue_count INT UNSIGNED NOT NULL,
  issues_json LONGTEXT NOT NULL,
  summary_json LONGTEXT NOT NULL,
  scanned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_seo_scan_site_user (site_id, user_id, id),
  KEY idx_seo_scan_user_date (user_id, scanned_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
