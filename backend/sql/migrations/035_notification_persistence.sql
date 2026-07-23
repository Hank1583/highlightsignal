-- V11-06: Notification. Three brand-new tables, real FKs from creation.
--
--   * `notifications`: one row per (recipient, event). `UNIQUE(workspace_id,
--     recipient_member_id, dedup_key)` is the actual dedup mechanism --
--     "同一 event/recipient 重放不重複通知" is a DB guarantee via
--     `NotificationRepository`'s create-or-return-existing, not an
--     application-level check that could race.
--   * `notification_preferences`: per (member, event_type, channel) opt
--     in/out. No row for a given (member, event_type, channel) means the
--     DEFAULT applies (in_app=enabled, email=disabled -- see
--     NotificationService::DEFAULT_CHANNEL_ENABLED) -- this is an opt-OUT
--     model for in_app (everyone gets in-app unless they explicitly
--     disable it) and an opt-IN model for email (nobody gets email until
--     they explicitly enable it), matching "不承諾未配置 provider 的 email
--     已可用" -- email additionally requires the provider itself to be
--     configured (checked in code, not here) before ANY email can be sent
--     regardless of preference.
--   * `notification_deliveries`: one row per (notification, channel) --
--     `UNIQUE(notification_id, channel)` makes a re-delivery attempt for
--     the same notification+channel idempotent (create-or-return-existing,
--     same as `notifications` itself). `queue_job_id` is set only for the
--     `email` channel (delivery via V11-02's Queue, per "Delivery 經 queue
--     執行...不得在 domain transaction 內同步呼叫外部 provider") -- `in_app`
--     delivery is synchronous and immediate (a notification row simply
--     being visible via the read API IS its own delivery, no external
--     call, no queue needed).

CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id CHAR(36) NOT NULL,
  workspace_id BIGINT UNSIGNED NOT NULL,
  recipient_member_id BIGINT UNSIGNED NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  severity ENUM('info', 'warning', 'critical') NOT NULL DEFAULT 'info',
  title VARCHAR(255) NOT NULL,
  body TEXT NULL,
  entity_type VARCHAR(50) NULL,
  entity_id VARCHAR(100) NULL,
  dedup_key VARCHAR(191) NOT NULL,
  status ENUM('unread', 'read', 'dismissed') NOT NULL DEFAULT 'unread',
  read_at DATETIME NULL,
  dismissed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_notifications_public_id (public_id),
  UNIQUE KEY uk_notifications_workspace_recipient_dedup (workspace_id, recipient_member_id, dedup_key),
  KEY idx_notifications_recipient_status (workspace_id, recipient_member_id, status, created_at),
  CONSTRAINT fk_notifications_workspace
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notification_preferences (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  workspace_id BIGINT UNSIGNED NOT NULL,
  member_id BIGINT UNSIGNED NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  channel ENUM('in_app', 'email') NOT NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_notification_pref_identity (workspace_id, member_id, event_type, channel),
  CONSTRAINT fk_notification_pref_workspace
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notification_deliveries (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id CHAR(36) NOT NULL,
  workspace_id BIGINT UNSIGNED NOT NULL,
  notification_id BIGINT UNSIGNED NOT NULL,
  channel ENUM('in_app', 'email') NOT NULL,
  status ENUM('delivered', 'pending', 'sent', 'failed', 'dead_letter', 'skipped_disabled', 'skipped_unconfigured') NOT NULL,
  attempt INT UNSIGNED NOT NULL DEFAULT 1,
  queue_job_id BIGINT UNSIGNED NULL,
  error_message TEXT NULL,
  delivered_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_notification_delivery_public_id (public_id),
  UNIQUE KEY uk_notification_delivery_identity (notification_id, channel),
  KEY idx_notification_delivery_status (workspace_id, status),
  CONSTRAINT fk_notification_delivery_workspace
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_notification_delivery_notification
    FOREIGN KEY (notification_id) REFERENCES notifications(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_notification_delivery_queue_job
    FOREIGN KEY (queue_job_id) REFERENCES queue_jobs(id)
    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
