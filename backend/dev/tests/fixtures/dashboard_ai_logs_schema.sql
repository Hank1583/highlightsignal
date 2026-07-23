-- V12-05 test-only fixture: reproduces the FINAL real-schema shape of
-- `dashboard_ai_logs` after migrations/013 (CREATE TABLE) and migrations/018
-- (adds workspace_id) have both applied for real. Not applied via
-- bin/apply_test_schema.php's own migration chain because 013/018 are on
-- that script's documented exclusion list (legacy-table retrofit files that
-- also touch tables with no CREATE TABLE anywhere in this repo, e.g.
-- seo_sites) -- this fixture exists precisely because RetentionCleanupServiceTest
-- genuinely needs this one table, matching apply_test_schema.php's own
-- guidance to add a real fixture rather than widen that exclusion list.
CREATE TABLE IF NOT EXISTS dashboard_ai_logs (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL DEFAULT 0,
    workspace_id BIGINT UNSIGNED NULL,
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
    KEY idx_dashboard_ai_logs_lens (lens),
    KEY idx_dashboard_ai_logs_workspace (workspace_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
