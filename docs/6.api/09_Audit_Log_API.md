# 09_Audit_Log_API.md

# Audit Log API

Version: v1.0

Status: Draft

Layer: API Specification

Depends On:

* 01_API_Overview
* 09_Audit_Log_Database
* Architecture v1.0 Frozen

---

# Purpose

> V1 Alignment Patch: Audit Log remains a read-only, cross-cutting history API. Immutability applies during the configured retention period; governed retention, legal hold, and compliance policy determine archival or eventual deletion.

The Audit Log API defines how clients, administrators, security teams, and future AI agents access the immutable operational history of Highlight Signal.

Audit Logs are historical records.

They describe **what happened**, **when it happened**, **who performed the action**, **which system executed it**, and **why the action occurred**.

The Audit Log API is optimized for investigation, compliance, debugging, explainability, and operational visibility.

---

# Domain Responsibility

The Audit Log API is responsible for:

* Audit log retrieval
* Timeline reconstruction
* Event search
* Entity history
* User activity history
* System event inspection
* Compliance reporting

The Audit Log API is **read-only**.

Audit records are created automatically by backend services.

---

# Base Routes

```text id="auditapi01"
/api/workspaces/{workspace_id}/audit-logs

/api/workspaces/{workspace_id}/system-events
```

---

# Authentication

```text id="auditapi02"
Auth Required: Yes
```

---

# Authorization

Recommended permissions:

```text id="auditapi03"
viewer

↓

Own audit visibility only

manager

↓

Workspace operational history

admin

↓

Full workspace audit history

owner

↓

Full access

system

↓

Infrastructure APIs
```

Audit records should never be modified through public APIs.

---

# Endpoints

---

## List Audit Logs

```text id="auditapi04"
GET /api/workspaces/{workspace_id}/audit-logs
```

Returns paginated audit records.

### Query Parameters

```text id="auditapi05"
page

per_page

event_type

entity_type

actor

created_after

created_before

sort
```

### Example

```text id="auditapi06"
GET /audit-logs?event_type=Security&actor=user_uuid
```

### Response

```json id="auditapi07"
{
  "data": [
    {
      "id": "audit_uuid",
      "event_type": "Signal Resolved",
      "entity": "Signal",
      "actor": "Hank",
      "summary": "Signal resolved by user.",
      "created_at": "2026-07-02T10:00:00Z"
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "per_page": 20,
      "total": 1384
    }
  }
}
```

---

## Get Audit Log

```text id="auditapi08"
GET /api/workspaces/{workspace_id}/audit-logs/{audit_id}
```

Returns one audit record.

### Response

```json id="auditapi09"
{
  "data": {
    "id": "audit_uuid",
    "event_type": "Recommendation Completed",
    "entity": "Recommendation",
    "actor_user_id": "user_uuid",
    "actor_service": null,
    "actor_agent": null,
    "summary": "Recommendation completed successfully.",
    "metadata": {},
    "created_at": "2026-07-02T10:20:00Z"
  }
}
```

---

## Search Audit Logs

```text id="auditapi10"
GET /api/workspaces/{workspace_id}/audit-logs/search
```

Searches audit records.

### Query Parameters

```text id="auditapi11"
q

page

per_page

sort
```

---

# Timeline Endpoints

---

## Get Workspace Timeline

```text id="auditapi12"
GET /api/workspaces/{workspace_id}/audit-logs/timeline
```

Returns a chronological activity timeline.

### Query Parameters

```text id="auditapi13"
from

to

entity_type
```

---

## Get Entity Timeline

```text id="auditapi14"
GET /api/workspaces/{workspace_id}/audit-logs/entities/{entity_type}/{entity_id}
```

Returns all audit events related to one business entity.

Supported entities:

```text id="auditapi15"
Workspace

User

Signal

Evidence

Recommendation

Notification

Widget

Integration
```

---

## Get User Activity

```text id="auditapi16"
GET /api/workspaces/{workspace_id}/audit-logs/users/{user_id}
```

Returns all activities performed by one user.

---

# System Event Endpoints

---

## List System Events

```text id="auditapi17"
GET /api/workspaces/{workspace_id}/system-events
```

Returns backend operational events.

### Query Parameters

```text id="auditapi18"
service

severity

created_after

created_before
```

### Response

```json id="auditapi19"
{
  "data": [
    {
      "service": "Recommendation Service",
      "event": "Worker Completed",
      "severity": "info",
      "created_at": "2026-07-02T09:30:00Z"
    }
  ]
}
```

---

## Get System Event

```text id="auditapi20"
GET /api/workspaces/{workspace_id}/system-events/{event_id}
```

Returns one system event.

---

# Compliance Endpoints

---

## Export Audit Report

```text id="auditapi21"
POST /api/workspaces/{workspace_id}/audit-logs/export
```

Generates an export.

### Request Body

```json id="auditapi22"
{
  "from": "2026-01-01",
  "to": "2026-07-01",
  "format": "pdf"
}
```

Supported formats:

```text id="auditapi23"
pdf

csv

json
```

---

## Compliance Summary

```text id="auditapi24"
GET /api/workspaces/{workspace_id}/audit-logs/compliance
```

Returns summarized audit statistics.

---

# Validation Rules

## Event Type

Defined by:

```text id="auditapi25"
audit_event_types
```

---

## Time Range

Maximum export period should be configurable.

Large exports should execute asynchronously.

---

## Entity Type

Allowed values:

```text id="auditapi26"
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

# Filtering

Supported filters:

```text id="auditapi27"
event_type

entity_type

actor_user

actor_service

actor_agent

severity

created_after

created_before
```

---

# Sorting

Supported sorting:

```text id="auditapi28"
created_at_desc

created_at_asc

severity_desc
```

---

# Error Codes

```text id="auditapi29"
UNAUTHORIZED

FORBIDDEN

NOT_FOUND

VALIDATION_ERROR

EXPORT_ALREADY_RUNNING

EXPORT_LIMIT_EXCEEDED
```

---

# Future Backend Services Used

```text id="auditapi30"
Audit Service

Security Audit Service

Compliance Service

Investigation Service

AI Execution Audit Service

System Monitoring Service
```

---

# Response Expansion

Supported expansions:

```text id="auditapi31"
metadata

entity

system_event

related_signal

related_recommendation
```

Example:

```text id="auditapi32"
GET /audit-logs/{audit_id}?expand=metadata,entity
```

---

# Audit Events

Access to Audit Logs should itself be audited.

The API should generate:

```text id="auditapi33"
Audit Log Viewed

Audit Search Executed

Timeline Retrieved

Compliance Report Exported

System Event Viewed
```

---

# Future Agent Operations

Future AI Agents may use the Audit Log API to:

```text id="auditapi34"
Investigate Historical Decisions

Analyze User Activity

Review Failed Executions

Trace Recommendation History

Generate Incident Reports

Perform Root Cause Analysis
```

Agents must have explicit permission before accessing audit history.

---

# Investigation Flow

The Audit Log API enables complete historical reconstruction.

```text id="auditapi35"
Evidence

↓

Signal

↓

Recommendation

↓

Notification

↓

User Action

↓

Audit Log API

↓

Timeline Reconstruction
```

The API should allow investigators to understand the complete sequence of events leading to any business decision.

---

# Compliance Principles

The Audit Log API follows these principles:

```text id="auditapi36"
Immutable History

Read-Only Access

Workspace Isolation

Complete Traceability

Append-Only Records

Least Privilege
```

These principles ensure operational transparency and enterprise compliance.

---

# Final Rule

The Audit Log API exposes the permanent operational memory of Highlight Signal.

Business entities describe the current state.

Audit Logs describe how that state was reached.

Every audit record should remain immutable, searchable, explainable, and independently verifiable, enabling security investigations, compliance reporting, AI explainability, and long-term operational analysis across the entire platform.
