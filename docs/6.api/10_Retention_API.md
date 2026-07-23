# 10_Retention_API.md

# Data Retention API

> **V12-06 note (2026-07-22)**: pre-implementation Draft (documents a full
> workspace-facing CRUD API: `/retention/policies`, `/retention/archive-jobs`,
> `/retention/deletion-jobs`, `POST /retention/archive|restore|delete`) —
> does not match what actually shipped. Retention only exists as one
> internal, signed cron-trigger endpoint,
> `POST /api/v1/retention/run` (`RetentionCleanupService`,
> `backend/api/public/index.php`) — there is no public, per-entity,
> per-workspace retention management API. See
> `docs/5.database/10_Data_Retention_Database.md`'s own note for the
> matching real schema. Treat this file as historical design intent, not a
> current reference.

Version: v1.0

Status: Draft (superseded by real implementation — see note above)

Layer: API Specification

Depends On:

* 01_API_Overview
* 10_Data_Retention_Database
* 09_Audit_Log_API
* Architecture v1.0 Frozen

---

# Purpose

The Data Retention API defines how administrators, compliance services, and future automation systems manage the lifecycle of persistent data within Highlight Signal.

The Retention API governs:

* Archive
* Restore
* Retention policy
* Deletion scheduling
* Lifecycle history

The API manages **how long data exists**, not **how business data is created**.

Business entities remain owned by their respective domains.

---

# Domain Responsibility

The Data Retention API is responsible for:

* Retention policy management
* Archive operations
* Restore operations
* Deletion scheduling
* Retention history
* Archive job monitoring
* Deletion job monitoring

The Data Retention API is **not** responsible for:

* Business logic
* Signal generation
* Recommendation generation
* User authentication
* Audit record creation

Lifecycle execution is performed by backend worker services.

---

# Base Routes

```text id="retainapi01"
/api/workspaces/{workspace_id}/retention

/api/workspaces/{workspace_id}/retention/policies

/api/workspaces/{workspace_id}/retention/archive-jobs

/api/workspaces/{workspace_id}/retention/deletion-jobs

/api/workspaces/{workspace_id}/retention/history
```

---

# Authentication

```text id="retainapi02"
Auth Required: Yes
```

---

# Authorization

Recommended permissions:

```text id="retainapi03"
viewer

↓

Read lifecycle status

manager

↓

View archive jobs

admin

↓

Manage retention policies

owner

↓

Approve destructive operations

system

↓

Background workers
```

Permanent deletion should require elevated privileges.

---

# Endpoints

---

## List Retention Policies

```text id="retainapi04"
GET /api/workspaces/{workspace_id}/retention/policies
```

Returns retention policies.

### Response

```json id="retainapi05"
{
  "data": [
    {
      "entity_type": "Signal",
      "archive_after_days": 365,
      "delete_after_days": null,
      "enabled": true
    }
  ]
}
```

---

## Get Retention Policy

```text id="retainapi06"
GET /api/workspaces/{workspace_id}/retention/policies/{entity_type}
```

Returns one retention policy.

---

## Update Retention Policy

```text id="retainapi07"
PATCH /api/workspaces/{workspace_id}/retention/policies/{entity_type}
```

### Permission

```text id="retainapi08"
admin

owner
```

### Request Body

```json id="retainapi09"
{
  "archive_after_days": 365,
  "delete_after_days": 730,
  "recovery_window_days": 30,
  "enabled": true
}
```

### Response

```json id="retainapi10"
{
  "data": {
    "updated": true
  }
}
```

---

# Archive Endpoints

---

## List Archive Jobs

```text id="retainapi11"
GET /api/workspaces/{workspace_id}/retention/archive-jobs
```

Returns archive jobs.

### Query Parameters

```text id="retainapi12"
status

entity_type

created_after

created_before
```

---

## Get Archive Job

```text id="retainapi13"
GET /api/workspaces/{workspace_id}/retention/archive-jobs/{job_id}
```

Returns archive job details.

---

## Archive Entity

```text id="retainapi14"
POST /api/workspaces/{workspace_id}/retention/archive
```

Schedules an archive operation.

### Permission

```text id="retainapi15"
admin

owner
```

### Request Body

```json id="retainapi16"
{
  "entity_type": "Signal",
  "entity_id": "signal_uuid",
  "reason": "Inactive for 365 days"
}
```

### Response

```json id="retainapi17"
{
  "data": {
    "job_id": "archive_job_uuid",
    "status": "pending"
  }
}
```

---

# Restore Endpoints

---

## Restore Entity

```text id="retainapi18"
POST /api/workspaces/{workspace_id}/retention/restore
```

Restores an archived entity.

### Request Body

```json id="retainapi19"
{
  "entity_type": "Signal",
  "entity_id": "signal_uuid"
}
```

### Response

```json id="retainapi20"
{
  "data": {
    "restored": true
  }
}
```

---

# Deletion Endpoints

---

## List Deletion Jobs

```text id="retainapi21"
GET /api/workspaces/{workspace_id}/retention/deletion-jobs
```

Returns deletion jobs.

---

## Get Deletion Job

```text id="retainapi22"
GET /api/workspaces/{workspace_id}/retention/deletion-jobs/{job_id}
```

Returns deletion job details.

---

## Schedule Deletion

```text id="retainapi23"
POST /api/workspaces/{workspace_id}/retention/delete
```

Schedules permanent deletion.

### Permission

```text id="retainapi24"
owner
```

### Request Body

```json id="retainapi25"
{
  "entity_type": "Notification",
  "entity_id": "notification_uuid",
  "reason": "Retention policy expired"
}
```

### Response

```json id="retainapi26"
{
  "data": {
    "job_id": "deletion_job_uuid",
    "status": "pending"
  }
}
```

---

## Cancel Scheduled Deletion

```text id="retainapi27"
POST /api/workspaces/{workspace_id}/retention/delete/{job_id}/cancel
```

Cancels a pending deletion job.

Only pending jobs may be cancelled.

---

# History Endpoints

---

## Get Lifecycle History

```text id="retainapi28"
GET /api/workspaces/{workspace_id}/retention/history
```

Returns lifecycle events.

### Query Parameters

```text id="retainapi29"
entity_type

entity_id

stage

created_after

created_before
```

---

## Get Entity Lifecycle

```text id="retainapi30"
GET /api/workspaces/{workspace_id}/retention/history/{entity_type}/{entity_id}
```

Returns complete lifecycle history.

---

# Validation Rules

## Entity Type

Allowed values:

```text id="retainapi31"
Workspace

User

Signal

Evidence

Recommendation

Notification

Widget Cache

Audit Log

Report

Integration
```

---

## Archive Policy

The archive threshold must be less than or equal to the deletion threshold.

---

## Restore

Restore is only permitted while the entity remains within its configured recovery window.

---

## Deletion

Deletion requests must comply with configured retention policies.

Entities under legal hold or compliance freeze must not be deleted.

---

# Filtering

Supported filters:

```text id="retainapi32"
entity_type

status

stage

created_after

created_before
```

---

# Sorting

Supported sorting:

```text id="retainapi33"
created_at_desc

created_at_asc

completed_at_desc
```

---

# Error Codes

```text id="retainapi34"
UNAUTHORIZED

FORBIDDEN

NOT_FOUND

VALIDATION_ERROR

RECOVERY_WINDOW_EXPIRED

ENTITY_NOT_ARCHIVED

LEGAL_HOLD_ACTIVE

COMPLIANCE_FREEZE_ACTIVE

DELETION_ALREADY_SCHEDULED
```

---

# Future Backend Services Used

```text id="retainapi35"
Retention Policy Service

Archive Service

Restore Service

Deletion Service

Compliance Service

Storage Optimization Service

Audit Service
```

---

# Audit Events

Retention operations should generate audit events.

```text id="retainapi36"
Retention Policy Updated

Archive Scheduled

Archive Completed

Entity Restored

Deletion Scheduled

Deletion Cancelled

Deletion Completed
```

---

# Response Expansion

Supported expansions:

```text id="retainapi37"
policy

history

archive_job

deletion_job

audit_log
```

Example:

```text id="retainapi38"
GET /retention/history/Signal/{entity_id}?expand=policy,audit_log
```

---

# Future Agent Operations

Future AI Agents may use the Retention API to:

```text id="retainapi39"
Evaluate Retention Policies

Recommend Archiving

Prepare Compliance Reports

Optimize Storage Usage

Identify Expired Data

Generate Retention Forecasts
```

AI Agents should not permanently delete data without explicit authorization.

---

# Lifecycle Flow

The Retention API manages the complete lifecycle of persistent information.

```text id="retainapi40"
Business Entity

↓

Retention Policy

↓

Archive

↓

Recovery Window

↓

Deletion Schedule

↓

Permanent Deletion
```

Each lifecycle transition should be policy-driven, auditable, and executed asynchronously.

---

# Enterprise Compliance

The Retention API is designed to support future enterprise capabilities.

```text id="retainapi41"
Legal Hold

Compliance Freeze

Tenant-Specific Policies

Regional Data Residency

Export Before Deletion

Scheduled Compliance Review
```

These capabilities extend the retention workflow without modifying business domains.

---

# Final Rule

The Data Retention API governs the lifecycle of persistent data within Highlight Signal.

Business APIs create and update operational data.

The Retention API determines when that data is archived, restored, retained, or permanently removed.

Every lifecycle operation must remain policy-driven, auditable, recoverable where applicable, and compliant with enterprise governance requirements.
