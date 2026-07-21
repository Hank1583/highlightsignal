-- Extracted from request-time `CREATE TABLE IF NOT EXISTS` calls that used to run
-- on every hit to their respective endpoints:
--   dashboard_ai_logs      <- dashboard/ai_usage.php, dashboard/ai_compose.php
--   dashboard_ai_plan_logs <- dashboard/ai_plan.php
--   seo_pagespeed_cache    <- si/seo/pagespeed.php
--   seo_pagespeed_history  <- si/seo/pagespeed.php, si/seo/pagespeed_history.php
-- These tables key on user_id, not workspace_id; workspace-scoping them is out of
-- scope for this migration (tracked separately under V09-04).

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

CREATE TABLE IF NOT EXISTS dashboard_ai_plan_logs (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL DEFAULT 0,
    question TEXT NOT NULL,
    plan_json LONGTEXT NULL,
    model VARCHAR(80) NULL,
    source VARCHAR(30) NOT NULL DEFAULT 'ai',
    status VARCHAR(30) NOT NULL DEFAULT 'success',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_dashboard_ai_plan_logs_user_created (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
