-- V09-02 Workspace owner backfill.
--
-- There is no local members/users table in this schema; the source of truth
-- for "existing owner" is the union of every table that already records
-- product usage by member/user id -- the same UNION reviewed in
-- backend/sql/000_preflight_inventory.sql. Keep both lists in sync: if a new
-- product table with a member_id/user_id column is added, add it to both
-- places, not just one.
--
-- Idempotent and safe to re-run:
--   * A candidate already present in legacy_member_workspace_map is treated
--     as already backfilled (via this migration or the historical lazy-GET
--     path) and is skipped entirely by every statement below.
--   * Each of the 4 inserts is independently NOT EXISTS-guarded and looks up
--     the workspace by its deterministic slug rather than an assumed
--     LAST_INSERT_ID(), so a partially-provisioned workspace (e.g. the
--     `workspaces` row exists but `workspace_settings` doesn't) gets
--     completed in place instead of duplicated.
--   * A slug collision with a workspace that has no legacy mapping is left
--     alone (not overwritten, not duplicated) -- it surfaces in the
--     postflight invariant queries in
--     backend/sql/postflight_workspace_backfill_invariants.sql for manual
--     review instead of being guessed here.

INSERT INTO workspaces (public_id, owner_member_id, name, slug, status)
SELECT
  UUID(),
  candidates.candidate_member_id,
  CONCAT('Workspace ', candidates.candidate_member_id),
  CONCAT('member-', candidates.candidate_member_id),
  'active'
FROM (
  SELECT DISTINCT member_id AS candidate_member_id FROM ga_connections
  UNION SELECT DISTINCT user_id FROM seo_sites
  UNION SELECT DISTINCT user_id FROM si_sites
  UNION SELECT DISTINCT user_id FROM dashboard_ai_logs
  UNION SELECT DISTINCT user_id FROM dashboard_ai_plan_logs
  UNION SELECT DISTINCT user_id FROM seo_pagespeed_cache
  UNION SELECT DISTINCT user_id FROM seo_pagespeed_history
) candidates
WHERE candidates.candidate_member_id > 0
  AND NOT EXISTS (
    SELECT 1 FROM legacy_member_workspace_map lwm
    WHERE lwm.member_id = candidates.candidate_member_id
  )
  AND NOT EXISTS (
    SELECT 1 FROM workspaces w
    WHERE w.slug = CONCAT('member-', candidates.candidate_member_id)
  );

INSERT INTO workspace_members (workspace_id, member_id, role, status, invited_at, joined_at)
SELECT
  w.id,
  candidates.candidate_member_id,
  'owner',
  'active',
  NOW(),
  NOW()
FROM (
  SELECT DISTINCT member_id AS candidate_member_id FROM ga_connections
  UNION SELECT DISTINCT user_id FROM seo_sites
  UNION SELECT DISTINCT user_id FROM si_sites
  UNION SELECT DISTINCT user_id FROM dashboard_ai_logs
  UNION SELECT DISTINCT user_id FROM dashboard_ai_plan_logs
  UNION SELECT DISTINCT user_id FROM seo_pagespeed_cache
  UNION SELECT DISTINCT user_id FROM seo_pagespeed_history
) candidates
INNER JOIN workspaces w ON w.slug = CONCAT('member-', candidates.candidate_member_id)
WHERE candidates.candidate_member_id > 0
  AND NOT EXISTS (
    SELECT 1 FROM legacy_member_workspace_map lwm
    WHERE lwm.member_id = candidates.candidate_member_id
  )
  AND NOT EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = w.id AND wm.member_id = candidates.candidate_member_id
  );

INSERT INTO workspace_settings (workspace_id, locale, timezone)
SELECT
  w.id,
  'zh-TW',
  'Asia/Taipei'
FROM (
  SELECT DISTINCT member_id AS candidate_member_id FROM ga_connections
  UNION SELECT DISTINCT user_id FROM seo_sites
  UNION SELECT DISTINCT user_id FROM si_sites
  UNION SELECT DISTINCT user_id FROM dashboard_ai_logs
  UNION SELECT DISTINCT user_id FROM dashboard_ai_plan_logs
  UNION SELECT DISTINCT user_id FROM seo_pagespeed_cache
  UNION SELECT DISTINCT user_id FROM seo_pagespeed_history
) candidates
INNER JOIN workspaces w ON w.slug = CONCAT('member-', candidates.candidate_member_id)
WHERE candidates.candidate_member_id > 0
  AND NOT EXISTS (
    SELECT 1 FROM legacy_member_workspace_map lwm
    WHERE lwm.member_id = candidates.candidate_member_id
  )
  AND NOT EXISTS (
    SELECT 1 FROM workspace_settings ws
    WHERE ws.workspace_id = w.id
  );

INSERT INTO legacy_member_workspace_map (member_id, workspace_id)
SELECT
  candidates.candidate_member_id,
  w.id
FROM (
  SELECT DISTINCT member_id AS candidate_member_id FROM ga_connections
  UNION SELECT DISTINCT user_id FROM seo_sites
  UNION SELECT DISTINCT user_id FROM si_sites
  UNION SELECT DISTINCT user_id FROM dashboard_ai_logs
  UNION SELECT DISTINCT user_id FROM dashboard_ai_plan_logs
  UNION SELECT DISTINCT user_id FROM seo_pagespeed_cache
  UNION SELECT DISTINCT user_id FROM seo_pagespeed_history
) candidates
INNER JOIN workspaces w ON w.slug = CONCAT('member-', candidates.candidate_member_id)
WHERE candidates.candidate_member_id > 0
  AND NOT EXISTS (
    SELECT 1 FROM legacy_member_workspace_map lwm
    WHERE lwm.member_id = candidates.candidate_member_id
  );
