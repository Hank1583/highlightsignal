-- V10-03: Explanation & Business Impact. Brand-new table, same rule as
-- signals (024) / evidence_items (025) -- real NOT NULL FKs from creation,
-- no expand/backfill phases.
--
-- Design decisions made in this task (see task packet's execution log for
-- full reasoning):
--   * Explanation and Business Impact share ONE table (`signal_analyses`) --
--     per spec section 6, both "may co-exist as an Evidence Domain analysis
--     record" as long as API/UI fields stay separable. This avoids a
--     duplicated idempotency/versioning mechanism across two tables for data
--     that is always generated together in one pass.
--   * `evidence_ids_json` is the citation list -- every explanation/impact
--     here can point back to the specific Evidence rows it was built from.
--     Never reference raw source rows directly (spec: "Signals should never
--     reference raw payloads directly... Evidence explains why"; the same
--     rule applies transitively to Explanation/Impact, which cite Evidence,
--     not source rows).
--   * `analysis_key` is the idempotency key: a hash of the Signal's own
--     dedup_key, the exact sorted set of Evidence ids cited, and the
--     generator version. Re-running generation with the SAME Signal +
--     Evidence set + generator version upserts the existing row
--     (bumps `attempt_count`/`generated_at`) instead of creating an
--     unbounded number of near-identical versions on retry. A genuinely new
--     Evidence link, or a generator version bump, produces a new row --  a
--     real new version, not a duplicate.
--   * `status` makes "fail closed" a first-class, queryable state:
--     `insufficient_evidence` (no Evidence linked to the Signal yet) and
--     `failed` (generator errored) are stored outcomes with NULL
--     explanation/impact content, never a fabricated result standing in for
--     a failure.

CREATE TABLE IF NOT EXISTS signal_analyses (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id CHAR(36) NOT NULL,
  workspace_id BIGINT UNSIGNED NOT NULL,
  signal_id BIGINT UNSIGNED NOT NULL,
  analysis_key VARCHAR(191) NOT NULL,
  status ENUM('ok', 'insufficient_evidence', 'failed') NOT NULL DEFAULT 'ok',
  evidence_ids_json TEXT NOT NULL,
  explanation_text TEXT NULL,
  explanation_confidence DECIMAL(5,2) NULL,
  impact_area VARCHAR(50) NULL,
  impact_direction ENUM('positive', 'negative', 'neutral', 'unknown') NOT NULL DEFAULT 'unknown',
  impact_magnitude VARCHAR(50) NULL,
  impact_confidence DECIMAL(5,2) NULL,
  impact_basis TEXT NULL,
  impact_limitations TEXT NULL,
  generator_type ENUM('rule', 'ai') NOT NULL,
  generator_provider VARCHAR(50) NULL,
  generator_model VARCHAR(100) NULL,
  generator_version VARCHAR(50) NOT NULL,
  attempt_count INT UNSIGNED NOT NULL DEFAULT 1,
  generated_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_signal_analyses_public_id (public_id),
  UNIQUE KEY uk_signal_analyses_workspace_key (workspace_id, analysis_key),
  KEY idx_signal_analyses_workspace_signal (workspace_id, signal_id, generated_at),
  CONSTRAINT fk_signal_analyses_workspace
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_signal_analyses_signal
    FOREIGN KEY (signal_id) REFERENCES signals(id)
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
