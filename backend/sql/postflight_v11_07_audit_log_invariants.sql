-- Read-only. Run after migrations/036_audit_log_search_index.sql.

-- The new search index exists.
SELECT COUNT(*) AS idx_exists
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'audit_logs'
  AND INDEX_NAME = 'idx_audit_logs_workspace_event';

-- Append-only, structurally: no other schema object (trigger, view) grants
-- write access to this table beyond a plain application-level INSERT.
SELECT TRIGGER_NAME, EVENT_MANIPULATION
FROM information_schema.TRIGGERS
WHERE EVENT_OBJECT_SCHEMA = DATABASE() AND EVENT_OBJECT_TABLE = 'audit_logs';

-- No orphaned rows -- every workspace_id still resolves (the FK already
-- enforces this going forward; defensive double-check against anything
-- that predates it).
SELECT al.workspace_id, COUNT(*) AS c
FROM audit_logs al
LEFT JOIN workspaces w ON w.id = al.workspace_id
WHERE w.id IS NULL
GROUP BY al.workspace_id;

-- No secret-shaped substrings leaked into metadata_json despite AuditLogger's
-- redaction (defensive spot-check, not a substitute for the rehearsal's
-- assertions -- see VERIFICATION_RUNBOOK section 19).
SELECT id, event_type, entity_type, entity_id
FROM audit_logs
WHERE (metadata_json LIKE '%"password":"%' AND metadata_json NOT LIKE '%"password":"[REDACTED]"%')
   OR (metadata_json LIKE '%"api_key":"%' AND metadata_json NOT LIKE '%"api_key":"[REDACTED]"%')
   OR (metadata_json LIKE '%"secret":"%' AND metadata_json NOT LIKE '%"secret":"[REDACTED]"%')
   OR (metadata_json LIKE '%Bearer %' AND metadata_json NOT LIKE '%Bearer [REDACTED]%')
LIMIT 50;

SELECT event_type, COUNT(*) AS c FROM audit_logs GROUP BY event_type ORDER BY c DESC;
