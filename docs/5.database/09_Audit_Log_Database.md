# 09_Audit_Log_Database.md

# Audit Log Database

> **V12-06 note (2026-07-22)**: pre-implementation Draft (`audit_entities`/
> `audit_event_types`/`system_events` lookup tables, polymorphic UUID
> `entity_id`) — does not match what actually shipped. Real schema:
> `audit_logs` (`migrations/010`, indexed further by
> `036_audit_log_search_index.sql`) has a plain `event_type VARCHAR(100)`
> (no FK lookup table), `entity_type`/`entity_id` are plain VARCHAR (not
> UUID), `metadata_json` is `TEXT` (not JSONB), and there is no
> `system_events` table anywhere. Real API: only
> `GET /api/v1/workspaces/{workspaceId}/audit-logs` exists (read-only,
> `backend/api/public/index.php`) — see `docs/6.api/09_Audit_Log_API.md`'s
> own note for the full route gap. Treat this file as historical design
> intent, not a current reference.

Version: v1.0

Status: Draft (superseded by real implementation — see note above)

Layer: Database Specification

Depends On:

* 01_Database_Overview
* 02_Workspace_Database
* 03_User_Account_Database
* 04_Signal_Database
* 05_Evidence_Database
* 06_Recommendation_Database
* 07_Notification_Database
* Architecture v1.0 Frozen

---

# Purpose

> V1 Alignment Patch: Audit Log is a cross-cutting, append-friendly record of important mutations. It is immutable during its retention period but may be archived or deleted only through governed retention policy, legal-hold, and compliance rules.

The Audit Log database defines the immutable system history of Highlight Signal.

Every important business event, user action, AI decision, backend process, and automation execution should generate an audit record.

The Audit Log provides:

* Complete traceability
* Security auditing
* Compliance support
* AI explainability
* Operational debugging
* Historical reconstruction

Audit Logs represent **what actually happened**, independent of current business state.

---

# Domain Responsibility

The Audit Log domain is responsible for:

* User activity logging
* AI execution history
* Backend service execution
* Entity change history
* Security events
* Integration events
* Automation execution
* Compliance records

The Audit Log domain is **not** responsible for:

* Business state
* Decision generation
* Notification delivery
* Dashboard rendering

---

# Core Entities

```text id="audit01"
audit_logs

audit_entities

audit_event_types

system_events
```

---

# Aggregate Structure

```text id="audit02"
Audit Log

├── Entity
├── Event Type
├── System Event
└── Metadata
```

Audit Log is the Aggregate Root of historical events.

---

# Entity Definition

---

## audit_logs

Represents one immutable audit event.

### Fields

| Field         | Type         | Required | Description            |
| ------------- | ------------ | -------- | ---------------------- |
| id            | UUID         | Yes      | Primary key            |
| workspace_id  | UUID         | Yes      | Workspace owner        |
| event_type_id | UUID         | Yes      | Event type             |
| entity_id     | UUID         | No       | Target entity          |
| actor_user_id | UUID         | No       | User actor             |
| actor_service | VARCHAR(100) | No       | Backend service        |
| actor_agent   | VARCHAR(100) | No       | AI Agent identifier    |
| action        | VARCHAR(100) | Yes      | Executed action        |
| summary       | TEXT         | Yes      | Human-readable summary |
| metadata      | JSONB        | No       | Structured metadata    |
| ip_address    | VARCHAR(64)  | No       | Client IP              |
| user_agent    | TEXT         | No       | Client agent           |
| created_at    | TIMESTAMP    | Yes      | Event timestamp        |

Audit records are immutable.

---

## audit_entities

Defines supported entity types.

### Fields

| Field       | Type         |
| ----------- | ------------ |
| id          | UUID         |
| code        | VARCHAR(50)  |
| name        | VARCHAR(100) |
| description | TEXT         |

---

### Example Entity Types

```text id="audit03"
Workspace

User

Signal

Evidence

Recommendation

Notification

Widget

Integration

Agent

Report
```

---

## audit_event_types

Defines reusable event classifications.

### Fields

| Field       | Type         |
| ----------- | ------------ |
| id          | UUID         |
| code        | VARCHAR(50)  |
| category    | VARCHAR(50)  |
| name        | VARCHAR(100) |
| severity    | VARCHAR(20)  |
| description | TEXT         |

---

### Example Categories

```text id="audit04"
Authentication

Authorization

Data Change

AI Decision

Automation

Security

Integration

System

Compliance
```

---

## system_events

Stores infrastructure and backend events.

### Fields

| Field        | Type      |
| ------------ | --------- |
| id           | UUID      |
| workspace_id | UUID      |
| service_name | VARCHAR   |
| event_name   | VARCHAR   |
| severity     | VARCHAR   |
| payload      | JSONB     |
| created_at   | TIMESTAMP |

Examples include:

* Worker execution
* Scheduled job
* Queue processing
* Cache refresh
* External synchronization

---

# Relationships

```text id="audit05"
Workspace

↓

Audit Log

├── Event Type

├── Entity

└── System Event
```

Audit Logs may reference business entities without modifying them.

---

## Cardinality

```text id="audit06"
Workspace

↓

Many Audit Logs

Audit Event Type

↓

Many Audit Logs

Entity

↓

Many Audit Logs
```

---

# Primary Keys

```text id="audit07"
audit_logs.id

audit_entities.id

audit_event_types.id

system_events.id
```

---

# Foreign Keys

```text id="audit08"
audit_logs.workspace_id
→ workspaces.id
```

```text id="audit09"
audit_logs.event_type_id
→ audit_event_types.id
```

`entity_id` is a polymorphic reference.

The referenced entity type is determined by `audit_event_types` and metadata.

---

# Lifecycle

## User Action

```text id="audit10"
User

↓

Action

↓

Audit Record Created
```

---

## AI Decision

```text id="audit11"
AI Engine

↓

Recommendation

↓

Audit Record Created
```

---

## Automation

```text id="audit12"
Scheduler

↓

Worker

↓

Audit Record
```

---

## System Event

```text id="audit13"
Backend Service

↓

System Event

↓

Audit Record
```

---

## Historical Review

```text id="audit14"
Audit Log

↓

Timeline

↓

Investigation

↓

Report
```

---

# Index Strategy

## Workspace Timeline

```sql id="audit15"
INDEX(workspace_id, created_at DESC)
```

---

## Event Type

```sql id="audit16"
INDEX(event_type_id)
```

---

## Actor

```sql id="audit17"
INDEX(actor_user_id)
```

---

## Service

```sql id="audit18"
INDEX(actor_service)
```

---

## Entity Lookup

```sql id="audit19"
INDEX(entity_id)
```

---

## Time Range

```sql id="audit20"
INDEX(created_at DESC)
```

---

## Security Investigation

```sql id="audit21"
INDEX(ip_address)
```

---

# Constraints

---

## Immutability

Audit records must never be updated.

Corrections require a new audit record.

---

## Timestamp

Every audit event requires a timestamp.

---

## Actor

At least one actor must exist:

* User
* Service
* AI Agent

---

## Metadata

Structured metadata should use JSONB.

Example:

```json id="audit22"
{
  "old_status": "pending",
  "new_status": "completed",
  "reason": "User accepted recommendation"
}
```

---

## Sensitive Data

Audit Logs should never store:

* Passwords
* API secrets
* Access tokens
* Encryption keys

Only references or masked values are permitted.

---

# Future APIs

```text id="audit23"
Get Audit Timeline

Search Audit Logs

Filter By User

Filter By Entity

Filter By Event Type

Get System Events

Export Audit Report

Compliance Report

Security Investigation
```

---

# Future Backend Services

## Audit Service

Writes immutable audit records.

---

## Security Audit Service

Analyzes security-related events.

---

## Compliance Service

Produces regulatory audit reports.

---

## Investigation Service

Reconstructs historical timelines.

---

## AI Execution Audit Service

Records AI-generated decisions, prompts, models, execution IDs, and outcomes.

---

## System Monitoring Service

Collects infrastructure events.

---

# Implementation Notes

Recommended implementation:

```text id="audit24"
UUID Primary Keys

Append-Only Records

Workspace Isolation

JSONB Metadata

Immutable History

High-Volume Partitioning
```

For high-volume deployments, partition by:

* Workspace
* Month
* Year

to improve long-term query performance.

---

# Audit Timeline

Every major operation in Highlight Signal should generate an audit event.

```text id="audit25"
Evidence Created

↓

Signal Generated

↓

Recommendation Generated

↓

Notification Delivered

↓

User Accepted

↓

AI Executed

↓

Completed
```

This creates a complete operational timeline for every business decision.

---

# Integration with Future Agents

Future AI Agents should generate audit records for every autonomous action.

Examples:

```text id="audit26"
AI Recommendation Generated

Agent Started

Agent Approved

Agent Executed

Agent Failed

Agent Rolled Back
```

Autonomous execution must always remain explainable and traceable.

---

# Final Rule

Audit Logs represent the permanent memory of Highlight Signal.

Business entities describe the current state.

Audit Logs describe the complete history that produced that state.

Every meaningful action performed by a user, backend service, or AI Agent should leave an immutable audit trail, ensuring transparency, accountability, and explainability across the entire platform.
