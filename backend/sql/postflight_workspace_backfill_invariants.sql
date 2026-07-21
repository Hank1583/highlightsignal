-- Read-only. Run after migrations/014_workspace_owner_backfill.sql applies.
-- Every count below should be 0; anything else needs manual review before
-- V09-02 is considered done, per the task packet's invariants.

-- Invariant: every active workspace has exactly one resolvable owner.
SELECT COUNT(*) AS workspaces_without_owner_membership
FROM workspaces w
WHERE w.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = w.id AND wm.role = 'owner' AND wm.status = 'active'
  );

-- Invariant: legacy default mapping always points at a workspace the member
-- can actually access.
SELECT COUNT(*) AS orphaned_legacy_mappings
FROM legacy_member_workspace_map lwm
WHERE NOT EXISTS (
  SELECT 1 FROM workspace_members wm
  WHERE wm.workspace_id = lwm.workspace_id
    AND wm.member_id = lwm.member_id
    AND wm.status = 'active'
);

-- Invariant: no duplicate owner-membership rows for the same workspace.
SELECT workspace_id, COUNT(*) AS owner_membership_count
FROM workspace_members
WHERE role = 'owner' AND status = 'active'
GROUP BY workspace_id
HAVING COUNT(*) > 1;

-- Anomaly report: a `member-{id}`-slugged workspace exists but has no legacy
-- mapping -- either a slug collision the backfill skipped, or a workspace
-- created by some other path. Needs manual review, not an automatic merge.
SELECT w.id AS workspace_id, w.slug, w.owner_member_id
FROM workspaces w
WHERE w.slug LIKE 'member-%'
  AND NOT EXISTS (
    SELECT 1 FROM legacy_member_workspace_map lwm WHERE lwm.workspace_id = w.id
  );

-- Anomaly report: a candidate owner (same UNION source as the backfill
-- migration) still has no legacy mapping after the migration ran -- expected
-- to be empty; a nonzero result means the backfill's slug-collision guard
-- skipped a real owner and it needs a manual decision, not a re-run.
SELECT candidates.candidate_member_id
FROM (
  SELECT DISTINCT member_id AS candidate_member_id FROM ga_connections
  UNION SELECT DISTINCT user_id FROM seo_sites
  UNION SELECT DISTINCT user_id FROM si_sites
  UNION SELECT DISTINCT user_id FROM dashboard_ai_logs
  UNION SELECT DISTINCT user_id FROM dashboard_ai_plan_logs
  UNION SELECT DISTINCT user_id FROM seo_pagespeed_cache
  UNION SELECT DISTINCT user_id FROM seo_pagespeed_history
) candidates
LEFT JOIN legacy_member_workspace_map lwm ON lwm.member_id = candidates.candidate_member_id
WHERE candidates.candidate_member_id > 0
  AND lwm.workspace_id IS NULL;

-- Confirms multi-membership members are unrestricted by the default mapping:
-- every member's full active membership list.
SELECT wm.member_id, COUNT(*) AS active_membership_count, GROUP_CONCAT(wm.workspace_id) AS workspace_ids
FROM workspace_members wm
WHERE wm.status = 'active'
GROUP BY wm.member_id
HAVING COUNT(*) > 1;
