# 07_Notification_Database.md

# Notification Database

> **V12-06 note (2026-07-22)**: pre-implementation Draft (a
> `notification_channels` lookup table with JSONB `configuration`) — does
> not match what actually shipped. Real schema:
> `backend/sql/migrations/035_notification_persistence.sql` — `channel` is
> a plain `ENUM('in_app','email')` column directly on
> `notification_preferences`/`notification_deliveries`, no separate channel
> lookup table. Treat this file as historical design intent, not a current
> reference.

Version: v1.0

Status: Draft (superseded by real implementation — see note above)

Layer: Database Specification

Depends On:

* 01_Database_Overview
* 02_Workspace_Database
* 03_User_Account_Database
* 04_Signal_Database
* 06_Recommendation_Database
* Notification Framework
* Architecture v1.0 Frozen

---

# Purpose

> V1 Alignment Patch: Notifications are persisted delivery resources produced in response to internal Domain Events. Notification records do not own or alter the underlying business decision.

The Notification database defines the decision delivery layer of Highlight Signal.

Notifications ensure that important Signals and Recommendations reach the appropriate users through the appropriate communication channels.

Notifications are event-driven delivery records.

They preserve delivery history, user acknowledgement, retry attempts, and channel-specific metadata.

The Notification domain is designed for reliable, auditable, and multi-channel communication.

---

# Domain Responsibility

The Notification domain is responsible for:

* Notification creation
* Delivery routing
* Channel selection
* Delivery status
* Retry management
* User acknowledgement
* Notification history

The Notification domain is **not** responsible for:

* Signal generation
* Recommendation generation
* User authentication
* Dashboard rendering

---

# Core Entities

```text id="notif01"
notifications

notification_channels

notification_delivery_attempts

notification_preferences
```

---

# Aggregate Structure

```text id="notif02"
Notification

├── Channel
├── Delivery Attempts
├── User Preference
├── Signal Reference
└── Recommendation Reference
```

Notification is the Aggregate Root of the delivery layer.

---

# Entity Definition

---

## notifications

Represents one notification delivered to one user.

### Fields

| Field             | Type         | Required | Description            |
| ----------------- | ------------ | -------- | ---------------------- |
| id                | UUID         | Yes      | Primary key            |
| workspace_id      | UUID         | Yes      | Workspace owner        |
| user_id           | UUID         | Yes      | Target user            |
| signal_id         | UUID         | No       | Related signal         |
| recommendation_id | UUID         | No       | Related recommendation |
| channel_id        | UUID         | Yes      | Delivery channel       |
| title             | VARCHAR(255) | Yes      | Notification title     |
| message           | TEXT         | Yes      | Notification body      |
| priority          | VARCHAR(20)  | Yes      | Delivery priority      |
| status            | VARCHAR(30)  | Yes      | Delivery status        |
| scheduled_at      | TIMESTAMP    | No       | Scheduled delivery     |
| delivered_at      | TIMESTAMP    | No       | Successful delivery    |
| acknowledged_at   | TIMESTAMP    | No       | User acknowledgement   |
| expires_at        | TIMESTAMP    | No       | Expiration             |
| created_at        | TIMESTAMP    | Yes      | Created time           |
| updated_at        | TIMESTAMP    | Yes      | Updated time           |

---

### Priority

```text id="notif03"
critical

high

normal

low
```

---

### Status

```text id="notif04"
pending

scheduled

sending

delivered

failed

acknowledged

expired

cancelled
```

---

## notification_channels

Defines supported delivery channels.

### Fields

| Field         | Type         |
| ------------- | ------------ |
| id            | UUID         |
| code          | VARCHAR(50)  |
| name          | VARCHAR(100) |
| provider      | VARCHAR(100) |
| configuration | JSONB        |
| enabled       | BOOLEAN      |
| created_at    | TIMESTAMP    |

---

### Example Channels

```text id="notif05"
In-App

Email

Slack

Discord

Microsoft Teams

SMS

Webhook

Push Notification
```

---

## notification_delivery_attempts

Stores every delivery attempt.

### Fields

| Field               | Type      |
| ------------------- | --------- |
| id                  | UUID      |
| notification_id     | UUID      |
| attempt_number      | INTEGER   |
| provider_message_id | VARCHAR   |
| status              | VARCHAR   |
| error_code          | VARCHAR   |
| error_message       | TEXT      |
| attempted_at        | TIMESTAMP |

Every attempt is preserved.

---

## notification_preferences

Defines user notification preferences.

One record per user per workspace.

### Fields

| Field              | Type      |
| ------------------ | --------- |
| id                 | UUID      |
| workspace_id       | UUID      |
| user_id            | UUID      |
| enabled_channels   | JSONB     |
| quiet_hours        | JSONB     |
| severity_threshold | VARCHAR   |
| digest_enabled     | BOOLEAN   |
| realtime_enabled   | BOOLEAN   |
| created_at         | TIMESTAMP |
| updated_at         | TIMESTAMP |

---

# Relationships

```text id="notif06"
Workspace

↓

User

↓

Notification

├── Channel

├── Delivery Attempts

└── Signal

└── Recommendation
```

---

## Cardinality

```text id="notif07"
Workspace

↓

Many Notifications

User

↓

Many Notifications

Notification

↓

One Channel

Notification

↓

Many Delivery Attempts

User

↓

One Preference Per Workspace
```

---

# Primary Keys

```text id="notif08"
notifications.id

notification_channels.id

notification_delivery_attempts.id

notification_preferences.id
```

---

# Foreign Keys

```text id="notif09"
notifications.workspace_id
→ workspaces.id
```

```text id="notif10"
notifications.user_id
→ users.id
```

```text id="notif11"
notifications.signal_id
→ signals.id
```

```text id="notif12"
notifications.recommendation_id
→ recommendations.id
```

```text id="notif13"
notifications.channel_id
→ notification_channels.id
```

```text id="notif14"
notification_delivery_attempts.notification_id
→ notifications.id
```

```text id="notif15"
notification_preferences.workspace_id
→ workspaces.id
```

```text id="notif16"
notification_preferences.user_id
→ users.id
```

---

# Lifecycle

## Notification Created

```text id="notif17"
Signal

↓

Recommendation

↓

Notification Created
```

---

## Delivery

```text id="notif18"
Pending

↓

Sending

↓

Delivered
```

---

## Retry

```text id="notif19"
Failed

↓

Retry

↓

Delivered

or

Failed
```

---

## User Acknowledgement

```text id="notif20"
Delivered

↓

Acknowledged
```

---

## Expiration

```text id="notif21"
Delivered

↓

Expired
```

Expired notifications remain in history.

---

# Index Strategy

## Workspace Timeline

```sql id="notif22"
INDEX(workspace_id, created_at DESC)
```

---

## User Inbox

```sql id="notif23"
INDEX(user_id, status)
```

---

## Signal Lookup

```sql id="notif24"
INDEX(signal_id)
```

---

## Recommendation Lookup

```sql id="notif25"
INDEX(recommendation_id)
```

---

## Scheduled Delivery

```sql id="notif26"
INDEX(status, scheduled_at)
```

---

## Retry Queue

```sql id="notif27"
INDEX(status, created_at)
```

---

## Delivery Attempts

```sql id="notif28"
INDEX(notification_id)
```

---

# Constraints

---

## Ownership

Every Notification belongs to one Workspace and one User.

---

## Delivery Target

A Notification should reference at least one business object:

* Signal
* Recommendation

At least one of `signal_id` or `recommendation_id` must be present.

---

## Channel

A Notification uses exactly one delivery channel.

Multi-channel delivery is represented by multiple Notification records.

---

## Delivery Attempts

Attempts are append-only.

Historical delivery information must never be overwritten.

---

## Preferences

Only one notification preference record is allowed per:

```text id="notif29"
workspace_id

+

user_id
```

Recommended constraint:

```sql id="notif30"
UNIQUE(workspace_id, user_id)
```

---

# Future APIs

```text id="notif31"
Create Notification

Get Notification

List Notifications

Acknowledge Notification

Dismiss Notification

Retry Delivery

Get Delivery History

Get User Preferences

Update Preferences

Schedule Notification

Cancel Notification
```

---

# Future Backend Services

## Notification Service

Creates notification records from Signals and Recommendations.

---

## Delivery Service

Routes notifications to the correct provider.

---

## Retry Service

Processes failed deliveries according to retry policy.

---

## Preference Service

Evaluates user delivery preferences before sending.

---

## Digest Service

Builds daily and weekly notification summaries.

---

## Delivery Analytics Service

Measures delivery success rate, acknowledgement rate, and latency.

---

# Implementation Notes

Recommended implementation:

```text id="notif32"
UUID Primary Keys

Workspace Isolation

Append-Only Delivery Attempts

JSONB Preferences

Scheduled Delivery Support

Soft Archive
```

Future metadata extension:

```sql id="notif33"
metadata JSONB
```

Example:

```json id="notif34"
{
  "provider": "Slack",
  "channel": "#alerts",
  "thread_ts": "1723481234.000200",
  "delivery_latency_ms": 485,
  "retry_policy": "exponential_backoff"
}
```

---

# Delivery Flow

The Notification database transforms decisions into user awareness.

```text id="notif35"
Evidence

↓

Signal

↓

Recommendation

↓

Notification

↓

Channel

↓

User

↓

Acknowledgement
```

Every important decision should reach the intended recipient through a traceable delivery process.

---

# Integration with Future Agents

Notifications support both human users and autonomous agents.

Possible recipients include:

```text id="notif36"
Human User

Team Inbox

Slack Bot

Discord Bot

Webhook Consumer

AI Agent
```

Future agents may subscribe to specific notification categories and automatically execute predefined workflows after successful delivery.

---

# Final Rule

Notifications are delivery records, not business decisions.

Signals determine **what happened**.

Recommendations determine **what should happen**.

Notifications determine **who should know, when they should know, and how they are informed**.

The Notification database guarantees reliable, traceable, and multi-channel delivery across the entire Highlight Signal platform.
