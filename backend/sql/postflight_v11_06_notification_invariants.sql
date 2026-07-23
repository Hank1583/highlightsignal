-- Read-only. Run after migrations/035_notification_persistence.sql.

SELECT TABLE_NAME, CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
FROM information_schema.KEY_COLUMN_USAGE
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME IN ('notifications', 'notification_preferences', 'notification_deliveries')
  AND REFERENCED_TABLE_NAME IS NOT NULL
ORDER BY TABLE_NAME, CONSTRAINT_NAME;

-- Cross-workspace sanity: a delivery's workspace_id must match its
-- notification's.
SELECT nd.id, nd.workspace_id AS delivery_workspace, n.workspace_id AS notification_workspace
FROM notification_deliveries nd
INNER JOIN notifications n ON n.id = nd.notification_id
WHERE nd.workspace_id <> n.workspace_id;

-- No duplicate (notification, channel) delivery rows -- the UNIQUE key
-- already enforces this; defensive double-check.
SELECT notification_id, channel, COUNT(*) AS c FROM notification_deliveries
GROUP BY notification_id, channel HAVING COUNT(*) > 1;

SELECT status, COUNT(*) AS c FROM notification_deliveries GROUP BY status;
SELECT event_type, severity, COUNT(*) AS c FROM notifications GROUP BY event_type, severity;
