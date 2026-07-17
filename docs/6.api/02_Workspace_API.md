# 02_Workspace_API.md

# Workspace API

Version: v1.0

Status: Draft

Layer: API Specification

Depends On:

* 01_API_Overview
* 02_Workspace_Database
* Architecture v1.0 Frozen

---

# Purpose

The Workspace API defines how clients create, access, update, and manage workspaces in Highlight Signal.

Workspace is the primary tenant boundary.

Most business APIs depend on a valid workspace context.

---

# Domain Responsibility

The Workspace API is responsible for:

* Workspace creation
* Workspace retrieval
* Workspace update
* Workspace archiving
* Member management
* Role management
* Workspace settings
* Workspace integrations

The Workspace API is **not** responsible for:

* User authentication
* Signal generation
* Evidence collection
* Recommendation execution
* Notification delivery

---

# Base Routes

```text
/api/workspaces

/api/workspaces/{workspace_id}

/api/workspaces/{workspace_id}/members

/api/workspaces/{workspace_id}/settings

/api/workspaces/{workspace_id}/integrations
```

---

# Authentication

```text
Auth Required: Yes
```

All Workspace APIs require authenticated access.

---

# Authorization

Workspace access requires membership.

Role rules:

```text
owner  → full access

admin  → manage workspace, members, settings, integrations

manager → manage workspace-level business data

member → read workspace, limited updates

viewer → read only
```

---

# Endpoints

---

## Create Workspace

```text
POST /api/workspaces
```

Creates a new workspace.

### Permission

```text
Authenticated User
```

### Request Body

```json
{
  "name": "Highlight Signal",
  "slug": "highlight-signal",
  "timezone": "Asia/Taipei",
  "locale": "zh-TW"
}
```

### Response

```json
{
  "data": {
    "id": "workspace_uuid",
    "name": "Highlight Signal",
    "slug": "highlight-signal",
    "status": "active",
    "owner_user_id": "user_uuid",
    "timezone": "Asia/Taipei",
    "locale": "zh-TW",
    "created_at": "2026-07-02T09:30:00Z"
  }
}
```

### Errors

```text
VALIDATION_ERROR

CONFLICT
```

---

## List Workspaces

```text
GET /api/workspaces
```

Lists workspaces accessible to the current user.

### Permission

```text
Authenticated User
```

### Response

```json
{
  "data": [
    {
      "id": "workspace_uuid",
      "name": "Highlight Signal",
      "slug": "highlight-signal",
      "status": "active",
      "role": "owner"
    }
  ]
}
```

---

## Get Workspace

```text
GET /api/workspaces/{workspace_id}
```

Gets workspace details.

### Permission

```text
Workspace Member
```

### Response

```json
{
  "data": {
    "id": "workspace_uuid",
    "name": "Highlight Signal",
    "slug": "highlight-signal",
    "description": "Decision intelligence workspace",
    "status": "active",
    "timezone": "Asia/Taipei",
    "locale": "zh-TW",
    "plan": "starter",
    "created_at": "2026-07-02T09:30:00Z",
    "updated_at": "2026-07-02T09:30:00Z"
  }
}
```

---

## Update Workspace

```text
PATCH /api/workspaces/{workspace_id}
```

Updates workspace basic information.

### Permission

```text
owner

admin
```

### Request Body

```json
{
  "name": "Highlight Signal HQ",
  "description": "Main company workspace",
  "timezone": "Asia/Taipei",
  "locale": "zh-TW"
}
```

### Response

```json
{
  "data": {
    "id": "workspace_uuid",
    "name": "Highlight Signal HQ",
    "description": "Main company workspace",
    "timezone": "Asia/Taipei",
    "locale": "zh-TW",
    "updated_at": "2026-07-02T09:30:00Z"
  }
}
```

---

## Archive Workspace

```text
POST /api/workspaces/{workspace_id}/archive
```

Archives a workspace.

Archived workspaces become read-only.

### Permission

```text
owner
```

### Request Body

```json
{
  "reason": "No longer active"
}
```

### Response

```json
{
  "data": {
    "id": "workspace_uuid",
    "status": "archived",
    "archived_at": "2026-07-02T09:30:00Z"
  }
}
```

---

# Member Endpoints

---

## List Members

```text
GET /api/workspaces/{workspace_id}/members
```

Lists workspace members.

### Permission

```text
Workspace Member
```

### Response

```json
{
  "data": [
    {
      "id": "membership_uuid",
      "user_id": "user_uuid",
      "display_name": "Hank",
      "email": "hank@example.com",
      "role": "owner",
      "invitation_status": "accepted",
      "joined_at": "2026-07-02T09:30:00Z"
    }
  ]
}
```

---

## Invite Member

```text
POST /api/workspaces/{workspace_id}/members/invite
```

Invites a user to the workspace.

### Permission

```text
owner

admin
```

### Request Body

```json
{
  "email": "member@example.com",
  "role": "member"
}
```

### Response

```json
{
  "data": {
    "id": "membership_uuid",
    "email": "member@example.com",
    "role": "member",
    "invitation_status": "pending"
  }
}
```

---

## Update Member Role

```text
PATCH /api/workspaces/{workspace_id}/members/{member_id}
```

Updates a member role.

### Permission

```text
owner

admin
```

### Request Body

```json
{
  "role": "manager"
}
```

### Response

```json
{
  "data": {
    "id": "membership_uuid",
    "role": "manager",
    "updated_at": "2026-07-02T09:30:00Z"
  }
}
```

---

## Remove Member

```text
DELETE /api/workspaces/{workspace_id}/members/{member_id}
```

Removes a member from the workspace.

### Permission

```text
owner

admin
```

### Response

```json
{
  "data": {
    "removed": true
  }
}
```

---

# Settings Endpoints

---

## Get Workspace Settings

```text
GET /api/workspaces/{workspace_id}/settings
```

### Permission

```text
Workspace Member
```

### Response

```json
{
  "data": {
    "workspace_id": "workspace_uuid",
    "theme": "default",
    "timezone": "Asia/Taipei",
    "locale": "zh-TW",
    "notification_default": {},
    "ai_preferences": {},
    "dashboard_preferences": {},
    "security_settings": {}
  }
}
```

---

## Update Workspace Settings

```text
PATCH /api/workspaces/{workspace_id}/settings
```

### Permission

```text
owner

admin
```

### Request Body

```json
{
  "timezone": "Asia/Taipei",
  "locale": "zh-TW",
  "ai_preferences": {
    "language": "zh-TW",
    "explanation_level": "business"
  },
  "dashboard_preferences": {
    "default_view": "decision"
  }
}
```

### Response

```json
{
  "data": {
    "workspace_id": "workspace_uuid",
    "updated_at": "2026-07-02T09:30:00Z"
  }
}
```

---

# Integration Endpoints

---

## List Integrations

```text
GET /api/workspaces/{workspace_id}/integrations
```

### Permission

```text
owner

admin

manager
```

### Response

```json
{
  "data": [
    {
      "id": "integration_uuid",
      "provider": "Google Analytics",
      "status": "active",
      "last_sync_at": "2026-07-02T09:30:00Z"
    }
  ]
}
```

---

## Connect Integration

```text
POST /api/workspaces/{workspace_id}/integrations
```

Creates an integration reference.

Credential values should not be submitted directly unless handled through a secure flow.

### Permission

```text
owner

admin
```

### Request Body

```json
{
  "provider": "Google Analytics",
  "provider_account_id": "ga_account_id",
  "credential_reference": "secret_ref"
}
```

### Response

```json
{
  "data": {
    "id": "integration_uuid",
    "provider": "Google Analytics",
    "status": "pending"
  }
}
```

---

## Disconnect Integration

```text
DELETE /api/workspaces/{workspace_id}/integrations/{integration_id}
```

### Permission

```text
owner

admin
```

### Response

```json
{
  "data": {
    "disconnected": true
  }
}
```

---

# Validation Rules

## Workspace Name

```text
Required

Max 150 characters
```

## Slug

```text
Required

Lowercase

Hyphen separated

Globally unique
```

## Role

Allowed values:

```text
owner

admin

manager

member

viewer
```

## Locale

Recommended format:

```text
zh-TW

en-US
```

## Timezone

Must be valid IANA timezone.

Example:

```text
Asia/Taipei
```

---

# Error Codes

```text
UNAUTHORIZED

FORBIDDEN

NOT_FOUND

VALIDATION_ERROR

CONFLICT

WORKSPACE_ARCHIVED

OWNER_TRANSFER_REQUIRED
```

---

# Future Backend Services Used

```text
Workspace Service

Membership Service

Workspace Settings Service

Integration Service

Audit Service

Workspace Initialization Service
```

---

# Audit Events

Workspace API should generate audit events for:

```text
Workspace Created

Workspace Updated

Workspace Archived

Member Invited

Member Role Updated

Member Removed

Settings Updated

Integration Connected

Integration Disconnected
```

---

# Final Rule

The Workspace API defines the tenant boundary of Highlight Signal.

Every workspace-scoped API must validate membership before accessing data.

Workspace APIs should remain stable, permission-aware, and safe for future enterprise collaboration.
