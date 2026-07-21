-- Read-only. Run after migrations/018 (expand) and 019 (backfill) apply.
-- Same rule as postflight_ga_workspace_backfill_invariants.sql: every count
-- below should be 0 (or an explicitly reviewed/quarantined anomaly) before
-- backend/sql/020_seo_si_dashboard_workspace_contract_DEFERRED.sql is ever
-- considered for promotion into migrations/, and before the PHP changes in
-- this batch (si/common.php, si/save_common.php, si/sites/list.php,
-- si/seo/*.php, dashboard/ai_*.php, legacy_auth.php) are uploaded to
-- production -- those files assume workspace_id is already backfilled.

-- ============================================================
-- 1. Every root-table row should have a workspace_id after backfill.
-- ============================================================
SELECT 'seo_sites' AS table_name, COUNT(*) AS without_workspace FROM seo_sites WHERE workspace_id IS NULL
UNION ALL
SELECT 'seo_summary_cache', COUNT(*) FROM seo_summary_cache WHERE workspace_id IS NULL
UNION ALL
SELECT 'seo_scan_history', COUNT(*) FROM seo_scan_history WHERE workspace_id IS NULL
UNION ALL
SELECT 'si_sites', COUNT(*) FROM si_sites WHERE workspace_id IS NULL
UNION ALL
SELECT 'si_analysis_runs', COUNT(*) FROM si_analysis_runs WHERE workspace_id IS NULL
UNION ALL
SELECT 'dashboard_ai_logs', COUNT(*) FROM dashboard_ai_logs WHERE workspace_id IS NULL
UNION ALL
SELECT 'dashboard_ai_plan_logs', COUNT(*) FROM dashboard_ai_plan_logs WHERE workspace_id IS NULL
UNION ALL
SELECT 'seo_pagespeed_cache', COUNT(*) FROM seo_pagespeed_cache WHERE workspace_id IS NULL
UNION ALL
SELECT 'seo_pagespeed_history', COUNT(*) FROM seo_pagespeed_history WHERE workspace_id IS NULL;

-- ============================================================
-- 2. workspace_id should always point at a real, non-deleted workspace.
-- ============================================================
SELECT 'seo_sites' AS table_name, COUNT(*) AS mapped_to_missing_workspace
FROM seo_sites t LEFT JOIN workspaces w ON w.id = t.workspace_id AND w.deleted_at IS NULL
WHERE t.workspace_id IS NOT NULL AND w.id IS NULL
UNION ALL
SELECT 'seo_summary_cache', COUNT(*)
FROM seo_summary_cache t LEFT JOIN workspaces w ON w.id = t.workspace_id AND w.deleted_at IS NULL
WHERE t.workspace_id IS NOT NULL AND w.id IS NULL
UNION ALL
SELECT 'seo_scan_history', COUNT(*)
FROM seo_scan_history t LEFT JOIN workspaces w ON w.id = t.workspace_id AND w.deleted_at IS NULL
WHERE t.workspace_id IS NOT NULL AND w.id IS NULL
UNION ALL
SELECT 'si_sites', COUNT(*)
FROM si_sites t LEFT JOIN workspaces w ON w.id = t.workspace_id AND w.deleted_at IS NULL
WHERE t.workspace_id IS NOT NULL AND w.id IS NULL
UNION ALL
SELECT 'si_analysis_runs', COUNT(*)
FROM si_analysis_runs t LEFT JOIN workspaces w ON w.id = t.workspace_id AND w.deleted_at IS NULL
WHERE t.workspace_id IS NOT NULL AND w.id IS NULL
UNION ALL
SELECT 'dashboard_ai_logs', COUNT(*)
FROM dashboard_ai_logs t LEFT JOIN workspaces w ON w.id = t.workspace_id AND w.deleted_at IS NULL
WHERE t.workspace_id IS NOT NULL AND w.id IS NULL
UNION ALL
SELECT 'dashboard_ai_plan_logs', COUNT(*)
FROM dashboard_ai_plan_logs t LEFT JOIN workspaces w ON w.id = t.workspace_id AND w.deleted_at IS NULL
WHERE t.workspace_id IS NOT NULL AND w.id IS NULL
UNION ALL
SELECT 'seo_pagespeed_cache', COUNT(*)
FROM seo_pagespeed_cache t LEFT JOIN workspaces w ON w.id = t.workspace_id AND w.deleted_at IS NULL
WHERE t.workspace_id IS NOT NULL AND w.id IS NULL
UNION ALL
SELECT 'seo_pagespeed_history', COUNT(*)
FROM seo_pagespeed_history t LEFT JOIN workspaces w ON w.id = t.workspace_id AND w.deleted_at IS NULL
WHERE t.workspace_id IS NOT NULL AND w.id IS NULL;

-- ============================================================
-- 3. workspace_id should always be a workspace the row's own user_id can
--    actually access (owner or member), not an unrelated workspace.
-- ============================================================
SELECT 'seo_sites' AS table_name, COUNT(*) AS mapped_to_inaccessible_workspace
FROM seo_sites t
LEFT JOIN workspace_members wm ON wm.workspace_id = t.workspace_id AND wm.member_id = t.user_id AND wm.status = 'active'
WHERE t.workspace_id IS NOT NULL AND wm.workspace_id IS NULL
UNION ALL
SELECT 'seo_summary_cache', COUNT(*)
FROM seo_summary_cache t
LEFT JOIN workspace_members wm ON wm.workspace_id = t.workspace_id AND wm.member_id = t.user_id AND wm.status = 'active'
WHERE t.workspace_id IS NOT NULL AND wm.workspace_id IS NULL
UNION ALL
SELECT 'seo_scan_history', COUNT(*)
FROM seo_scan_history t
LEFT JOIN workspace_members wm ON wm.workspace_id = t.workspace_id AND wm.member_id = t.user_id AND wm.status = 'active'
WHERE t.workspace_id IS NOT NULL AND wm.workspace_id IS NULL
UNION ALL
SELECT 'si_sites', COUNT(*)
FROM si_sites t
LEFT JOIN workspace_members wm ON wm.workspace_id = t.workspace_id AND wm.member_id = t.user_id AND wm.status = 'active'
WHERE t.workspace_id IS NOT NULL AND wm.workspace_id IS NULL
UNION ALL
SELECT 'si_analysis_runs', COUNT(*)
FROM si_analysis_runs t
LEFT JOIN workspace_members wm ON wm.workspace_id = t.workspace_id AND wm.member_id = t.user_id AND wm.status = 'active'
WHERE t.workspace_id IS NOT NULL AND wm.workspace_id IS NULL
UNION ALL
SELECT 'dashboard_ai_logs', COUNT(*)
FROM dashboard_ai_logs t
LEFT JOIN workspace_members wm ON wm.workspace_id = t.workspace_id AND wm.member_id = t.user_id AND wm.status = 'active'
WHERE t.workspace_id IS NOT NULL AND wm.workspace_id IS NULL
UNION ALL
SELECT 'dashboard_ai_plan_logs', COUNT(*)
FROM dashboard_ai_plan_logs t
LEFT JOIN workspace_members wm ON wm.workspace_id = t.workspace_id AND wm.member_id = t.user_id AND wm.status = 'active'
WHERE t.workspace_id IS NOT NULL AND wm.workspace_id IS NULL
UNION ALL
SELECT 'seo_pagespeed_cache', COUNT(*)
FROM seo_pagespeed_cache t
LEFT JOIN workspace_members wm ON wm.workspace_id = t.workspace_id AND wm.member_id = t.user_id AND wm.status = 'active'
WHERE t.workspace_id IS NOT NULL AND wm.workspace_id IS NULL
UNION ALL
SELECT 'seo_pagespeed_history', COUNT(*)
FROM seo_pagespeed_history t
LEFT JOIN workspace_members wm ON wm.workspace_id = t.workspace_id AND wm.member_id = t.user_id AND wm.status = 'active'
WHERE t.workspace_id IS NOT NULL AND wm.workspace_id IS NULL;

-- ============================================================
-- 4. Anomaly report: rows whose user_id has no legacy mapping at all, so
--    they were intentionally left workspace_id = NULL by the backfill.
--    Needs a manual ownership decision, not an automatic guess. Expected to
--    be empty per V09-02's unmapped_count=0 finding, unless new data has been
--    written since that check.
-- ============================================================
SELECT 'seo_sites' AS table_name, t.id AS row_id, t.user_id
FROM seo_sites t LEFT JOIN legacy_member_workspace_map lwm ON lwm.member_id = t.user_id
WHERE t.workspace_id IS NULL AND lwm.workspace_id IS NULL
UNION ALL
SELECT 'seo_summary_cache', t.id, t.user_id
FROM seo_summary_cache t LEFT JOIN legacy_member_workspace_map lwm ON lwm.member_id = t.user_id
WHERE t.workspace_id IS NULL AND lwm.workspace_id IS NULL
UNION ALL
SELECT 'seo_scan_history', t.id, t.user_id
FROM seo_scan_history t LEFT JOIN legacy_member_workspace_map lwm ON lwm.member_id = t.user_id
WHERE t.workspace_id IS NULL AND lwm.workspace_id IS NULL
UNION ALL
SELECT 'si_sites', t.id, t.user_id
FROM si_sites t LEFT JOIN legacy_member_workspace_map lwm ON lwm.member_id = t.user_id
WHERE t.workspace_id IS NULL AND lwm.workspace_id IS NULL
UNION ALL
SELECT 'si_analysis_runs', t.id, t.user_id
FROM si_analysis_runs t LEFT JOIN legacy_member_workspace_map lwm ON lwm.member_id = t.user_id
WHERE t.workspace_id IS NULL AND lwm.workspace_id IS NULL
UNION ALL
SELECT 'dashboard_ai_logs', t.id, t.user_id
FROM dashboard_ai_logs t LEFT JOIN legacy_member_workspace_map lwm ON lwm.member_id = t.user_id
WHERE t.workspace_id IS NULL AND lwm.workspace_id IS NULL
UNION ALL
SELECT 'dashboard_ai_plan_logs', t.id, t.user_id
FROM dashboard_ai_plan_logs t LEFT JOIN legacy_member_workspace_map lwm ON lwm.member_id = t.user_id
WHERE t.workspace_id IS NULL AND lwm.workspace_id IS NULL
UNION ALL
SELECT 'seo_pagespeed_cache', t.id, t.user_id
FROM seo_pagespeed_cache t LEFT JOIN legacy_member_workspace_map lwm ON lwm.member_id = t.user_id
WHERE t.workspace_id IS NULL AND lwm.workspace_id IS NULL
UNION ALL
SELECT 'seo_pagespeed_history', t.id, t.user_id
FROM seo_pagespeed_history t LEFT JOIN legacy_member_workspace_map lwm ON lwm.member_id = t.user_id
WHERE t.workspace_id IS NULL AND lwm.workspace_id IS NULL;

-- ============================================================
-- 5. Child-table sanity: every child row's root (via site_id or run_id)
--    should itself have a non-NULL workspace_id after 018/019 apply, since
--    child ownership is established purely by joining back to the root --
--    no workspace_id column was added to these tables (see migrations/018's
--    header for why). A nonzero count here means the child-table's join
--    target has not been backfilled yet, not that the child table itself
--    needs a column.
-- ============================================================
SELECT 'seo_site_integrations' AS table_name, COUNT(*) AS root_missing_workspace
FROM seo_site_integrations si
INNER JOIN seo_sites s ON s.id = si.site_id
WHERE s.workspace_id IS NULL
UNION ALL
SELECT 'si_analysis_metrics', COUNT(*)
FROM si_analysis_metrics c
INNER JOIN si_analysis_runs r ON r.id = c.run_id
WHERE r.workspace_id IS NULL
UNION ALL
SELECT 'si_analysis_items', COUNT(*)
FROM si_analysis_items c
INNER JOIN si_analysis_runs r ON r.id = c.run_id
WHERE r.workspace_id IS NULL
UNION ALL
SELECT 'si_analysis_actions', COUNT(*)
FROM si_analysis_actions c
INNER JOIN si_analysis_runs r ON r.id = c.run_id
WHERE r.workspace_id IS NULL
UNION ALL
SELECT 'si_analysis_side_items', COUNT(*)
FROM si_analysis_side_items c
INNER JOIN si_analysis_runs r ON r.id = c.run_id
WHERE r.workspace_id IS NULL;

-- ============================================================
-- 6. legacy_member_workspace_map is bijective by schema, so this should
--    always be empty -- included as a defensive check in case a future
--    schema change weakens that constraint without updating this migration's
--    assumption (same check as postflight_ga_workspace_backfill_invariants.sql).
-- ============================================================
SELECT member_id, COUNT(DISTINCT workspace_id) AS distinct_workspace_count
FROM legacy_member_workspace_map
GROUP BY member_id
HAVING COUNT(DISTINCT workspace_id) > 1;
