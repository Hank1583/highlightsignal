-- Read-only. Run this in phpMyAdmin BEFORE pasting migrations/018 or 019, the
-- same way 000_preflight_inventory.sql was reviewed before migrations/014-016.
--
-- V09-04 scope: every SEO / SI (AEO/GEO) / dashboard-AI / PageSpeed table that
-- the task packet identified from code grep, not from a real schema read.
-- V09-01 already found once that a real table's columns differ from what code
-- grep suggests (ga_connections) -- treat every assumption below as unverified
-- until this query's real output says otherwise. In particular:
--   * seo_sites, seo_site_integrations, seo_summary_cache, seo_scan_history,
--     si_sites, si_analysis_runs/metrics/items/actions/side_items are NOT
--     created by any migration in this repo (backend/sql/si/*.sql and
--     backend/sql/dashboard/*.sql are historical reference copies only, like
--     020_workspace_backfill_template.sql -- never applied directly). Their
--     real column list, engine, and indexes on THIS host are unknown until
--     this query is run.
--   * dashboard_ai_logs, dashboard_ai_plan_logs, seo_pagespeed_cache,
--     seo_pagespeed_history ARE tracked (migrations/013), so their schema is
--     more likely to match -- but re-verify anyway, this query is cheap.

SELECT VERSION() AS database_version;
SELECT DATABASE() AS database_name;

-- Real column list, nullability, and key flag for every table in scope.
SELECT
  TABLE_NAME,
  COLUMN_NAME,
  COLUMN_TYPE,
  IS_NULLABLE,
  COLUMN_KEY,
  COLUMN_DEFAULT,
  ORDINAL_POSITION
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN (
    'seo_sites', 'seo_site_integrations', 'seo_summary_cache', 'seo_scan_history',
    'si_sites', 'si_analysis_runs', 'si_analysis_metrics', 'si_analysis_items',
    'si_analysis_actions', 'si_analysis_side_items',
    'dashboard_ai_logs', 'dashboard_ai_plan_logs',
    'seo_pagespeed_cache', 'seo_pagespeed_history'
  )
ORDER BY TABLE_NAME, ORDINAL_POSITION;

-- Engine, row count estimate, and collation -- confirms InnoDB (required for
-- the FK the deferred contract migration adds later) and roughly how large
-- each ALTER/UPDATE in 018/019 will be.
SELECT
  TABLE_NAME,
  ENGINE,
  TABLE_ROWS,
  TABLE_COLLATION
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN (
    'seo_sites', 'seo_site_integrations', 'seo_summary_cache', 'seo_scan_history',
    'si_sites', 'si_analysis_runs', 'si_analysis_metrics', 'si_analysis_items',
    'si_analysis_actions', 'si_analysis_side_items',
    'dashboard_ai_logs', 'dashboard_ai_plan_logs',
    'seo_pagespeed_cache', 'seo_pagespeed_history'
  )
ORDER BY TABLE_NAME;

-- Existing indexes -- confirms migrations/018's new KEY names don't collide,
-- and that the assumed unique keys (e.g. seo_pagespeed_cache's (user_id,
-- site_id, strategy)) actually exist as assumed.
SELECT
  TABLE_NAME,
  INDEX_NAME,
  NON_UNIQUE,
  GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS indexed_columns
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN (
    'seo_sites', 'seo_site_integrations', 'seo_summary_cache', 'seo_scan_history',
    'si_sites', 'si_analysis_runs', 'si_analysis_metrics', 'si_analysis_items',
    'si_analysis_actions', 'si_analysis_side_items',
    'dashboard_ai_logs', 'dashboard_ai_plan_logs',
    'seo_pagespeed_cache', 'seo_pagespeed_history'
  )
GROUP BY TABLE_NAME, INDEX_NAME, NON_UNIQUE
ORDER BY TABLE_NAME, INDEX_NAME;

-- Sanity check: confirms which tables actually have a direct user_id column
-- (root -- gets workspace_id in 018/019) versus which only have a foreign key
-- back to a root table (child -- ownership via JOIN only, no column added).
-- Expected result based on code review (verify against the real output above):
--   root tables (have user_id):  seo_sites, seo_summary_cache, seo_scan_history,
--     si_sites, si_analysis_runs, dashboard_ai_logs, dashboard_ai_plan_logs,
--     seo_pagespeed_cache, seo_pagespeed_history
--   child tables (no user_id):   seo_site_integrations (site_id only),
--     si_analysis_metrics/items/actions/side_items (run_id only)
SELECT
  TABLE_NAME,
  MAX(CASE WHEN COLUMN_NAME = 'user_id' THEN 1 ELSE 0 END) AS has_user_id,
  MAX(CASE WHEN COLUMN_NAME = 'site_id' THEN 1 ELSE 0 END) AS has_site_id,
  MAX(CASE WHEN COLUMN_NAME = 'run_id' THEN 1 ELSE 0 END) AS has_run_id,
  MAX(CASE WHEN COLUMN_NAME = 'workspace_id' THEN 1 ELSE 0 END) AS already_has_workspace_id
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN (
    'seo_sites', 'seo_site_integrations', 'seo_summary_cache', 'seo_scan_history',
    'si_sites', 'si_analysis_runs', 'si_analysis_metrics', 'si_analysis_items',
    'si_analysis_actions', 'si_analysis_side_items',
    'dashboard_ai_logs', 'dashboard_ai_plan_logs',
    'seo_pagespeed_cache', 'seo_pagespeed_history'
  )
GROUP BY TABLE_NAME
ORDER BY TABLE_NAME;
