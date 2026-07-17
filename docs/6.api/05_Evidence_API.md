# 05_Evidence_API.md

# Evidence API

Version: v1.0

Status: Draft

Layer: API Specification

Depends On:

* 01_API_Overview
* 04_Signal_API
* 05_Evidence_Database
* Adaptive Evidence Engine
* Architecture v1.0 Frozen

---

# Purpose

> V1 Alignment Patch: Evidence responses must distinguish traceable Evidence from Explanation and Business Impact. Metric access remains part of the Evidence boundary rather than an independent V1 API domain.

The Evidence API defines how clients retrieve, inspect, search, and traverse Evidence within Highlight Signal.

Evidence represents the factual foundation of every business decision.

Unlike Signals, Evidence is never an interpretation.

It provides the objective observations, measurements, findings, and historical snapshots that support AI reasoning and user decisions.

The Evidence API enables transparent, explainable, and traceable decision making.

---

# Domain Responsibility

The Evidence API is responsible for:

* Evidence retrieval
* Evidence search
* Evidence timeline
* Snapshot inspection
* Evidence graph traversal
* Signal relationships
* Source attribution

The Evidence API is **not** responsible for:

* Evidence collection
* Signal generation
* Recommendation generation
* Notification delivery

Evidence creation is handled by backend ingestion services.

---

# Base Routes

```text
/api/workspaces/{workspace_id}/evidence
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

Evidence is read-only for most users.

Administrative operations belong to backend services.

---

# Endpoints

---

## List Evidence

```text
GET /api/workspaces/{workspace_id}/evidence
```

Returns paginated Evidence records.

### Query Parameters

```text
page

per_page

evidence_type

source

confidence_min

created_after

created_before

sort
```

### Example

```text
GET /api/workspaces/{workspace_id}/evidence?evidence_type=Security Finding&sort=created_at_desc
```

### Response

```json
{
  "data": [
    {
      "id": "evidence_uuid",
      "title": "Missing Content Security Policy",
      "evidence_type": "Security Finding",
      "confidence": 99.8,
      "source": "RiskRadar",
      "created_at": "2026-07-02T09:30:00Z"
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "per_page": 20,
      "total": 246
    }
  }
}
```

---

## Get Evidence

```text
GET /api/workspaces/{workspace_id}/evidence/{evidence_id}
```

Returns complete Evidence details.

### Response

```json
{
  "data": {
    "id": "evidence_uuid",
    "title": "Missing Content Security Policy",
    "summary": "No CSP header detected during scan.",
    "evidence_type": "Security Finding",
    "confidence": 99.8,
    "source": "RiskRadar",
    "metadata": {},
    "created_at": "2026-07-02T09:30:00Z"
  }
}
```

---

## Search Evidence

```text
GET /api/workspaces/{workspace_id}/evidence/search
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
GET /evidence/search?q=csp
```

---

# Snapshot APIs

---

## List Snapshots

```text
GET /api/workspaces/{workspace_id}/evidence/{evidence_id}/snapshots
```

Returns all immutable snapshots.

### Response

```json
{
  "data": [
    {
      "snapshot_version": 1,
      "captured_at": "2026-07-01T08:00:00Z"
    },
    {
      "snapshot_version": 2,
      "captured_at": "2026-07-02T08:00:00Z"
    }
  ]
}
```

---

## Get Snapshot

```text
GET /api/workspaces/{workspace_id}/evidence/{evidence_id}/snapshots/{version}
```

Returns one snapshot.

---

## Compare Snapshots

```text
GET /api/workspaces/{workspace_id}/evidence/{evidence_id}/compare
```

### Query Parameters

```text
from

to
```

Example:

```text
GET /compare?from=1&to=2
```

Returns a structured comparison between snapshots.

---

# Relationship APIs

---

## Get Related Signals

```text
GET /api/workspaces/{workspace_id}/evidence/{evidence_id}/signals
```

Returns Signals supported by this Evidence.

---

## Get Related Evidence

```text
GET /api/workspaces/{workspace_id}/evidence/{evidence_id}/relationships
```

Returns connected Evidence records.

### Response

```json
{
  "data": [
    {
      "relationship_type": "Derived From",
      "related_evidence_id": "evidence_uuid"
    }
  ]
}
```

---

## Get Evidence Graph

```text
GET /api/workspaces/{workspace_id}/evidence/{evidence_id}/graph
```

Returns the Evidence Graph centered on the requested Evidence.

The response includes nodes and edges suitable for graph visualization or AI reasoning.

---

# Validation Rules

## Evidence Type

Allowed values include:

```text
Metric

Event

Security Finding

SEO Finding

Traffic

Cloud Asset

AI Observation

Rule Result

User Feedback
```

---

## Confidence

Allowed range:

```text
0

↓

100
```

---

## Snapshot Version

Must be a positive integer.

Snapshots are immutable.

---

# Filtering

Supported filters:

```text
evidence_type

source

confidence_min

confidence_max

created_after

created_before
```

---

# Sorting

Supported sorting:

```text
created_at_desc

created_at_asc

confidence_desc

confidence_asc
```

---

# Error Codes

```text
UNAUTHORIZED

FORBIDDEN

NOT_FOUND

VALIDATION_ERROR

SNAPSHOT_NOT_FOUND

VERSION_NOT_FOUND
```

---

# Future Backend Services Used

```text
Evidence Service

Evidence Search Service

Evidence Versioning Service

Evidence Relationship Service

Evidence Validation Service

AI Explanation Service

Audit Service
```

---

# Audit Events

Evidence API should generate audit events for:

```text
Evidence Viewed

Evidence Searched

Snapshot Viewed

Snapshot Compared

Evidence Graph Accessed
```

Read operations are auditable because they may involve sensitive operational data.

---

# Response Expansion

Supported expansions:

```text
snapshots

signals

relationships

source

metadata
```

Example:

```text
GET /evidence/{evidence_id}?expand=signals,relationships
```

---

# Future Agent Operations

Future AI Agents may use the Evidence API to:

```text
Retrieve Supporting Evidence

Traverse Evidence Graph

Compare Historical Snapshots

Validate Signal Justification

Collect Context Before Recommendation Generation
```

The API should provide sufficient factual context without exposing internal implementation details.

---

# Explainability Flow

The Evidence API enables explainable AI.

```text
Evidence

↓

Evidence API

↓

Signal

↓

Recommendation

↓

User Explanation
```

Every recommendation should be traceable back to one or more Evidence records exposed through this API.

---

# Final Rule

The Evidence API exposes the factual foundation of Highlight Signal.

Evidence is immutable, traceable, and explainable.

The API should enable users, AI assistants, and future autonomous agents to understand **why** a Signal exists by providing transparent access to supporting facts, historical snapshots, and evidence relationships.
