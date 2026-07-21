-- Read-only. Run this in phpMyAdmin BEFORE pasting migrations/021 or 022, the
-- same way preflight_v09_04_seo_si_dashboard_inventory.sql was reviewed before
-- migrations/018/019.
--
-- V09-08 scope: the 6 GA reporting tables the V09-03/04 workspace_id migration
-- never touched (see docs/00_V07_TO_V12_PROGRESS_TRACKER.md's V09-05 dated
-- note). None of these 6 are created by any migration in this repo -- same
-- caveat ga_connections had for V09-03. Column list below is inferred from
-- reading backend/api/ga/{ga_report_list,ga_report_detail,ga_report_save,
-- ga_report_update,data_sync,get_query}.php, NOT from a real schema read --
-- treat every assumption as unverified until this query's real output says
-- otherwise (V09-01 already found once that a real table's columns differ
-- from what code grep suggests).
--
-- Expected classification based on code review (verify against real output):
--   root table (has direct user_id, gets its own workspace_id column):
--     ga_report_schedules
--   child tables (only have connection_id, a foreign key into
--   ga_connections -- which already has a reliable, backfilled workspace_id
--   since V09-03 -- so ownership resolves by JOIN back to ga_connections,
--   no new column added, same pattern V09-04 used for seo_site_integrations
--   / si_analysis_metrics etc.):
--     ga_daily_summary, ga_pages, ga_events, ga_traffic_sources, ga_conversions

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
    'ga_report_schedules', 'ga_daily_summary', 'ga_pages', 'ga_events',
    'ga_traffic_sources', 'ga_conversions'
  )
ORDER BY TABLE_NAME, ORDINAL_POSITION;

-- Engine, row count estimate, and collation -- confirms InnoDB (required for
-- the FK the deferred contract migration adds later) and roughly how large
-- each ALTER/UPDATE in 021/022 will be.
SELECT
  TABLE_NAME,
  ENGINE,
  TABLE_ROWS,
  TABLE_COLLATION
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN (
    'ga_report_schedules', 'ga_daily_summary', 'ga_pages', 'ga_events',
    'ga_traffic_sources', 'ga_conversions'
  )
ORDER BY TABLE_NAME;

-- Existing indexes -- confirms migrations/021's new KEY name doesn't collide,
-- and that the assumed unique/composite keys on the 5 child tables (e.g.
-- ga_daily_summary's (connection_id, date)) actually exist as the
-- ON DUPLICATE KEY UPDATE statements in data_sync.php assume.
SELECT
  TABLE_NAME,
  INDEX_NAME,
  NON_UNIQUE,
  GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS indexed_columns
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN (
    'ga_report_schedules', 'ga_daily_summary', 'ga_pages', 'ga_events',
    'ga_traffic_sources', 'ga_conversions'
  )
GROUP BY TABLE_NAME, INDEX_NAME, NON_UNIQUE
ORDER BY TABLE_NAME, INDEX_NAME;

-- Sanity check: confirms which table actually has a direct user_id column
-- (root -- gets workspace_id in 021/022) versus which only have a
-- connection_id foreign key back to ga_connections (child -- ownership via
-- JOIN only, no column added). Expected result based on code review (verify
-- against the real output above):
--   root table (has user_id):        ga_report_schedules
--   child tables (connection_id only): ga_daily_summary, ga_pages, ga_events,
--                                       ga_traffic_sources, ga_conversions
SELECT
  TABLE_NAME,
  MAX(CASE WHEN COLUMN_NAME = 'user_id' THEN 1 ELSE 0 END) AS has_user_id,
  MAX(CASE WHEN COLUMN_NAME = 'connection_id' THEN 1 ELSE 0 END) AS has_connection_id,
  MAX(CASE WHEN COLUMN_NAME = 'workspace_id' THEN 1 ELSE 0 END) AS already_has_workspace_id
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN (
    'ga_report_schedules', 'ga_daily_summary', 'ga_pages', 'ga_events',
    'ga_traffic_sources', 'ga_conversions'
  )
GROUP BY TABLE_NAME
ORDER BY TABLE_NAME;

-- Confirms ga_connections.workspace_id (added by migrations/015, backfilled
-- by 016) is still fully backfilled on this host right now -- the 5 child
-- tables' ownership depends entirely on this being true, since no new column
-- is added to them.
SELECT COUNT(*) AS ga_connections_still_missing_workspace
FROM ga_connections
WHERE workspace_id IS NULL;
