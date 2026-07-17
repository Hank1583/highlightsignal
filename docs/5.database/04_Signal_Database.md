# 04_Signal_Database.md

# Signal Database

Version: v1.0

Status: Draft

Layer: Database Specification

Depends On:

* 01_Database_Overview
* 02_Workspace_Database
* 03_User_Account_Database
* Signal Framework
* AI Decision Engine
* Recommendation Engine
* Architecture v1.0 Frozen

---

# Purpose

The Signal database defines the central decision object of Highlight Signal.

A Signal represents an important event, opportunity, risk, anomaly, or trend detected by the platform.

Signals are not raw observations.

They are interpreted, decision-ready objects created from evidence.

Every recommendation, notification, dashboard widget, and AI explanation ultimately references a Signal.

---

# Domain Responsibility

The Signal domain is responsible for:

* Signal creation
* Signal classification
* Signal lifecycle
* Signal severity
* Signal priority
* Signal ownership
* Signal source tracking
* Decision status

The Signal domain is **not** responsible for:

* Raw evidence storage
* AI prompt execution
* Notification delivery
* Dashboard rendering

Those belong to other domains.

---

# Core Entities

```text
signals

signal_types

signal_sources

signal_status_history
```

---

# Aggregate Structure

```text
Signal

├── Signal Type
├── Signal Source
├── Signal Status History
├── Evidence Links
├── Recommendations
├── Notifications
└── Audit Logs
```

Signal is the Aggregate Root.

---

# Entity Definition

---

## signals

Represents one decision-ready signal.

### Fields

| Field             | Type         | Required | Description            |
| ----------------- | ------------ | -------- | ---------------------- |
| id                | UUID         | Yes      | Primary key            |
| workspace_id      | UUID         | Yes      | Workspace owner        |
| signal_type_id    | UUID         | Yes      | Signal classification  |
| source_id         | UUID         | Yes      | Detection source       |
| title             | VARCHAR(255) | Yes      | Short title            |
| summary           | TEXT         | Yes      | Human-readable summary |
| severity          | VARCHAR(20)  | Yes      | Business severity      |
| priority          | INTEGER      | Yes      | Decision priority      |
| score             | DECIMAL(5,2) | Yes      | Decision score (0–100) |
| confidence        | DECIMAL(5,2) | Yes      | AI confidence (0–100)  |
| status            | VARCHAR(30)  | Yes      | Current lifecycle      |
| first_detected_at | TIMESTAMP    | Yes      | First detection        |
| last_detected_at  | TIMESTAMP    | Yes      | Latest detection       |
| resolved_at       | TIMESTAMP    | No       | Resolution time        |
| created_at        | TIMESTAMP    | Yes      | Created time           |
| updated_at        | TIMESTAMP    | Yes      | Updated time           |

---

### Severity

```text
critical

high

medium

low

info
```

---

### Status

```text
new

investigating

confirmed

resolved

dismissed

archived
```

---

## signal_types

Defines reusable signal categories.

### Fields

| Field            | Type         |
| ---------------- | ------------ |
| id               | UUID         |
| code             | VARCHAR(50)  |
| name             | VARCHAR(100) |
| category         | VARCHAR(50)  |
| description      | TEXT         |
| default_severity | VARCHAR      |
| created_at       | TIMESTAMP    |

---

### Example Categories

```text
SEO

Traffic

Ads

Security

Performance

Availability

Cloud

Business

AI

Marketing
```

---

## signal_sources

Defines where a signal originated.

### Fields

| Field         | Type      |
| ------------- | --------- |
| id            | UUID      |
| provider      | VARCHAR   |
| source_type   | VARCHAR   |
| display_name  | VARCHAR   |
| configuration | JSONB     |
| created_at    | TIMESTAMP |

---

### Example Providers

```text
Google Analytics

Google Search Console

Google Ads

Cloudflare

GitHub

RiskRadar

OpenAI

Internal Rule Engine
```

---

## signal_status_history

Tracks every status transition.

### Fields

| Field              | Type      |
| ------------------ | --------- |
| id                 | UUID      |
| signal_id          | UUID      |
| previous_status    | VARCHAR   |
| new_status         | VARCHAR   |
| changed_by_user_id | UUID      |
| changed_by_service | VARCHAR   |
| reason             | TEXT      |
| created_at         | TIMESTAMP |

---

# Relationships

```text
workspaces

↓

signals

├── signal_types
├── signal_sources
├── signal_status_history
├── evidence_items
├── recommendations
├── notifications
└── audit_logs
```

---

## Cardinality

```text
Workspace

↓

Many Signals

Signal

↓

One Type

Signal

↓

One Source

Signal

↓

Many Status History Records

Signal

↓

Many Evidence Items

Signal

↓

Many Recommendations

Signal

↓

Many Notifications
```

---

# Primary Keys

```text
signals.id

signal_types.id

signal_sources.id

signal_status_history.id
```

---

# Foreign Keys

```text
signals.workspace_id
→ workspaces.id
```

```text
signals.signal_type_id
→ signal_types.id
```

```text
signals.source_id
→ signal_sources.id
```

```text
signal_status_history.signal_id
→ signals.id
```

```text
signal_status_history.changed_by_user_id
→ users.id
```

---

# Lifecycle

## Signal Detection

```text
Evidence

↓

Rule Evaluation

↓

Signal Created
```

---

## Signal Scoring

```text
Signal

↓

Decision Engine

↓

Score Updated

↓

Priority Assigned
```

---

## AI Interpretation

```text
Signal

↓

AI Analysis

↓

Summary Updated

↓

Recommendation Generated
```

---

## Human Review

```text
New

↓

Investigating

↓

Confirmed

↓

Resolved
```

Alternative path:

```text
New

↓

Dismissed
```

---

## Historical Archive

```text
Resolved

↓

Archived

↓

Read Only
```

---

# Index Strategy

## Workspace Timeline

```sql
INDEX(workspace_id, created_at DESC)
```

---

## Active Signals

```sql
INDEX(workspace_id, status)
```

---

## Severity Dashboard

```sql
INDEX(workspace_id, severity)
```

---

## Priority Queue

```sql
INDEX(workspace_id, priority DESC)
```

---

## Decision Score

```sql
INDEX(workspace_id, score DESC)
```

---

## Detection Timeline

```sql
INDEX(last_detected_at DESC)
```

---

## Signal Type

```sql
INDEX(signal_type_id)
```

---

## Source

```sql
INDEX(source_id)
```

---

# Constraints

---

## Workspace Ownership

Every signal belongs to exactly one workspace.

---

## Signal Type

A signal must reference one valid signal type.

---

## Source

A signal must identify its origin.

---

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

## Score

Allowed range:

```text
0

↓

100
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

## Immutable Detection

The first detection timestamp should never change.

Only the latest detection time may be updated.

---

## History Preservation

Status changes must never overwrite previous states.

All transitions are appended to:

```text
signal_status_history
```

---

# Future APIs

```text
Create Signal

Get Signal

List Signals

Update Signal

Resolve Signal

Dismiss Signal

Archive Signal

Get Signal Timeline

Get Signal History

Get Signal Evidence

Get Recommendations

Search Signals

Filter Signals
```

---

# Future Backend Services

## Signal Detection Service

Creates new signals from evidence.

---

## Signal Scoring Service

Calculates priority, severity, and business score.

---

## Signal Classification Service

Assigns signal type automatically.

---

## Signal Deduplication Service

Merges duplicate detections into existing signals.

---

## Signal Lifecycle Service

Manages lifecycle transitions.

---

## Signal Search Service

Supports filtering and full-text search.

---

## Signal Archive Service

Moves inactive signals into long-term storage.

---

# Implementation Notes

Recommended implementation:

```text
UUID Primary Keys

Workspace Isolation

Append-Only Status History

Immutable First Detection

JSONB for Future Metadata

Soft Archive
```

Future extension field:

```sql
metadata JSONB
```

Example:

```json
{
  "ai_model": "gpt-5.5",
  "rule_version": "2.1",
  "importance": 94,
  "tags": [
    "seo",
    "traffic",
    "anomaly"
  ]
}
```

This allows future AI capabilities without requiring schema changes.

---

# Decision Flow

The Signal database is the center of the Highlight Signal platform.

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

User Decision

↓

Audit Log
```

Every major business workflow begins with a Signal.

---

# Final Rule

Signals are the primary decision objects of Highlight Signal.

Evidence explains **why** a signal exists.

Recommendations explain **what should be done**.

Notifications determine **who should know**.

Widgets determine **how the information is presented**.

The Signal database serves as the central hub connecting every domain within the platform while preserving a complete, traceable history of business decisions.
