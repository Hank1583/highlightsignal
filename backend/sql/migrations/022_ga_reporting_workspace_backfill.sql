-- V09-08 backfill phase. Same rule as migrations/016 (GA connections) and 019
-- (SEO/SI): legacy_member_workspace_map is bijective by schema (member_id
-- PRIMARY KEY, workspace_id UNIQUE), so this join has no ambiguity -- at most
-- one workspace per user_id. Rows whose user_id has no
-- legacy_member_workspace_map entry stay workspace_id = NULL on purpose --
-- they are not guessed. They surface in
-- backend/sql/postflight_v09_08_ga_reporting_workspace_backfill_invariants.sql
-- as an anomaly to review, not silently dropped or auto-assigned.
--
-- Idempotent: only touches rows that are still NULL, so re-running after a
-- partial run (or after new legacy mappings appear) only picks up the delta.

UPDATE ga_report_schedules t
INNER JOIN legacy_member_workspace_map lwm ON lwm.member_id = t.user_id
SET t.workspace_id = lwm.workspace_id
WHERE t.workspace_id IS NULL;
