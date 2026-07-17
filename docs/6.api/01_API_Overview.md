# 01_API_Overview.md

# API Overview

Version: v1.0

Status: Draft

Layer: API Specification

Depends On:

* 5.database
* Architecture v1.0 Frozen

---

# Purpose

> V1 Alignment Patch: HTTPS REST through the PHP Backend is the only V1 Business API entry point. Domain Event subscriptions and Queue workers are internal implementation details. APIs follow aggregated Domain boundaries and do not require one top-level service per concept object.

This document defines the API foundation of Highlight Signal.

The API layer maps database entities, domain lifecycles, and backend service boundaries into executable external interfaces.

The API does not redefine product concepts.

The API does not redesign the database.

The API defines how clients, dashboards, workers, integrations, and future AI agents interact with Highlight Signal.

---

# Domain Responsibility

The API layer is responsible for:

* Route design
* Request structure
* Response structure
* Authentication requirement
* Authorization boundary
* Pagination
* Filtering
* Sorting
* Validation
* Error handling
* Service invocation boundary

The API layer is **not** responsible for:

* Database schema design
* Business concept definition
* Long-running execution logic
* AI model implementation
* Worker queue internals

---

# API Principles

## 1. Workspace-First API

Most business APIs must be scoped by workspace.

Recommended route pattern:

```text
/api/workspaces/{workspace_id}/...
```

Examples:

```text
/api/workspaces/{workspace_id}/signals

/api/workspaces/{workspace_id}/recommendations

/api/workspaces/{workspace_id}/notifications
```

---

## 2. Decision-First Design

APIs should expose decision objects clearly.

The main API flow follows:

```text
Evidence

↓

Signal

↓

Recommendation

↓

Notification

↓

Widget

↓

Audit Log
```

---

## 3. Stable Resource Naming

Use plural nouns for collections.

Recommended:

```text
/workspaces

/users

/signals

/evidence

/recommendations

/notifications

/widgets

/audit-logs
```

Avoid action-heavy route names unless representing lifecycle transitions.

---

## 4. Lifecycle Actions Are Explicit

Lifecycle transitions should be represented by clear action endpoints.

Examples:

```text
POST /signals/{signal_id}/resolve

POST /recommendations/{recommendation_id}/accept

POST /notifications/{notification_id}/acknowledge
```

---

## 5. API Does Not Expose Internal Secrets

APIs must never expose:

* Password hash
* Refresh token
* API secret
* OAuth token
* Internal credential
* Raw provider secret

Only safe references may be returned.

---

# Authentication

All private APIs require authentication.

Recommended strategy:

```text
Authorization: Bearer {access_token}
```

Public APIs should be explicitly documented.

Default assumption:

```text
Auth Required: Yes
```

---

# Authorization

Authorization is workspace-based.

A user must be a member of the workspace before accessing workspace-scoped APIs.

Common roles:

```text
owner

admin

manager

member

viewer
```

Role capability should be evaluated before service execution.

Example:

```text
viewer

→ read only

member

→ read and limited actions

manager

→ manage signals and recommendations

admin

→ manage workspace settings

owner

→ ownership and billing-level control
```

---

# Standard Request Rules

## Content Type

```text
Content-Type: application/json
```

---

## Date Format

Use ISO 8601.

Example:

```text
2026-07-02T09:30:00Z
```

---

## ID Format

Use UUID.

Example:

```text
550e8400-e29b-41d4-a716-446655440000
```

---

# Standard Response Format

Successful response:

```json
{
  "data": {},
  "meta": {}
}
```

List response:

```json
{
  "data": [],
  "meta": {
    "pagination": {
      "page": 1,
      "per_page": 20,
      "total": 120
    }
  }
}
```

Error response:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body",
    "details": {}
  }
}
```

---

# Pagination

List APIs should support pagination.

Recommended query parameters:

```text
page

per_page
```

Default:

```text
page = 1

per_page = 20
```

Maximum:

```text
per_page = 100
```

---

# Filtering

List APIs should support filtering where useful.

Common filters:

```text
status

type

severity

priority

created_after

created_before
```

Example:

```text
GET /api/workspaces/{workspace_id}/signals?status=new&severity=high
```

---

# Sorting

List APIs should support sorting.

Recommended query parameter:

```text
sort
```

Examples:

```text
sort=created_at_desc

sort=priority_desc

sort=score_desc
```

---

# Error Codes

Common API error codes:

```text
UNAUTHORIZED

FORBIDDEN

NOT_FOUND

VALIDATION_ERROR

CONFLICT

RATE_LIMITED

INTERNAL_ERROR

SERVICE_UNAVAILABLE
```

---

# HTTP Status Mapping

```text
200 OK

201 Created

204 No Content

400 Bad Request

401 Unauthorized

403 Forbidden

404 Not Found

409 Conflict

422 Validation Error

429 Too Many Requests

500 Internal Server Error

503 Service Unavailable
```

---

# API Groups

The API layer contains the following groups:

```text
01_API_Overview

02_Workspace_API

03_User_Account_API

04_Signal_API

05_Evidence_API

06_Recommendation_API

07_Notification_API

08_Widget_API

09_Audit_Log_API

10_Retention_API
```

---

# Core Route Map

## Workspace

```text
/api/workspaces

/api/workspaces/{workspace_id}

/api/workspaces/{workspace_id}/members

/api/workspaces/{workspace_id}/settings

/api/workspaces/{workspace_id}/integrations
```

---

## User Account

```text
/api/auth/register

/api/auth/login

/api/auth/logout

/api/auth/refresh

/api/users/me

/api/users/me/profile

/api/users/me/sessions
```

---

## Signal

```text
/api/workspaces/{workspace_id}/signals

/api/workspaces/{workspace_id}/signals/{signal_id}

/api/workspaces/{workspace_id}/signals/{signal_id}/resolve

/api/workspaces/{workspace_id}/signals/{signal_id}/dismiss

/api/workspaces/{workspace_id}/signals/{signal_id}/history
```

---

## Evidence

```text
/api/workspaces/{workspace_id}/evidence

/api/workspaces/{workspace_id}/evidence/{evidence_id}

/api/workspaces/{workspace_id}/evidence/{evidence_id}/snapshots

/api/workspaces/{workspace_id}/evidence/{evidence_id}/graph
```

---

## Recommendation

```text
/api/workspaces/{workspace_id}/recommendations

/api/workspaces/{workspace_id}/recommendations/{recommendation_id}

/api/workspaces/{workspace_id}/recommendations/{recommendation_id}/accept

/api/workspaces/{workspace_id}/recommendations/{recommendation_id}/dismiss

/api/workspaces/{workspace_id}/recommendations/{recommendation_id}/complete

/api/workspaces/{workspace_id}/recommendations/{recommendation_id}/feedback
```

---

## Notification

```text
/api/workspaces/{workspace_id}/notifications

/api/workspaces/{workspace_id}/notifications/{notification_id}

/api/workspaces/{workspace_id}/notifications/{notification_id}/acknowledge

/api/workspaces/{workspace_id}/notification-preferences
```

---

## Widget

```text
/api/workspaces/{workspace_id}/widgets

/api/workspaces/{workspace_id}/widget-instances

/api/workspaces/{workspace_id}/widget-layouts

/api/workspaces/{workspace_id}/widget-cache
```

---

## Audit Log

```text
/api/workspaces/{workspace_id}/audit-logs

/api/workspaces/{workspace_id}/audit-logs/timeline

/api/workspaces/{workspace_id}/system-events
```

---

## Retention

```text
/api/workspaces/{workspace_id}/retention/policies

/api/workspaces/{workspace_id}/retention/archive-jobs

/api/workspaces/{workspace_id}/retention/deletion-jobs

/api/workspaces/{workspace_id}/retention/history
```

---

# Future Backend Services Used

The API layer invokes backend services including:

```text
Workspace Service

Authentication Service

Signal Service

Evidence Service

Recommendation Service

Notification Service

Widget Service

Audit Service

Retention Service
```

The API should not directly contain complex business logic.

Controllers should validate input, check permissions, call services, and return responses.

---

# Codex Generation Targets

This API specification should allow Codex to generate:

```text
Routes

Controllers

Request DTOs

Response DTOs

Validation Rules

Permission Middleware

Pagination Helpers

Error Handlers

Service Interfaces

API Tests
```

---

# Final Rule

The API layer is the external contract of Highlight Signal.

Database defines what the system remembers.

Backend Services define how the system acts.

API defines how users, clients, integrations, and future agents interact with the system.

The API must remain stable, workspace-scoped, permission-aware, and decision-first.
