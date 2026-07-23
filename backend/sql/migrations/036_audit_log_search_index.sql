-- V11-07: Audit Log Complete Coverage. No new table -- `audit_logs` has
-- existed since migrations/010 and stays append-only (no UPDATE/DELETE call
-- site anywhere in this codebase, grep-verified; see
-- backend/sql/VERIFICATION_RUNBOOK.md section 19).
--
-- This migration adds exactly one index. Before this task, every writer
-- queried `audit_logs` by (workspace_id, created_at) or (workspace_id,
-- entity_type, entity_id) or (workspace_id, actor_member_id, created_at) --
-- all already indexed (migrations/010). V11-07 adds a real Workspace-scoped
-- search/read API (`AuditController::index()` -> `AuditRepository::search()`)
-- that also filters by `event_type` alone (the converged event-naming
-- catalog, see VERIFICATION_RUNBOOK section 19) -- without this index that
-- query would fall back to the (workspace_id, created_at) index and scan
-- every row for the workspace.
--
-- Purely additive (ADD INDEX only) -- no column changes, no data migration,
-- safe to run on a live table with existing rows.

ALTER TABLE audit_logs
  ADD INDEX idx_audit_logs_workspace_event (workspace_id, event_type, created_at);
