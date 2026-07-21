-- Read-only. Run after migrations/025_evidence_persistence.sql applies.
--
-- Like signals' postflight, evidence_items/signal_evidence_links have
-- enforced NOT NULL + FKs from creation, so orphan/missing-workspace rows are
-- impossible by construction. This confirms structure, plus a few
-- informational queries once the SEO detector has actually recorded Evidence.

-- ============================================================
-- 1. Structural check: both FKs on signal_evidence_links (workspace, signal,
--    evidence) and the one FK on evidence_items (workspace) should all show
--    up here.
-- ============================================================
SELECT CONSTRAINT_NAME, TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('evidence_items', 'signal_evidence_links')
  AND REFERENCED_TABLE_NAME IS NOT NULL
ORDER BY TABLE_NAME, CONSTRAINT_NAME;

SELECT TABLE_NAME, INDEX_NAME, NON_UNIQUE, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS indexed_columns
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('evidence_items', 'signal_evidence_links')
GROUP BY TABLE_NAME, INDEX_NAME, NON_UNIQUE
ORDER BY TABLE_NAME, INDEX_NAME;

-- ============================================================
-- 2. Defensive invariants (should always be 0 given the FKs/unique keys;
--    cheap sanity checks, not expected to ever fire).
-- ============================================================
SELECT COUNT(*) AS evidence_with_missing_workspace
FROM evidence_items e
LEFT JOIN workspaces w ON w.id = e.workspace_id AND w.deleted_at IS NULL
WHERE w.id IS NULL;

SELECT workspace_id, dedup_key, COUNT(*) AS duplicate_count
FROM evidence_items
GROUP BY workspace_id, dedup_key
HAVING COUNT(*) > 1;

SELECT signal_id, evidence_id, COUNT(*) AS duplicate_count
FROM signal_evidence_links
GROUP BY signal_id, evidence_id
HAVING COUNT(*) > 1;

-- Every link's signal and evidence should belong to the SAME workspace as
-- the link row itself -- a mismatch here would mean the Service-level check
-- (comparing signal.workspace_id === evidence.workspace_id before linking)
-- was bypassed somewhere.
SELECT sel.id AS link_id, sel.workspace_id AS link_workspace_id,
       s.workspace_id AS signal_workspace_id, e.workspace_id AS evidence_workspace_id
FROM signal_evidence_links sel
INNER JOIN signals s ON s.id = sel.signal_id
INNER JOIN evidence_items e ON e.id = sel.evidence_id
WHERE sel.workspace_id <> s.workspace_id OR sel.workspace_id <> e.workspace_id;

-- ============================================================
-- 3. Informational, once the SEO detector has recorded Evidence at least
--    once: every Signal should have at least one linked Evidence row (spec:
--    "No Signal should exist without traceable supporting Evidence").
--    Nonzero here for a `source='seo'` signal is worth investigating, not
--    necessarily a bug for other future sources this migration doesn't cover.
-- ============================================================
SELECT s.id AS signal_id, s.public_id, s.source, s.dedup_key
FROM signals s
LEFT JOIN signal_evidence_links sel ON sel.signal_id = s.id
WHERE s.source = 'seo' AND sel.id IS NULL;

SELECT source, evidence_type, COUNT(*) AS evidence_count
FROM evidence_items
GROUP BY source, evidence_type
ORDER BY source, evidence_type;
