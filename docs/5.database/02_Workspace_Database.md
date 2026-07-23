# 02_Workspace_Database.md

# Workspace Database

> **V12-06 note (2026-07-22)**: this is a pre-implementation Draft written
> before the real MySQL schema existed (UUID PKs, `plan`/`timezone`/`locale`
> columns, JSONB `workspace_settings`) — it does not match what actually
> shipped. Real schema: `backend/sql/migrations/010_v1_foundation.sql`
> (`workspaces`: `BIGINT UNSIGNED AUTO_INCREMENT` id, `owner_member_id`, no
> `plan`/`timezone`/`locale`; `workspace_settings`: `locale`, `timezone`,
> `settings` TEXT only). Treat this file as historical design intent, not a
> current reference.

Version: v1.0

Status: Draft (superseded by real implementation — see note above)

Layer: Database Specification

Depends On:

* 03_Workspace_Framework
* 03_Workspace_Framework (Architecture)
* 01_Database_Overview

---

# Purpose

The Workspace database defines the ownership boundary of Highlight Signal.

Every major business entity belongs to a workspace.

The workspace acts as the primary tenant, collaboration unit, permission boundary, and data isolation boundary throughout the platform.

This specification maps the frozen Workspace Architecture into persistent database entities.

---

# Domain Responsibility

The Workspace domain is responsible for:

* Workspace lifecycle
* Ownership
* Membership
* Roles
* Settings
* Integrations
* Tenant isolation
* Default product configuration

The Workspace domain is **not** responsible for:

* Authentication
* Signal generation
* Recommendation logic
* Notification delivery

Those belong to their respective domains.

---

# Core Entities

The Workspace domain contains four primary entities.

```text
workspaces

workspace_members

workspace_settings

workspace_integrations
```

---

# Entity Definition

---

## workspaces

Represents one business workspace.

One company typically owns one workspace.

### Fields

| Field         | Type         | Required | Description       |
| ------------- | ------------ | -------- | ----------------- |
| id            | UUID         | Yes      | Primary key       |
| name          | VARCHAR(150) | Yes      | Workspace name    |
| slug          | VARCHAR(100) | Yes      | URL identifier    |
| description   | TEXT         | No       | Description       |
| status        | VARCHAR(30)  | Yes      | Workspace status  |
| owner_user_id | UUID         | Yes      | Owner             |
| timezone      | VARCHAR(50)  | Yes      | Default timezone  |
| locale        | VARCHAR(20)  | Yes      | Language          |
| plan          | VARCHAR(30)  | Yes      | Subscription plan |
| created_at    | TIMESTAMP    | Yes      | Created time      |
| updated_at    | TIMESTAMP    | Yes      | Updated time      |
| deleted_at    | TIMESTAMP    | No       | Soft delete       |

---

### Status

```text
active

trial

suspended

archived
```

---

## workspace_members

Represents users belonging to a workspace.

Many-to-many relationship.

### Fields

| Field             | Type      |
| ----------------- | --------- |
| id                | UUID      |
| workspace_id      | UUID      |
| user_id           | UUID      |
| role              | VARCHAR   |
| invitation_status | VARCHAR   |
| joined_at         | TIMESTAMP |
| created_at        | TIMESTAMP |
| updated_at        | TIMESTAMP |

---

### Roles

```text
owner

admin

manager

member

viewer
```

---

### Invitation Status

```text
pending

accepted

declined

removed
```

---

## workspace_settings

Stores workspace-level configuration.

Exactly one settings record should exist for each workspace.

### Fields

| Field                 | Type      |
| --------------------- | --------- |
| workspace_id          | UUID      |
| theme                 | VARCHAR   |
| timezone              | VARCHAR   |
| locale                | VARCHAR   |
| notification_default  | JSONB     |
| ai_preferences        | JSONB     |
| dashboard_preferences | JSONB     |
| security_settings     | JSONB     |
| created_at            | TIMESTAMP |
| updated_at            | TIMESTAMP |

---

## workspace_integrations

Stores external platform integrations.

One workspace may connect multiple services.

### Fields

| Field                | Type      |
| -------------------- | --------- |
| id                   | UUID      |
| workspace_id         | UUID      |
| provider             | VARCHAR   |
| provider_account_id  | VARCHAR   |
| status               | VARCHAR   |
| credential_reference | VARCHAR   |
| last_sync_at         | TIMESTAMP |
| created_at           | TIMESTAMP |
| updated_at           | TIMESTAMP |

---

### Providers

Example:

```text
Google Analytics

Google Search Console

Google Ads

Cloudflare

GitHub

Slack

Discord

AWS

GCP

Azure
```

Future providers can be added without schema changes.

---

# Relationships

```text
users

↓

workspace_members

↓

workspaces

↓

workspace_settings

↓

workspace_integrations
```

---

## Cardinality

```text
User

↓

Many Workspace Memberships

Workspace

↓

One Settings

Workspace

↓

Many Integrations
```

---

# Primary Keys

```text
workspaces.id

workspace_members.id

workspace_integrations.id
```

Workspace settings use:

```text
workspace_id
```

as the primary key.

---

# Foreign Keys

```text
workspaces.owner_user_id
→ users.id
```

```text
workspace_members.workspace_id
→ workspaces.id
```

```text
workspace_members.user_id
→ users.id
```

```text
workspace_settings.workspace_id
→ workspaces.id
```

```text
workspace_integrations.workspace_id
→ workspaces.id
```

---

# Lifecycle

## Workspace Created

↓

Create workspace

↓

Create owner membership

↓

Create default settings

↓

Initialize dashboard

↓

Ready

---

## Invite Member

Workspace

↓

Invitation

↓

Pending

↓

Accepted

↓

Membership Created

---

## Integration Connected

Workspace

↓

OAuth

↓

Credential Stored

↓

Sync Scheduled

↓

Integration Active

---

## Workspace Archived

Workspace

↓

Archive

↓

Read Only

↓

Hidden From Dashboard

↓

Retained For Recovery

---

# Index Strategy

---

## Workspace Slug

```sql
UNIQUE(slug)
```

---

## Owner

```sql
INDEX(owner_user_id)
```

---

## Membership Lookup

```sql
INDEX(user_id)

INDEX(workspace_id)
```

---

## Member Search

```sql
UNIQUE(workspace_id,user_id)
```

---

## Integration Lookup

```sql
INDEX(workspace_id)

INDEX(provider)

INDEX(status)
```

---

# Constraints

---

## Workspace Name

Required

Maximum 150 characters.

---

## Slug

Globally unique.

Lowercase.

Hyphen separated.

Immutable after creation unless migration.

---

## Owner

Every workspace must have one owner.

Owner cannot be removed without ownership transfer.

---

## Membership

Duplicate membership is not allowed.

Constraint:

```text
workspace_id

+

user_id
```

Unique.

---

## Workspace Settings

Exactly one settings record exists per workspace.

---

## Integration

Credential values should never be stored directly.

Only secure references should be persisted.

Secrets are managed by external secret storage.

---

## Soft Delete

Workspace deletion uses:

```text
deleted_at
```

Business data remains recoverable.

---

# Future APIs

Workspace domain will expose APIs including:

```text
Create Workspace

Get Workspace

Update Workspace

Archive Workspace

Transfer Ownership

List Members

Invite Member

Remove Member

Update Member Role

Get Settings

Update Settings

List Integrations

Connect Integration

Disconnect Integration
```

---

# Future Backend Services

Future backend services include:

## Workspace Service

Workspace lifecycle.

---

## Membership Service

Invitation management.

Role management.

Permission synchronization.

---

## Integration Service

OAuth connection.

Credential validation.

Periodic synchronization.

---

## Workspace Initialization Service

Automatically creates:

* Default dashboard
* Default widgets
* Default settings
* Initial workspace configuration

---

## Workspace Cleanup Service

Responsible for:

* Archive
* Retention
* Recovery
* Permanent deletion after retention period

---

# Implementation Notes

Recommended implementation:

```text
UUID Primary Keys

Soft Delete

Optimistic Locking

JSONB for Flexible Settings

Foreign Key Constraints

Workspace Isolation
```

Every business entity in Highlight Signal should reference:

```text
workspace_id
```

to ensure tenant isolation, authorization, and scalable multi-workspace architecture.

---

# Final Rule

The Workspace database is the root ownership boundary of Highlight Signal.

All domain entities should inherit workspace ownership directly or indirectly.

No business data should exist outside a workspace unless it is explicitly defined as a global system resource.
