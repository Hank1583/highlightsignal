CREATE TABLE IF NOT EXISTS seo_pagespeed_cache (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  site_id BIGINT UNSIGNED NOT NULL,
  strategy ENUM('mobile', 'desktop') NOT NULL,
  url VARCHAR(500) NOT NULL,
  score TINYINT UNSIGNED NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'unknown',
  metrics_json LONGTEXT NOT NULL,
  fetched_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_seo_pagespeed_lookup (user_id, site_id, strategy),
  KEY idx_seo_pagespeed_site_id (site_id),
  KEY idx_seo_pagespeed_fetched_at (fetched_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS seo_pagespeed_history (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  site_id BIGINT UNSIGNED NOT NULL,
  strategy ENUM('mobile', 'desktop') NOT NULL,
  url VARCHAR(500) NOT NULL,
  score TINYINT UNSIGNED NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'unknown',
  metrics_json LONGTEXT NOT NULL,
  fetched_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_seo_pagespeed_history_lookup (user_id, site_id, strategy, fetched_at),
  KEY idx_seo_pagespeed_history_site_id (site_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
