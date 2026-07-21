-- V10-04: Recommendation Formalization -- expand phase on the EXISTING,
-- already-live `recommendations` table (migrations/011). Unlike signals/
-- evidence_items/signal_analyses, this table already has real usage
-- (WorkflowController/Service, called from DashboardWorkspace.tsx and
-- seo/page.tsx's "建立 Dashboard 任務" flow) -- this migration follows the
-- Workspace-retrofit convention (nullable expand, never a destructive
-- change) rather than the "brand-new table" convention 024-026 used, even
-- though it's additive-only just like those.
--
-- All new columns are NULLABLE or have a safe DEFAULT so every existing row
-- (and the existing INSERT/UPDATE statements in WorkflowRepository that
-- don't mention these columns) keeps working unchanged. `generator_type`
-- defaults to 'frontend_legacy' -- an existing row (or a context_key this
-- task doesn't resolve a Signal for) is explicitly marked as "content came
-- from the frontend", not silently reclassified as backend-verified.
--
-- See ExplanationService's task packet execution log and this task's own
-- log for why `signal_id` is nullable (a Recommendation whose context_key
-- has no matching Signal -- e.g. the onboarding nudges like
-- "dashboard:connect_ga" -- keeps working exactly as before, unformalized,
-- per the task packet's explicit "不一次移除 legacy 相容流程" instruction).

ALTER TABLE recommendations
  ADD COLUMN signal_id BIGINT UNSIGNED NULL AFTER context_key,
  ADD COLUMN priority ENUM('critical', 'high', 'medium', 'low') NULL AFTER title,
  ADD COLUMN confidence DECIMAL(5,2) NULL,
  ADD COLUMN expected_impact TEXT NULL,
  ADD COLUMN suggested_action TEXT NULL,
  ADD COLUMN reason TEXT NULL,
  ADD COLUMN generator_type ENUM('backend_rule', 'frontend_legacy') NOT NULL DEFAULT 'frontend_legacy',
  ADD COLUMN generator_version VARCHAR(50) NULL,
  ADD COLUMN revision INT UNSIGNED NOT NULL DEFAULT 1,
  ADD KEY idx_recommendations_signal (signal_id),
  ADD CONSTRAINT fk_recommendations_signal
    FOREIGN KEY (signal_id) REFERENCES signals(id)
    ON DELETE RESTRICT;
