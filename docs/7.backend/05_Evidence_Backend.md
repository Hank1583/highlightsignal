# 05_Evidence_Backend.md

# Evidence Backend

Version: v1.0

Status: Draft

Layer: Backend Specification

Depends On:

* 01_Backend_Overview
* 05_Evidence_Database
* 05_Evidence_API
* 04_Signal_Backend
* Adaptive Evidence Engine
* Architecture v1.0 Frozen

---

# Purpose

> V1 Alignment Patch: Evidence services manage traceable facts and any required persisted Metrics. Explanation and Business Impact are derived interpretations and must remain distinguishable from Evidence. There is no independent V1 Metric or Insight module.

The Evidence Backend implements the factual foundation of Highlight Signal.

Evidence represents immutable observations collected from internal systems, external integrations, scanners, user input, and AI analysis.

Unlike Signals, Evidence does not contain business interpretation.

It represents **facts**.

The Evidence Backend guarantees that every Signal and Recommendation can be traced back to verifiable Evidence.

---

# Domain Responsibility

The Evidence Backend is responsible for:

* Evidence ingestion
* Evidence validation
* Evidence normalization
* Evidence versioning
* Evidence relationship management
* Evidence search
* Evidence snapshot generation

The Evidence Backend is **not** responsible for:

* Signal classification
* Recommendation generation
* Notification delivery
* Dashboard rendering

---

# Module Structure

```text id="evidencebe01"
Modules/
└── Evidence/
    ├── Controllers/
    ├── Services/
    ├── Repositories/
    ├── DTO/
    ├── Validators/
    ├── Policies/
    ├── Events/
    └── Jobs/
```

---

# Core Components

## Controllers

```text id="evidencebe02"
EvidenceController

EvidenceSearchController

EvidenceSnapshotController

EvidenceGraphController
```

Controllers are responsible only for request orchestration.

---

## Services

```text id="evidencebe03"
EvidenceService

EvidenceValidationService

EvidenceNormalizationService

EvidenceSnapshotService

EvidenceRelationshipService

EvidenceSearchService
```

EvidenceService coordinates the complete evidence lifecycle.

---

## Repositories

```text id="evidencebe04"
EvidenceRepository

EvidenceSnapshotRepository

EvidenceRelationshipRepository
```

Repositories contain persistence logic only.

---

## Validators

```text id="evidencebe05"
EvidenceValidator

EvidenceSearchValidator

SnapshotValidator
```

---

## Policies

```text id="evidencebe06"
EvidencePolicy
```

Responsible for access control.

---

# Service Responsibilities

---

## EvidenceService

Responsible for:

```text id="evidencebe07"
Create Evidence

Retrieve Evidence

Update Metadata

Search Evidence

Link Evidence

Archive Evidence
```

Business interpretation must not occur here.

---

## EvidenceValidationService

Responsible for:

```text id="evidencebe08"
Schema Validation

Required Fields

Data Integrity

Source Validation

Checksum Validation
```

Validation occurs before persistence.

---

## EvidenceNormalizationService

Responsible for:

```text id="evidencebe09"
Normalize Fields

Normalize Timestamp

Normalize Units

Normalize Metadata

Canonical Representation
```

Normalization guarantees consistent downstream processing.

---

## EvidenceSnapshotService

Responsible for:

```text id="evidencebe10"
Create Snapshot

Retrieve Snapshot

Compare Snapshots

Version Management
```

Snapshots are immutable.

---

## EvidenceRelationshipService

Responsible for:

```text id="evidencebe11"
Link Evidence

Traverse Graph

Build Relationships

Relationship Queries
```

Relationships support explainability.

---

## EvidenceSearchService

Responsible for:

```text id="evidencebe12"
Filtering

Sorting

Pagination

Keyword Search
```

---

# Transaction Boundaries

## Create Evidence

Transaction:

```text id="evidencebe13"
Validate

↓

Normalize

↓

Persist Evidence

↓

Create Snapshot

↓

Emit Event

↓

Audit Record

↓

Commit
```

---

## Link Evidence

Transaction:

```text id="evidencebe14"
Validate Entities

↓

Create Relationship

↓

Audit Record

↓

Commit
```

---

## Snapshot Creation

Transaction:

```text id="evidencebe15"
Freeze Data

↓

Generate Snapshot

↓

Persist Snapshot

↓

Audit Record

↓

Commit
```

Snapshots must never be modified after creation.

---

# Repository Interfaces

## EvidenceRepository

```text id="evidencebe16"
findById()

findByWorkspace()

search()

create()

updateMetadata()

archive()
```

---

## EvidenceSnapshotRepository

```text id="evidencebe17"
create()

findLatest()

findVersion()

compare()
```

---

## EvidenceRelationshipRepository

```text id="evidencebe18"
create()

findRelated()

delete()

graph()
```

---

# Evidence Processing Flow

Evidence ingestion pipeline:

```text id="evidencebe19"
Raw Data

↓

Validation

↓

Normalization

↓

Persistence

↓

Snapshot

↓

Relationship Analysis

↓

Signal Trigger
```

Evidence should remain immutable after ingestion.

---

# Event Flow

Domain events:

```text id="evidencebe20"
EvidenceCreated

EvidenceNormalized

SnapshotCreated

RelationshipCreated

EvidenceArchived
```

Events may trigger Signal analysis.

---

# Worker Jobs

Possible background jobs:

```text id="evidencebe21"
Bulk Evidence Import

Snapshot Generation

Relationship Discovery

Metadata Enrichment

Historical Normalization

Evidence Cleanup
```

Workers should process large batches asynchronously.

---

# Signal Integration

Evidence creation may trigger:

```text id="evidencebe22"
Evidence Created

↓

Signal Detection Queue

↓

Signal Backend
```

Evidence should never generate Signals directly.

---

# DTO Strategy

## Request DTOs

```text id="evidencebe23"
SearchEvidenceRequest

CompareSnapshotRequest

LinkEvidenceRequest
```

---

## Response DTOs

```text id="evidencebe24"
EvidenceSummaryDTO

EvidenceDetailDTO

SnapshotDTO

EvidenceGraphDTO
```

DTOs isolate API models from persistence models.

---

# Error Handling

Domain exceptions:

```text id="evidencebe25"
EvidenceNotFoundException

SnapshotNotFoundException

InvalidEvidenceException

RelationshipAlreadyExistsException

EvidenceNormalizationException
```

Exceptions should be handled by global middleware.

---

# Audit Strategy

Audit records should be generated for:

```text id="evidencebe26"
Evidence Created

Evidence Viewed

Evidence Linked

Snapshot Created

Snapshot Compared

Evidence Archived
```

Audit logging belongs to the Service layer.

---

# Performance Strategy

Frequently accessed objects:

```text id="evidencebe27"
Latest Evidence

Recent Snapshots

Evidence Graph

Evidence Search
```

Recommended optimizations:

* Metadata indexes
* Snapshot version indexes
* Cached graph traversal
* Lazy loading for relationships

---

# Security Rules

Evidence services must enforce:

```text id="evidencebe28"
Workspace Isolation

Input Validation

Immutable Snapshots

Audit Logging

Relationship Integrity
```

Evidence must never be modified after snapshot creation.

---

# Testing Strategy

Unit Tests:

```text id="evidencebe29"
EvidenceService

EvidenceValidationService

EvidenceNormalizationService

EvidenceSnapshotService

EvidenceRelationshipService
```

Integration Tests:

```text id="evidencebe30"
Create Evidence

Create Snapshot

Compare Snapshots

Link Evidence

Evidence Search
```

---

# Dependency Graph

```text id="evidencebe31"
EvidenceController

↓

EvidenceService

↓

EvidenceRepository

↓

Database
```

Supporting services:

```text id="evidencebe32"
EvidenceService

↓

EvidenceValidationService

↓

EvidenceSnapshotService

↓

SignalService

↓

AuditService

↓

JobService
```

Dependencies must remain one-directional.

---

# Codex Generation Targets

This specification should allow Codex to generate:

```text id="evidencebe33"
EvidenceController

EvidenceSnapshotController

EvidenceGraphController

EvidenceService

EvidenceValidationService

EvidenceNormalizationService

EvidenceSnapshotService

EvidenceRelationshipService

EvidenceRepository

Validators

Policies

DTOs

Worker Jobs

Domain Events

Unit Tests
```

---

# Evidence Pipeline

The Evidence Backend is the factual ingestion layer.

```text id="evidencebe34"
Raw Observation

↓

Validation

↓

Normalization

↓

Evidence Persistence

↓

Snapshot

↓

Relationship Analysis

↓

Signal Detection
```

Every downstream decision must remain traceable to one or more immutable Evidence records.

---

# Final Rule

The Evidence Backend is the factual memory of Highlight Signal.

It ingests, validates, normalizes, versions, and relates Evidence while preserving immutability and traceability.

The module must guarantee that every Signal, Recommendation, and AI decision can always be explained through verifiable Evidence, maintaining deterministic behavior and compatibility with the PHP-first modular monolith architecture.
