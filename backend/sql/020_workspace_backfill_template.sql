-- TEMPLATE ONLY. Review and replace every SET value before execution.
-- Run once for each existing owner/member that needs a default Workspace.

START TRANSACTION;

SET @member_id = 0;
SET @workspace_name = 'REPLACE_ME';
SET @workspace_slug = 'replace-me';

SELECT
  CASE WHEN @member_id > 0 THEN 'READY' ELSE 'STOP: replace @member_id' END AS template_status,
  @member_id AS member_id,
  @workspace_slug AS workspace_slug;

INSERT INTO workspaces (
  public_id,
  owner_member_id,
  name,
  slug,
  status
) VALUES (
  UUID(),
  @member_id,
  @workspace_name,
  @workspace_slug,
  'active'
);

SET @workspace_id = LAST_INSERT_ID();

INSERT INTO workspace_members (
  workspace_id,
  member_id,
  role,
  status,
  joined_at
) VALUES (
  @workspace_id,
  @member_id,
  'owner',
  'active',
  NOW()
);

INSERT INTO workspace_settings (
  workspace_id,
  locale,
  timezone
) VALUES (
  @workspace_id,
  'zh-TW',
  'Asia/Taipei'
);

INSERT INTO legacy_member_workspace_map (
  member_id,
  workspace_id
) VALUES (
  @member_id,
  @workspace_id
);

SELECT @workspace_id AS created_workspace_id, @member_id AS owner_member_id;

-- Do not add workspace_id to legacy tables until the preflight inventory
-- confirms their real names, ownership columns, keys, and row counts.

ROLLBACK;

-- This template always rolls back. Create a reviewed migration before using
-- COMMIT; do not edit and run this file directly in production.
