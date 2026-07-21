-- Read-only. Run after migrations/015 (expand) and 016 (backfill) apply.
-- All four counts below must be 0 (or explicitly quarantined and understood)
-- before migrations/017_ga_connections_workspace_contract_DEFERRED.sql is
-- ever considered for promotion into migrations/.

-- Every ga_connections row should have a workspace_id after backfill.
SELECT COUNT(*) AS connections_without_workspace
FROM ga_connections
WHERE workspace_id IS NULL;

-- workspace_id should always point at a real, non-deleted workspace.
SELECT COUNT(*) AS connections_with_missing_workspace
FROM ga_connections gc
LEFT JOIN workspaces w ON w.id = gc.workspace_id AND w.deleted_at IS NULL
WHERE gc.workspace_id IS NOT NULL
  AND w.id IS NULL;

-- workspace_id should always be a workspace the connection's own member_id
-- can actually access (owner or member), not an unrelated workspace.
SELECT COUNT(*) AS connections_mapped_to_inaccessible_workspace
FROM ga_connections gc
LEFT JOIN workspace_members wm
  ON wm.workspace_id = gc.workspace_id
  AND wm.member_id = gc.member_id
  AND wm.status = 'active'
WHERE gc.workspace_id IS NOT NULL
  AND wm.workspace_id IS NULL;

-- legacy_member_workspace_map is bijective by schema, so this should always
-- be 0 -- included as a defensive check in case a future schema change
-- weakens that constraint without updating this migration's assumption.
SELECT member_id, COUNT(DISTINCT workspace_id) AS distinct_workspace_count
FROM legacy_member_workspace_map
GROUP BY member_id
HAVING COUNT(DISTINCT workspace_id) > 1;

-- Anomaly report: connections whose member_id has no legacy mapping at all,
-- so they were intentionally left workspace_id = NULL by the backfill.
-- Needs a manual ownership decision, not an automatic guess.
SELECT gc.id AS connection_id, gc.member_id, gc.property_id, gc.account_name
FROM ga_connections gc
LEFT JOIN legacy_member_workspace_map lwm ON lwm.member_id = gc.member_id
WHERE gc.workspace_id IS NULL
  AND lwm.workspace_id IS NULL;
