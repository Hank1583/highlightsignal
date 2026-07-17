# 04_Signal_API.md

# Signal API

Version: v1.0

Status: Draft

Layer: API Specification

Depends On:

* 01_API_Overview
* 02_Workspace_API
* 04_Signal_Database
* 05_Evidence_Database
* 06_Recommendation_Database
* AI Decision Engine
* Architecture v1.0 Frozen

---

# Purpose

The Signal API defines how clients discover, inspect, classify, and manage Signals within Highlight Signal.

Signals are the primary decision objects of the platform.

Every important business event should ultimately be represented as a Signal.

The Signal API is the central business API used by dashboards, AI assistants, reports, mobile applications, integrations, and future autonomous agents.

---

# Domain Responsibility

The Signal API is responsible for:

* Signal retrieval
* Signal search
* Signal filtering
* Signal lifecycle management
* Signal prioritization
* Signal history
* Signal relationships
* Signal detail view

The Signal API is **not** responsible for:

* Evidence collection
* Recommendation generation
* Notification delivery
* Widget rendering

---

# Base Routes

```text
/api/workspaces/{workspace_id}/signals
```

---

# Authentication

```text
Auth Required: Yes
```

---

# Authorization

Minimum permission:

```text
viewer
```

Lifecycle operations require:

```text
manager

admin

owner
```

---

# Endpoints

---

## List Signals

```text
GET /api/workspaces/{workspace_id}/signals
```

Returns paginated Signals.

### Query Parameters

```text
page

per_page

status

severity

signal_type

priority

source

created_after

created_before

sort
```

### Example

```text
GET /api/workspaces/{workspace_id}/signals?status=new&severity=critical&sort=priority_desc
```

### Response

```json
{
  "data": [
    {
      "id": "signal_uuid",
      "title": "Missing Content Security Policy",
      "severity": "high",
      "priority": 95,
      "score": 92.5,
      "confidence": 98.0,
      "status": "new",
      "signal_type": "Security",
      "source": "RiskRadar",
      "last_detected_at": "2026-07-02T09:30:00Z"
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "per_page": 20,
      "total": 182
    }
  }
}
```

---

## Get Signal

```text
GET /api/workspaces/{workspace_id}/signals/{signal_id}
```

Returns complete Signal information.

### Response

```json
{
  "data": {
    "id": "signal_uuid",
    "title": "Missing Content Security Policy",
    "summary": "No CSP header detected.",
    "severity": "high",
    "priority": 95,
    "score": 92.5,
    "confidence": 98.0,
    "status": "new",
    "signal_type": "Security",
    "source": "RiskRadar",
    "first_detected_at": "2026-07-01T08:15:00Z",
    "last_detected_at": "2026-07-02T09:30:00Z"
  }
}
```

---

## Search Signals

```text
GET /api/workspaces/{workspace_id}/signals/search
```

Performs keyword search.

### Query Parameters

```text
q

page

per_page

sort
```

Example:

```text
GET /signals/search?q=csp
```

---

## Resolve Signal

```text
POST /api/workspaces/{workspace_id}/signals/{signal_id}/resolve
```

Marks a Signal as resolved.

### Permission

```text
manager

admin

owner
```

### Request Body

```json
{
  "reason": "Security header deployed."
}
```

### Response

```json
{
  "data": {
    "status": "resolved",
    "resolved_at": "2026-07-02T10:15:00Z"
  }
}
```

---

## Dismiss Signal

```text
POST /api/workspaces/{workspace_id}/signals/{signal_id}/dismiss
```

Dismisses a Signal.

### Request Body

```json
{
  "reason": "False positive"
}
```

---

## Reopen Signal

```text
POST /api/workspaces/{workspace_id}/signals/{signal_id}/reopen
```

Reopens a previously resolved or dismissed Signal.

### Request Body

```json
{
  "reason": "Issue detected again"
}
```

---

## Archive Signal

```text
POST /api/workspaces/{workspace_id}/signals/{signal_id}/archive
```

Archives an inactive Signal.

---

# Related Resources

---

## Get Signal History

```text
GET /api/workspaces/{workspace_id}/signals/{signal_id}/history
```

Returns status transition history.

### Response

```json
{
  "data": [
    {
      "previous_status": "new",
      "new_status": "investigating",
      "changed_by": "user_uuid",
      "created_at": "2026-07-02T09:45:00Z"
    }
  ]
}
```

---

## Get Signal Evidence

```text
GET /api/workspaces/{workspace_id}/signals/{signal_id}/evidence
```

Returns Evidence supporting the Signal.

---

## Get Signal Recommendations

```text
GET /api/workspaces/{workspace_id}/signals/{signal_id}/recommendations
```

Returns Recommendations generated from the Signal.

---

## Get Related Signals

```text
GET /api/workspaces/{workspace_id}/signals/{signal_id}/related
```

Returns related Signals identified by the Decision Engine.

---

# Validation Rules

## Severity

Allowed values:

```text
critical

high

medium

low

info
```

---

## Status

Allowed values:

```text
new

investigating

confirmed

resolved

dismissed

archived
```

---

## Score

```text
0

↓

100
```

---

## Confidence

```text
0

↓

100
```

---

# Filtering

Supported filters:

```text
status

severity

signal_type

source

priority

score

confidence

created_after

created_before

resolved_after

resolved_before
```

---

# Sorting

Supported sorting:

```text
priority_desc

priority_asc

score_desc

severity_desc

created_at_desc

last_detected_at_desc
```

---

# Error Codes

```text
UNAUTHORIZED

FORBIDDEN

NOT_FOUND

VALIDATION_ERROR

SIGNAL_ALREADY_RESOLVED

SIGNAL_ALREADY_ARCHIVED

WORKSPACE_ARCHIVED
```

---

# Future Backend Services Used

```text
Signal Service

Signal Search Service

Signal Lifecycle Service

Signal Classification Service

Signal Deduplication Service

Evidence Service

Recommendation Service

Audit Service
```

---

# Audit Events

Signal API should generate audit events for:

```text
Signal Viewed

Signal Searched

Signal Resolved

Signal Dismissed

Signal Reopened

Signal Archived
```

---

# Response Expansion

To reduce round trips, APIs may support optional expansions.

Example:

```text
GET /signals/{signal_id}?expand=evidence,recommendations
```

Supported expansions:

```text
evidence

recommendations

history

notifications

audit_logs
```

---

# Future Agent Operations

Future AI Agents may use the Signal API to:

```text
Retrieve Active Signals

Claim Investigation Tasks

Update Signal Status

Request Related Evidence

Trigger Recommendation Generation
```

All agent actions must follow the same authorization and audit requirements as human users.

---

# Decision Flow

The Signal API represents the center of the Highlight Signal platform.

```text
Evidence

↓

Signal API

↓

Recommendation API

↓

Notification API

↓

Widget API
```

Signals are the entry point for every decision-oriented workflow.

---

# Final Rule

The Signal API exposes the primary business object of Highlight Signal.

Every Signal should be discoverable, explainable, traceable, and manageable through a stable API contract.

The API must preserve the complete decision lifecycle while remaining independent of presentation and implementation details.
