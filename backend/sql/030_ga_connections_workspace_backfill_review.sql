-- REVIEW SCRIPT. The SELECT statements are safe and read-only.
-- The ALTER/UPDATE statements remain commented until production inventory
-- confirms the exact ga_connections schema and every member has one mapping.

SELECT
  gc.member_id,
  COUNT(*) AS connection_count,
  lwm.workspace_id,
  CASE WHEN lwm.workspace_id IS NULL THEN 'MISSING_MAPPING' ELSE 'READY' END AS mapping_status
FROM ga_connections gc
LEFT JOIN legacy_member_workspace_map lwm ON lwm.member_id = gc.member_id
GROUP BY gc.member_id, lwm.workspace_id
ORDER BY gc.member_id;

SELECT COUNT(*) AS connections_without_workspace_mapping
FROM ga_connections gc
LEFT JOIN legacy_member_workspace_map lwm ON lwm.member_id = gc.member_id
WHERE lwm.workspace_id IS NULL;

-- Execute the following only in a reviewed migration after the missing count is zero.
-- MySQL DDL auto-commits; a normal ROLLBACK cannot undo ALTER TABLE.

-- ALTER TABLE ga_connections
--   ADD COLUMN workspace_id BIGINT UNSIGNED NULL AFTER member_id,
--   ADD KEY idx_ga_connections_workspace (workspace_id, status, created_at);

-- UPDATE ga_connections gc
-- INNER JOIN legacy_member_workspace_map lwm ON lwm.member_id = gc.member_id
-- SET gc.workspace_id = lwm.workspace_id
-- WHERE gc.workspace_id IS NULL;

-- SELECT COUNT(*) AS remaining_null_workspace_ids
-- FROM ga_connections
-- WHERE workspace_id IS NULL;

-- After the remaining count is zero and API compatibility tests pass:
-- ALTER TABLE ga_connections
--   MODIFY workspace_id BIGINT UNSIGNED NOT NULL,
--   ADD CONSTRAINT fk_ga_connections_workspace
--     FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
--     ON DELETE RESTRICT;

-- Keep member_id during V1 migration. Do not drop it in this phase.
