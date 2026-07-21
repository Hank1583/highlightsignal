-- Read-only. Run before migrations/024_signal_persistence.sql.
--
-- Unlike the Workspace-retrofit preflights (000, preflight_v09_04_*,
-- preflight_v09_08_*), `signals` is a brand-new table with no pre-existing
-- data or column layout to verify against real usage code -- this preflight
-- only needs to confirm (a) the table doesn't already exist under a
-- conflicting definition, and (b) its FK target is in the expected shape.

-- Should return 0 rows: if this is nonzero, a `signals` table already exists
-- on this host and its real column list needs to be compared against
-- migrations/024 by hand before running the CREATE TABLE (which is
-- `IF NOT EXISTS` and would silently no-op against an incompatible existing
-- table rather than fail).
SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'signals'
ORDER BY ORDINAL_POSITION;

-- Confirms the FK target (workspaces.id) exists and is the expected type
-- (BIGINT UNSIGNED) before the CREATE TABLE's FK clause runs.
SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'workspaces'
  AND COLUMN_NAME = 'id';

-- Confirms seo_scan_history and seo_sites (the source data the first
-- detector reads) still have the workspace_id column V09-04 added, since the
-- detector is triggered from si/seo/summary.php right after a
-- seo_scan_history write.
SELECT TABLE_NAME, COLUMN_NAME
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('seo_scan_history', 'seo_sites')
  AND COLUMN_NAME = 'workspace_id';
