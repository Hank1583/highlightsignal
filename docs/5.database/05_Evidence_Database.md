# 05_Evidence_Database.md

# Evidence Database

> **V12-06 note (2026-07-22)**: pre-implementation Draft (`evidence_sources`,
> `evidence_snapshots`, `evidence_relationships` tables, UUID/JSONB) — does
> not match what actually shipped. `backend/sql/migrations/025_evidence_persistence.sql`'s
> own comment already names this exact file as an obsolete draft written
> "for a different UUID/Postgres/JSONB architecture." Real schema: a single
> `evidence_items` table plus `signal_evidence_links` (BIGINT PKs, a
> `payload_json` snapshot with a `content_hash` for dedup — no separate
> sources/snapshots/relationship-graph tables). Treat this file as
> historical design intent, not a current reference.

Version: v1.0

Status: Draft (superseded by real implementation — see note above)

Layer: Database Specification

Depends On:

* 01_Database_Overview
* 04_Signal_Database
* Adaptive Evidence Engine
* Architecture v1.0 Frozen

---

# Purpose

> V1 Alignment Patch: The Evidence Domain may persist required Raw Observations and Metrics. Evidence, AI Explanation, and Business Impact are separate concerns. V1 does not introduce an independent Metric Domain or Insight table.

The Evidence database defines the factual foundation of Highlight Signal.

Evidence represents the observable data that supports a Signal.

Unlike Signals, Evidence is never an interpretation.

It is the objective information collected from internal systems, external services, AI analysis, or user input.

Every Signal should be explainable through one or more Evidence records.

The Evidence domain enables traceable, auditable, and explainable AI decisions.

---

# Domain Responsibility

The Evidence domain is responsible for:

* Raw evidence storage
* Evidence versioning
* Evidence snapshots
* Evidence relationships
* Source attribution
* Traceability
* Historical preservation

The Evidence domain is **not** responsible for:

* Signal prioritization
* AI recommendations
* Notification delivery
* Dashboard presentation

---

# Core Entities

```text
evidence_items

evidence_sources

evidence_snapshots

signal_evidence_links

evidence_relationships
```

---

# Aggregate Structure

```text
Evidence

├── Source
├── Snapshot
├── Signal Links
├── Relationships
└── Metadata
```

Evidence is the Aggregate Root of factual data.

---

# Entity Definition

---

## evidence_items

Represents one logical piece of evidence.

### Fields

| Field         | Type         | Required | Description          |
| ------------- | ------------ | -------- | -------------------- |
| id            | UUID         | Yes      | Primary key          |
| workspace_id  | UUID         | Yes      | Workspace owner      |
| source_id     | UUID         | Yes      | Evidence source      |
| evidence_type | VARCHAR(50)  | Yes      | Evidence category    |
| title         | VARCHAR(255) | Yes      | Human-readable title |
| summary       | TEXT         | Yes      | Short description    |
| confidence    | DECIMAL(5,2) | Yes      | Confidence score     |
| metadata      | JSONB        | No       | Structured metadata  |
| created_at    | TIMESTAMP    | Yes      | First created        |
| updated_at    | TIMESTAMP    | Yes      | Latest update        |

---

### Example Evidence Types

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

## evidence_sources

Represents where evidence originated.

### Fields

| Field         | Type      |
| ------------- | --------- |
| id            | UUID      |
| provider      | VARCHAR   |
| source_name   | VARCHAR   |
| source_type   | VARCHAR   |
| version       | VARCHAR   |
| configuration | JSONB     |
| created_at    | TIMESTAMP |

---

### Example Providers

```text
Google Analytics

Google Search Console

Google Ads

Cloudflare

RiskRadar

GitHub

AWS

Azure

GCP

OpenAI

Manual Input
```

---

## evidence_snapshots

Stores immutable versions of evidence.

Every significant change creates a new snapshot.

### Fields

| Field            | Type      |
| ---------------- | --------- |
| id               | UUID      |
| evidence_id      | UUID      |
| snapshot_version | INTEGER   |
| raw_payload      | JSONB     |
| checksum         | VARCHAR   |
| captured_at      | TIMESTAMP |
| created_at       | TIMESTAMP |

Snapshots are immutable.

---

## signal_evidence_links

Defines many-to-many relationships between Signals and Evidence.

### Fields

| Field             | Type         |
| ----------------- | ------------ |
| id                | UUID         |
| signal_id         | UUID         |
| evidence_id       | UUID         |
| relationship_type | VARCHAR      |
| weight            | DECIMAL(5,2) |
| created_at        | TIMESTAMP    |

---

### Relationship Types

```text
Primary

Supporting

Related

Historical

Reference
```

---

## evidence_relationships

Defines relationships between Evidence records.

### Fields

| Field              | Type      |
| ------------------ | --------- |
| id                 | UUID      |
| parent_evidence_id | UUID      |
| child_evidence_id  | UUID      |
| relationship_type  | VARCHAR   |
| created_at         | TIMESTAMP |

---

### Example Relationship Types

```text
Derived From

Duplicate

Supersedes

Depends On

Correlated

Explains
```

---

# Relationships

```text
Evidence Source

↓

Evidence Item

↓

Evidence Snapshot

↓

Signal Evidence Link

↓

Signal
```

Additional graph:

```text
Evidence

↓

Evidence Relationship

↓

Evidence
```

---

## Cardinality

```text
Workspace

↓

Many Evidence

Evidence

↓

Many Snapshots

Evidence

↓

Many Signals

Evidence

↓

Many Related Evidence
```

---

# Primary Keys

```text
evidence_items.id

evidence_sources.id

evidence_snapshots.id

signal_evidence_links.id

evidence_relationships.id
```

---

# Foreign Keys

```text
evidence_items.workspace_id
→ workspaces.id
```

```text
evidence_items.source_id
→ evidence_sources.id
```

```text
evidence_snapshots.evidence_id
→ evidence_items.id
```

```text
signal_evidence_links.signal_id
→ signals.id
```

```text
signal_evidence_links.evidence_id
→ evidence_items.id
```

```text
evidence_relationships.parent_evidence_id
→ evidence_items.id
```

```text
evidence_relationships.child_evidence_id
→ evidence_items.id
```

---

# Lifecycle

## Evidence Collection

```text
External Source

↓

Evidence Created

↓

Snapshot Stored
```

---

## Evidence Update

```text
New Observation

↓

New Snapshot

↓

History Preserved
```

---

## Signal Association

```text
Evidence

↓

Decision Engine

↓

Signal Link Created
```

---

## AI Explanation

```text
Signal

↓

Evidence Graph

↓

Supporting Facts

↓

Explanation Generated
```

---

## Historical Review

```text
Evidence

↓

Snapshot Timeline

↓

Version Comparison
```

---

# Index Strategy

## Workspace Search

```sql
INDEX(workspace_id)
```

---

## Source Lookup

```sql
INDEX(source_id)
```

---

## Evidence Type

```sql
INDEX(evidence_type)
```

---

## Timeline

```sql
INDEX(created_at DESC)
```

---

## Snapshot Version

```sql
UNIQUE(evidence_id, snapshot_version)
```

---

## Signal Mapping

```sql
INDEX(signal_id)

INDEX(evidence_id)
```

---

## Graph Traversal

```sql
INDEX(parent_evidence_id)

INDEX(child_evidence_id)
```

---

# Constraints

---

## Workspace Ownership

Every Evidence belongs to one workspace.

---

## Snapshot Immutability

Snapshots must never be updated.

Corrections require a new snapshot.

---

## Version Sequence

Snapshot versions increase sequentially.

---

## Checksum

Each snapshot should include a checksum to verify integrity.

---

## Metadata

Metadata should remain structured.

Recommended storage:

```text
JSONB
```

---

## Relationship Integrity

Evidence cannot reference itself.

Circular references should be prevented where possible.

---

## Signal Traceability

Signals should never reference raw payloads directly.

Signals reference Evidence.

Evidence references Snapshots.

---

# Future APIs

```text
Create Evidence

Get Evidence

List Evidence

Search Evidence

Get Evidence Timeline

Get Snapshots

Compare Snapshots

Link Signal

Unlink Signal

Get Evidence Graph

Traverse Relationships
```

---

# Future Backend Services

## Evidence Collection Service

Collects evidence from external systems.

---

## Evidence Versioning Service

Creates immutable snapshots.

---

## Evidence Relationship Service

Builds the Evidence Graph.

---

## Evidence Validation Service

Checks integrity, checksum, and consistency.

---

## Evidence Search Service

Supports advanced filtering and graph traversal.

---

## AI Explanation Service

Retrieves supporting evidence for AI-generated explanations.

---

# Implementation Notes

Recommended implementation:

```text
UUID Primary Keys

Immutable Snapshots

JSONB Payload

Append-Only History

Workspace Isolation

Graph Relationships
```

Future metadata example:

```json
{
  "provider": "Google Analytics",
  "metric": "organic_sessions",
  "period": "last_30_days",
  "value": 12450,
  "change": -18.6
}
```

Snapshots should preserve the original observation exactly as collected.

Derived values belong in Signals or Recommendations, not in Evidence.

---

# Evidence Graph

The Evidence database forms a graph rather than a flat collection.

```text
Evidence A

├── Derived From → Evidence B

├── Correlated → Evidence C

├── Explains → Evidence D

└── Supports → Signal
```

This graph enables explainable AI, historical reasoning, and future knowledge retrieval.

---

# Final Rule

Evidence represents facts.

Signals represent interpretations.

Recommendations represent decisions.

The Evidence database preserves the objective foundation of every business decision made within Highlight Signal.

No Signal should exist without traceable supporting Evidence.
