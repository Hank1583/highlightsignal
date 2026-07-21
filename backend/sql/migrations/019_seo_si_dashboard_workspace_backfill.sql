-- V09-04 backfill phase. Same rule as migrations/016 (GA):
-- legacy_member_workspace_map is bijective by schema (member_id PRIMARY KEY,
-- workspace_id UNIQUE), so this join has no ambiguity -- at most one
-- workspace per member_id/user_id. Rows whose user_id has no
-- legacy_member_workspace_map entry stay workspace_id = NULL on purpose --
-- they are not guessed. They surface in
-- backend/sql/postflight_v09_04_seo_si_dashboard_workspace_backfill_invariants.sql
-- as an anomaly to review, not silently dropped or auto-assigned.
--
-- Idempotent: every statement only touches rows that are still NULL, so
-- re-running after a partial run (or after new legacy mappings appear) only
-- picks up the delta.

UPDATE seo_sites t
INNER JOIN legacy_member_workspace_map lwm ON lwm.member_id = t.user_id
SET t.workspace_id = lwm.workspace_id
WHERE t.workspace_id IS NULL;

UPDATE seo_summary_cache t
INNER JOIN legacy_member_workspace_map lwm ON lwm.member_id = t.user_id
SET t.workspace_id = lwm.workspace_id
WHERE t.workspace_id IS NULL;

UPDATE seo_scan_history t
INNER JOIN legacy_member_workspace_map lwm ON lwm.member_id = t.user_id
SET t.workspace_id = lwm.workspace_id
WHERE t.workspace_id IS NULL;

UPDATE si_sites t
INNER JOIN legacy_member_workspace_map lwm ON lwm.member_id = t.user_id
SET t.workspace_id = lwm.workspace_id
WHERE t.workspace_id IS NULL;

UPDATE si_analysis_runs t
INNER JOIN legacy_member_workspace_map lwm ON lwm.member_id = t.user_id
SET t.workspace_id = lwm.workspace_id
WHERE t.workspace_id IS NULL;

UPDATE dashboard_ai_logs t
INNER JOIN legacy_member_workspace_map lwm ON lwm.member_id = t.user_id
SET t.workspace_id = lwm.workspace_id
WHERE t.workspace_id IS NULL;

UPDATE dashboard_ai_plan_logs t
INNER JOIN legacy_member_workspace_map lwm ON lwm.member_id = t.user_id
SET t.workspace_id = lwm.workspace_id
WHERE t.workspace_id IS NULL;

UPDATE seo_pagespeed_cache t
INNER JOIN legacy_member_workspace_map lwm ON lwm.member_id = t.user_id
SET t.workspace_id = lwm.workspace_id
WHERE t.workspace_id IS NULL;

UPDATE seo_pagespeed_history t
INNER JOIN legacy_member_workspace_map lwm ON lwm.member_id = t.user_id
SET t.workspace_id = lwm.workspace_id
WHERE t.workspace_id IS NULL;
