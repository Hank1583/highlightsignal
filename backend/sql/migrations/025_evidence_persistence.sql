-- V10-02: Evidence Persistence & Traceability. Like `signals` (024), these are
-- brand-new tables with no existing data to stay compatible with -- normal
-- NOT NULL FKs from creation, no expand/backfill/deferred-contract phases.
--
-- Design decisions made in this task (see task packet's execution log for
-- full reasoning):
--   * Snapshot, not live reference. `payload_json` is a self-contained copy
--     of the observed fact (site id, issue type/severity/url/message/
--     recommendation) -- not a foreign key into seo_scan_history that could
--     go stale or dangle if that row is later pruned (V11-08 retention). If
--     the source row is deleted, this table still shows exactly what was
--     true and `content_hash` still verifies it wasn't tampered with.
--   * `content_hash` is sha256 over only the STABLE fact fields (excludes
--     scan-run metadata like scanned_at/scan_history_id, which change on
--     every re-scan even when nothing about the underlying issue changed).
--     `dedup_key` = sha256(issue_identity . content_hash), where
--     issue_identity is the exact same value as the matching row in
--     `signals.dedup_key` (see migrations/024) -- this is what lets
--     EvidenceService look up "which Signal does this Evidence belong to"
--     without a second lookup table.
--   * Re-detecting byte-identical content upserts the SAME row (only
--     `source_ref_id`/`last_observed_at`/title/summary refresh) rather than
--     creating a duplicate snapshot -- `payload_json`/`content_hash`/
--     `observed_at` are frozen at first capture (snapshot immutability). A
--     genuine change in the fact's content changes `content_hash`, hence
--     `dedup_key`, hence creates a NEW row -- the old snapshot is preserved,
--     not overwritten.
--   * No independent `evidence_sources`/`evidence_relationships` lookup or
--     graph tables (unlike the older docs/5.database/05_Evidence_Database.md
--     draft, written for a different UUID/Postgres/JSONB architecture that
--     predates and conflicts with this project's MySQL-only, BIGINT-PK,
--     minimal-V1-module-boundary baseline -- see 00_Technical_Specification_
--     Alignment_v1.2.md section 7/8). `source`/`source_ref_type`/
--     `source_ref_id` columns (same shape as `signals`) are enough for V1;
--     a real relationship graph has no concrete V1 use case yet.

CREATE TABLE IF NOT EXISTS evidence_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id CHAR(36) NOT NULL,
  workspace_id BIGINT UNSIGNED NOT NULL,
  evidence_type VARCHAR(50) NOT NULL,
  source VARCHAR(50) NOT NULL,
  source_ref_type VARCHAR(50) NULL,
  source_ref_id BIGINT UNSIGNED NULL,
  dedup_key VARCHAR(191) NOT NULL,
  title VARCHAR(255) NOT NULL,
  summary TEXT NULL,
  payload_json LONGTEXT NOT NULL,
  content_hash CHAR(64) NOT NULL,
  observed_at DATETIME NOT NULL,
  last_observed_at DATETIME NOT NULL,
  captured_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_evidence_items_public_id (public_id),
  UNIQUE KEY uk_evidence_items_workspace_dedup (workspace_id, dedup_key),
  KEY idx_evidence_items_workspace_type (workspace_id, evidence_type, captured_at),
  KEY idx_evidence_items_source_ref (workspace_id, source, source_ref_type, source_ref_id),
  CONSTRAINT fk_evidence_items_workspace
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Many-to-many Signal <-> Evidence. UNIQUE(signal_id, evidence_id) is what
-- makes "re-running detection doesn't create a duplicate Evidence link" a
-- database guarantee, not just an application-level check.
CREATE TABLE IF NOT EXISTS signal_evidence_links (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  workspace_id BIGINT UNSIGNED NOT NULL,
  signal_id BIGINT UNSIGNED NOT NULL,
  evidence_id BIGINT UNSIGNED NOT NULL,
  relationship_type ENUM('primary', 'supporting') NOT NULL DEFAULT 'primary',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_signal_evidence_links (signal_id, evidence_id),
  KEY idx_signal_evidence_links_evidence (workspace_id, evidence_id),
  CONSTRAINT fk_signal_evidence_links_workspace
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_signal_evidence_links_signal
    FOREIGN KEY (signal_id) REFERENCES signals(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_signal_evidence_links_evidence
    FOREIGN KEY (evidence_id) REFERENCES evidence_items(id)
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
