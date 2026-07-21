-- V09-03 backfill phase. legacy_member_workspace_map is bijective by schema
-- (member_id PRIMARY KEY, workspace_id UNIQUE) -- unlike the generic
-- "ambiguous mapping" problem this kind of backfill usually has to solve,
-- this specific join has no ambiguity: at most one workspace per member_id.
--
-- Rows whose member_id has no legacy_member_workspace_map entry at all stay
-- workspace_id = NULL here on purpose -- they are not guessed. They surface
-- in backend/sql/postflight_ga_workspace_backfill_invariants.sql as an
-- anomaly to review, not silently dropped or auto-assigned.
--
-- Idempotent: only touches rows that are still NULL, so re-running after a
-- partial run (or after new legacy mappings appear) only picks up the delta.

UPDATE ga_connections gc
INNER JOIN legacy_member_workspace_map lwm ON lwm.member_id = gc.member_id
SET gc.workspace_id = lwm.workspace_id
WHERE gc.workspace_id IS NULL;
