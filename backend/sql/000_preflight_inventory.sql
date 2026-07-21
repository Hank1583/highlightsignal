-- Read-only preflight. Save these results before importing any migration.
SELECT VERSION() AS database_version;
SELECT DATABASE() AS database_name;

SELECT
  TABLE_NAME,
  ENGINE,
  TABLE_ROWS,
  TABLE_COLLATION
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = DATABASE()
ORDER BY TABLE_NAME;

SELECT
  TABLE_NAME,
  COLUMN_NAME,
  COLUMN_TYPE,
  IS_NULLABLE,
  COLUMN_KEY
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND COLUMN_NAME IN ('user_id', 'member_id', 'owner_member_id', 'workspace_id')
ORDER BY TABLE_NAME, ORDINAL_POSITION;

SELECT
  TABLE_NAME,
  INDEX_NAME,
  NON_UNIQUE,
  GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS indexed_columns
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE()
GROUP BY TABLE_NAME, INDEX_NAME, NON_UNIQUE
ORDER BY TABLE_NAME, INDEX_NAME;

-- V09-02 owner-source discovery. There is no local `members`/`users` table in
-- this schema at all -- account identity lives entirely in the external
-- legacy auth system, and product tables here only reference it by numeric
-- id. So "existing owner" cannot be read off one authoritative table; it has
-- to be the union of every table that already records product usage by
-- member/user id.
--
-- IMPORTANT: cross-check this list against the COLUMN_NAME inventory query
-- above. If that query lists a table with a member_id/user_id/owner_member_id
-- column that is NOT included in the UNION below, add it before trusting this
-- count -- otherwise real owners will be silently excluded from backfill, not
-- just miscounted.
SELECT
  candidate_member_id,
  CASE WHEN lwm.workspace_id IS NULL THEN 'UNMAPPED' ELSE 'ALREADY_MAPPED' END AS mapping_status
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
WHERE candidate_member_id > 0
ORDER BY mapping_status, candidate_member_id;

SELECT
  COUNT(*) AS total_candidate_owners,
  SUM(CASE WHEN lwm.workspace_id IS NULL THEN 1 ELSE 0 END) AS unmapped_count
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
WHERE candidate_member_id > 0;
