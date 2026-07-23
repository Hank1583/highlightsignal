# 10_Data_Retention_Database.md

# Data Retention Database

> **V12-06 note (2026-07-22)**: pre-implementation Draft (four separate
> configurable tables: `retention_policies`, `archive_jobs`,
> `deletion_jobs`, `retention_history`, with per-entity archive/delete-day
> policies) — does not match what actually shipped. Real schema:
> `backend/sql/migrations/037_retention_cleanup_runs.sql` — a single
> append-only `retention_cleanup_runs` ledger (`data_class`, mode
> `dry_run`/`delete`, `matched_count`/`deleted_count`); retention windows
> are hardcoded constants in `RetentionCleanupService`, not a configurable
> policy table, and there is no archive/restore workflow (V11-08's own
> `restore` mechanism is a full `mysqldump` restore, not per-row archive).
> See `docs/task-packets/V11-08_RETENTION_CLEANUP_BACKUP_JOBS.md` and
> `docs/8.infrastructure/12_Observability_Runbook.md` for the real
> mechanism. Treat this file as historical design intent, not a current
> reference.

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
* 08_Widget_Database
* 09_Audit_Log_Database
* Architecture v1.0 Frozen

---

# Purpose

The Data Retention specification defines the lifecycle management strategy for all persistent data within Highlight Signal.

Its purpose is to ensure that business data remains:

* Available when needed
* Archived when inactive
* Deleted when retention policies expire
* Recoverable during retention periods
* Compliant with future legal, contractual, and enterprise requirements

The Retention domain governs **how long data lives**, not **how data is created**.

---

# Domain Responsibility

The Data Retention domain is responsible for:

* Data lifecycle policies
* Soft deletion
* Archiving
* Retention periods
* Recovery windows
* Permanent deletion
* Storage optimization
* Compliance retention rules

The Data Retention domain is **not** responsible for:

* Business logic
* Signal generation
* Recommendation generation
* User authentication
* Dashboard presentation

---

# Core Entities

```text id="ret01"
retention_policies

archive_jobs

deletion_jobs

retention_history
```

---

# Aggregate Structure

```text id="ret02"
Retention Policy

├── Archive Job
├── Deletion Job
├── History
└── Entity Scope
```

Retention Policy is the Aggregate Root of the lifecycle management domain.

---

# Entity Definition

---

## retention_policies

Defines lifecycle rules for business entities.

### Fields

| Field                | Type         | Required | Description                  |
| -------------------- | ------------ | -------- | ---------------------------- |
| id                   | UUID         | Yes      | Primary key                  |
| entity_type          | VARCHAR(100) | Yes      | Target entity                |
| retention_days       | INTEGER      | Yes      | Active retention period      |
| archive_after_days   | INTEGER      | No       | Archive threshold            |
| delete_after_days    | INTEGER      | No       | Permanent deletion threshold |
| recovery_window_days | INTEGER      | No       | Restore period               |
| enabled              | BOOLEAN      | Yes      | Policy enabled               |
| created_at           | TIMESTAMP    | Yes      | Created time                 |
| updated_at           | TIMESTAMP    | Yes      | Updated time                 |

---

## archive_jobs

Tracks archive operations.

### Fields

| Field        | Type      |
| ------------ | --------- |
| id           | UUID      |
| entity_type  | VARCHAR   |
| entity_id    | UUID      |
| status       | VARCHAR   |
| archived_at  | TIMESTAMP |
| completed_at | TIMESTAMP |
| created_at   | TIMESTAMP |

---

### Archive Status

```text id="ret03"
pending

running

completed

failed
```

---

## deletion_jobs

Tracks permanent deletion operations.

### Fields

| Field        | Type      |
| ------------ | --------- |
| id           | UUID      |
| entity_type  | VARCHAR   |
| entity_id    | UUID      |
| status       | VARCHAR   |
| deleted_at   | TIMESTAMP |
| completed_at | TIMESTAMP |
| created_at   | TIMESTAMP |

---

## retention_history

Stores lifecycle history.

### Fields

| Field           | Type      |
| --------------- | --------- |
| id              | UUID      |
| entity_type     | VARCHAR   |
| entity_id       | UUID      |
| lifecycle_stage | VARCHAR   |
| performed_by    | VARCHAR   |
| metadata        | JSONB     |
| created_at      | TIMESTAMP |

---

### Lifecycle Stages

```text id="ret04"
Active

Archived

Restored

Scheduled For Deletion

Deleted
```

---

# Relationships

```text id="ret05"
Retention Policy

↓

Archive Job

↓

Deletion Job

↓

Retention History
```

Policies apply to business entities without changing their ownership.

---

## Supported Entity Types

Retention policies may apply to:

```text id="ret06"
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

Not every entity requires the same policy.

---

# Primary Keys

```text id="ret07"
retention_policies.id

archive_jobs.id

deletion_jobs.id

retention_history.id
```

---

# Lifecycle

## Active

```text id="ret08"
Entity Created

↓

Business Use
```

---

## Archive

```text id="ret09"
Inactive

↓

Archive Scheduled

↓

Archive Completed
```

---

## Recovery

```text id="ret10"
Archived

↓

Restore Requested

↓

Active
```

---

## Permanent Deletion

```text id="ret11"
Archive Expired

↓

Deletion Scheduled

↓

Deleted
```

---

## Lifecycle Timeline

```text id="ret12"
Active

↓

Archived

↓

Recoverable

↓

Deleted
```

---

# Index Strategy

## Entity Lookup

```sql id="ret13"
INDEX(entity_type, entity_id)
```

---

## Archive Queue

```sql id="ret14"
INDEX(status, archived_at)
```

---

## Deletion Queue

```sql id="ret15"
INDEX(status, deleted_at)
```

---

## Retention Policy

```sql id="ret16"
UNIQUE(entity_type)
```

---

## Lifecycle Search

```sql id="ret17"
INDEX(created_at DESC)
```

---

# Constraints

---

## Immutable History

Retention history must never be modified.

---

## Policy Consistency

Retention periods must satisfy:

```text id="ret18"
archive_after_days

≤

delete_after_days
```

---

## Soft Delete

User-facing entities should be soft deleted before permanent removal.

Typical implementation:

```text id="ret19"
deleted_at
```

---

## Archive

Archived data must remain read-only.

---

## Recovery

Recovery is only permitted within the configured recovery window.

---

## Permanent Deletion

Permanent deletion should remove business records while preserving required compliance history where applicable.

---

# Recommended Default Policies

| Entity         | Archive     | Delete        |  Recovery |
| -------------- | ----------- | ------------- | --------: |
| Workspace      | Never       | Manual        | Unlimited |
| User           | Soft Delete | Manual        |   90 Days |
| Signal         | 365 Days    | Never         | Unlimited |
| Evidence       | 365 Days    | Never         | Unlimited |
| Recommendation | 365 Days    | Never         | Unlimited |
| Notification   | 180 Days    | 730 Days      |   30 Days |
| Widget Cache   | 1 Day       | 7 Days        |      None |
| Audit Log      | Never       | Policy Driven | Unlimited |

These defaults should be configurable by future enterprise deployments.

---

# Future APIs

```text id="ret20"
Get Retention Policy

Update Retention Policy

Archive Entity

Restore Entity

Schedule Deletion

Cancel Deletion

Get Lifecycle History

List Archive Jobs

List Deletion Jobs

Run Retention Policy
```

---

# Future Backend Services

## Retention Policy Service

Evaluates lifecycle rules.

---

## Archive Service

Moves inactive data into long-term storage.

---

## Restore Service

Recovers archived entities within the recovery window.

---

## Deletion Service

Performs permanent deletion according to policy.

---

## Compliance Service

Validates retention rules against regulatory requirements.

---

## Storage Optimization Service

Removes expired cache, temporary data, and obsolete records.

---

# Implementation Notes

Recommended implementation:

```text id="ret21"
UUID Primary Keys

Soft Delete

Read-Only Archive

Append-Only History

Background Workers

Configurable Policies
```

Long-running archive and deletion operations should execute asynchronously through worker queues.

No user-facing request should perform bulk archival or deletion synchronously.

---

# Storage Strategy

Recommended storage tiers:

```text id="ret22"
Hot Storage
│
├── Active Business Data
│
▼
Warm Storage
│
├── Archived Business Data
│
▼
Cold Storage
│
├── Historical Snapshots
├── Compliance Records
└── Long-Term Audit Data
```

This tiered strategy improves scalability while reducing storage costs.

---

# Data Lifecycle

Every business entity follows a managed lifecycle.

```text id="ret23"
Created

↓

Active

↓

Inactive

↓

Archived

↓

Recoverable

↓

Deleted
```

Lifecycle transitions should be policy-driven and executed by background services.

---

# Integration with Future Enterprise Features

The Retention domain should support future enterprise capabilities including:

```text id="ret24"
Legal Hold

Compliance Freeze

Export Before Deletion

Tenant-Specific Policies

Regional Data Residency

Custom Retention Rules
```

These capabilities should extend existing policies without changing business entities.

---

# Final Rule

Data Retention governs the lifetime of information within Highlight Signal.

Business domains define **what data exists**.

Retention policies define **how long that data should exist**.

Every persistent entity should follow a predictable, traceable, and policy-driven lifecycle, ensuring scalability, operational efficiency, and enterprise readiness while preserving the integrity and explainability of the platform.
