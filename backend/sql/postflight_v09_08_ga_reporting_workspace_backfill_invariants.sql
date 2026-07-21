-- Read-only. Run after migrations/021 (expand) and 022 (backfill) apply.
-- Same rule as the GA (V09-03) and SEO/SI (V09-04) postflight files: every
-- count below should be 0 (or an explicitly reviewed/quarantined anomaly)
-- before backend/sql/023_ga_reporting_workspace_contract_DEFERRED.sql is ever
-- considered for promotion into migrations/, and before the PHP changes in
-- this batch (ga_report_list.php, ga_report_detail.php, ga_report_save.php,
-- ga_report_update.php, data_sync.php, get_query.php, ga/ownership.php,
-- ga/report/report_excel.php, ga/report/report_mailer.php) are uploaded to
-- production -- those files assume ga_report_schedules.workspace_id is
-- already backfilled and ga_connections.workspace_id (from V09-03) is still
-- fully populated.

-- ============================================================
-- 1. Every ga_report_schedules row should have a workspace_id after backfill.
-- ============================================================
SELECT COUNT(*) AS schedules_without_workspace
FROM ga_report_schedules
WHERE workspace_id IS NULL;

-- ============================================================
-- 2. workspace_id should always point at a real, non-deleted workspace.
-- ============================================================
SELECT COUNT(*) AS schedules_mapped_to_missing_workspace
FROM ga_report_schedules t
LEFT JOIN workspaces w ON w.id = t.workspace_id AND w.deleted_at IS NULL
WHERE t.workspace_id IS NOT NULL
  AND w.id IS NULL;

-- ============================================================
-- 3. workspace_id should always be a workspace the schedule's own user_id can
--    actually access (active membership), not an unrelated workspace.
-- ============================================================
SELECT COUNT(*) AS schedules_mapped_to_inaccessible_workspace
FROM ga_report_schedules t
LEFT JOIN workspace_members wm
  ON wm.workspace_id = t.workspace_id
  AND wm.member_id = t.user_id
  AND wm.status = 'active'
WHERE t.workspace_id IS NOT NULL
  AND wm.workspace_id IS NULL;

-- ============================================================
-- 4. Anomaly report: schedules whose user_id has no legacy mapping at all, so
--    they were intentionally left workspace_id = NULL by the backfill. Needs
--    a manual ownership decision, not an automatic guess.
-- ============================================================
SELECT t.id AS schedule_id, t.user_id, t.report_name
FROM ga_report_schedules t
LEFT JOIN legacy_member_workspace_map lwm ON lwm.member_id = t.user_id
WHERE t.workspace_id IS NULL
  AND lwm.workspace_id IS NULL;

-- ============================================================
-- 5. Child-table sanity: the 5 tables that only carry connection_id
--    (ga_daily_summary, ga_pages, ga_events, ga_traffic_sources,
--    ga_conversions) get no workspace_id column of their own -- their
--    ownership is established purely by joining back to ga_connections. A
--    nonzero count here means the parent ga_connections row itself has not
--    been backfilled (should not happen -- V09-03's postflight already
--    confirmed connections_without_workspace = 0 -- included here as a
--    defensive re-check, since this migration's PHP changes rely on it being
--    true right now, not just at the time V09-03 ran), or the row references
--    a connection_id that no longer exists.
-- ============================================================
SELECT 'ga_daily_summary' AS table_name, COUNT(*) AS root_missing_or_deleted_connection
FROM ga_daily_summary c
LEFT JOIN ga_connections gc ON gc.id = c.connection_id
WHERE gc.id IS NULL OR gc.workspace_id IS NULL
UNION ALL
SELECT 'ga_pages', COUNT(*)
FROM ga_pages c
LEFT JOIN ga_connections gc ON gc.id = c.connection_id
WHERE gc.id IS NULL OR gc.workspace_id IS NULL
UNION ALL
SELECT 'ga_events', COUNT(*)
FROM ga_events c
LEFT JOIN ga_connections gc ON gc.id = c.connection_id
WHERE gc.id IS NULL OR gc.workspace_id IS NULL
UNION ALL
SELECT 'ga_traffic_sources', COUNT(*)
FROM ga_traffic_sources c
LEFT JOIN ga_connections gc ON gc.id = c.connection_id
WHERE gc.id IS NULL OR gc.workspace_id IS NULL
UNION ALL
SELECT 'ga_conversions', COUNT(*)
FROM ga_conversions c
LEFT JOIN ga_connections gc ON gc.id = c.connection_id
WHERE gc.id IS NULL OR gc.workspace_id IS NULL;

-- ============================================================
-- 6. Schedule/connection cross-workspace leakage check. ga_report_schedules
--    stores its GA connections as a JSON array in connection_ids (TEXT), not
--    a normalized foreign key -- same FIND_IN_SET(...) pattern already used
--    by ga_report_list.php/ga_report_detail.php to join back to
--    ga_connections. A nonzero result here means a report schedule's
--    connection_ids list references a GA connection that belongs to a
--    DIFFERENT workspace than the schedule itself -- i.e. the report would
--    mail/export another tenant's analytics data. This is the specific
--    integrity risk unique to this table (the 5 child tables above are
--    scoped 1:1 by connection_id; this one aggregates multiple connections
--    by hand-maintained JSON list) and must be 0 before the contract
--    migration is ever promoted.
-- ============================================================
SELECT
  r.id AS schedule_id,
  r.workspace_id AS schedule_workspace_id,
  c.id AS connection_id,
  c.workspace_id AS connection_workspace_id
FROM ga_report_schedules r
INNER JOIN ga_connections c
  ON FIND_IN_SET(
      c.id,
      REPLACE(REPLACE(REPLACE(REPLACE(r.connection_ids, '"', ''), '[', ''), ']', ''), ' ', '')
  )
WHERE r.workspace_id IS NOT NULL
  AND c.workspace_id IS NOT NULL
  AND c.workspace_id <> r.workspace_id;

-- ============================================================
-- 7. legacy_member_workspace_map is bijective by schema, so this should
--    always be empty -- included as a defensive check in case a future
--    schema change weakens that constraint without updating this migration's
--    assumption (same check as the GA and SEO/SI postflight files).
-- ============================================================
SELECT member_id, COUNT(DISTINCT workspace_id) AS distinct_workspace_count
FROM legacy_member_workspace_map
GROUP BY member_id
HAVING COUNT(DISTINCT workspace_id) > 1;
