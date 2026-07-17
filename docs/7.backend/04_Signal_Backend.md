# 04_Signal_Backend.md

# Signal Backend

Version: v1.0

Status: Draft

Layer: Backend Specification

Depends On:

* 01_Backend_Overview
* 04_Signal_Database
* 04_Signal_API
* 05_Evidence_Backend
* 06_Recommendation_Backend
* AI Decision Engine
* Architecture v1.0 Frozen

---

# Purpose

The Signal Backend implements the core Decision Engine of Highlight Signal.

Signal is the primary business entity of the platform.

It transforms raw Evidence into meaningful business decisions through classification, prioritization, correlation, and lifecycle management.

The Signal Backend is the central orchestration layer between data collection and decision execution.

---

# Domain Responsibility

The Signal Backend is responsible for:

* Signal creation
* Signal classification
* Signal scoring
* Signal prioritization
* Signal deduplication
* Signal correlation
* Signal lifecycle
* Signal search

The Signal Backend is **not** responsible for:

* Evidence collection
* Recommendation execution
* Notification delivery
* Dashboard rendering

---

# Module Structure

```text id="signalbe01"
Modules/
└── Signal/
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

```text id="signalbe02"
SignalController

SignalSearchController

SignalLifecycleController
```

Controllers should:

* Validate requests
* Check permissions
* Call services
* Return DTOs

No business rules should exist in controllers.

---

## Services

```text id="signalbe03"
SignalService

SignalClassificationService

SignalScoringService

SignalDeduplicationService

SignalCorrelationService

SignalLifecycleService

SignalSearchService
```

The SignalService coordinates all business logic.

---

## Repositories

```text id="signalbe04"
SignalRepository

SignalHistoryRepository

SignalRelationshipRepository
```

Repositories are persistence-only components.

---

## Validators

```text id="signalbe05"
SignalSearchValidator

SignalLifecycleValidator

SignalFilterValidator
```

---

## Policies

```text id="signalbe06"
SignalPolicy
```

Responsible for resource authorization.

---

# Service Responsibilities

---

## SignalService

Responsible for:

```text id="signalbe07"
Create Signal

Retrieve Signal

Update Signal

Archive Signal

Resolve Signal

Search Signal
```

Acts as the orchestration service.

---

## SignalClassificationService

Responsible for:

```text id="signalbe08"
Classify Signal Type

Assign Severity

Determine Category

Normalize Metadata
```

Classification should be deterministic whenever possible.

---

## SignalScoringService

Responsible for calculating:

```text id="signalbe09"
Priority

Risk Score

Confidence

Business Impact
```

The scoring algorithm should remain isolated.

---

## SignalDeduplicationService

Responsible for:

```text id="signalbe10"
Detect Duplicate Signals

Merge Similar Signals

Prevent Duplicate Creation
```

---

## SignalCorrelationService

Responsible for:

```text id="signalbe11"
Find Related Signals

Build Signal Relationships

Cross-Reference Evidence
```

---

## SignalLifecycleService

Responsible for:

```text id="signalbe12"
New

Investigating

Confirmed

Resolved

Dismissed

Archived
```

Only this service may change Signal state.

---

## SignalSearchService

Responsible for:

```text id="signalbe13"
Filtering

Sorting

Pagination

Full Text Search
```

---

# Transaction Boundaries

## Create Signal

Transaction:

```text id="signalbe14"
Validate Evidence

↓

Deduplicate

↓

Classify

↓

Calculate Score

↓

Persist Signal

↓

Create History

↓

Emit Event

↓

Audit Record

↓

Commit
```

---

## Resolve Signal

Transaction:

```text id="signalbe15"
Validate Transition

↓

Update Status

↓

Write History

↓

Emit Event

↓

Audit Record

↓

Commit
```

---

## Archive Signal

Transaction:

```text id="signalbe16"
Validate Status

↓

Archive Signal

↓

Create Audit Record

↓

Commit
```

---

# Repository Interfaces

## SignalRepository

```text id="signalbe17"
findById()

findByWorkspace()

search()

create()

update()

archive()

exists()
```

---

## SignalHistoryRepository

```text id="signalbe18"
create()

findHistory()

findTimeline()
```

---

## SignalRelationshipRepository

```text id="signalbe19"
findRelated()

createRelation()

deleteRelation()
```

---

# Signal Processing Flow

Signal creation pipeline:

```text id="signalbe20"
Evidence

↓

Validation

↓

Classification

↓

Deduplication

↓

Scoring

↓

Persist

↓

Recommendation Trigger

↓

Notification Trigger
```

Signals should never bypass this pipeline.

---

# Event Flow

Domain events:

```text id="signalbe21"
SignalCreated

SignalUpdated

SignalResolved

SignalDismissed

SignalArchived

SignalScoreChanged

SignalRelationshipCreated
```

Events may trigger downstream services.

---

# Worker Jobs

Possible background jobs:

```text id="signalbe22"
Signal Classification

Risk Score Recalculation

Relationship Discovery

Duplicate Detection

Bulk Signal Import

Historical Reprocessing
```

Workers should operate asynchronously.

---

# Recommendation Integration

Signal completion may trigger:

```text id="signalbe23"
Recommendation Generation

↓

Recommendation Queue

↓

Recommendation Worker
```

Recommendation generation must remain independent.

---

# Notification Integration

Signal lifecycle events may trigger:

```text id="signalbe24"
Critical Signal

↓

Notification Job

↓

Notification Service
```

SignalService should never deliver notifications directly.

---

# DTO Strategy

## Request DTOs

```text id="signalbe25"
ResolveSignalRequest

DismissSignalRequest

SearchSignalRequest
```

---

## Response DTOs

```text id="signalbe26"
SignalSummaryDTO

SignalDetailDTO

SignalHistoryDTO

RelatedSignalDTO
```

DTOs isolate domain objects from API contracts.

---

# Error Handling

Domain exceptions:

```text id="signalbe27"
SignalNotFoundException

DuplicateSignalException

InvalidSignalTransitionException

SignalAlreadyResolvedException

SignalAlreadyArchivedException

SignalRelationshipException
```

All exceptions should be converted through global middleware.

---

# Audit Strategy

Audit records should be generated for:

```text id="signalbe28"
Signal Created

Signal Viewed

Signal Updated

Signal Resolved

Signal Dismissed

Signal Archived

Signal Reclassified

Signal Score Updated
```

Audit logging belongs to the Service layer.

---

# Performance Strategy

Frequently accessed objects:

```text id="signalbe29"
Active Signals

Critical Signals

Signal Timeline

Signal Search

Related Signals
```

Recommended optimizations:

* Indexed queries
* Cached search metadata
* Lazy loading for relationships
* Background score recalculation

---

# Security Rules

Signal services must enforce:

```text id="signalbe30"
Workspace Isolation

Role Authorization

Lifecycle Validation

Audit Logging

Immutable History
```

Signal ownership must always be verified against the current Workspace.

---

# Testing Strategy

Unit Tests:

```text id="signalbe31"
SignalService

SignalScoringService

SignalClassificationService

SignalLifecycleService

SignalDeduplicationService
```

Integration Tests:

```text id="signalbe32"
Create Signal

Resolve Signal

Archive Signal

Search Signal

Related Signal Lookup
```

---

# Dependency Graph

```text id="signalbe33"
SignalController

↓

SignalService

↓

SignalRepository

↓

Database
```

Supporting services:

```text id="signalbe34"
SignalService

↓

SignalScoringService

↓

RecommendationService

↓

AuditService

↓

JobService
```

Dependencies should remain acyclic.

---

# Codex Generation Targets

This specification should allow Codex to generate:

```text id="signalbe35"
SignalController

SignalLifecycleController

SignalService

SignalScoringService

SignalClassificationService

SignalDeduplicationService

SignalRepository

Validators

Policies

DTOs

Worker Jobs

Domain Events

Unit Tests
```

---

# Decision Pipeline

The Signal Backend represents the core Decision Engine.

```text id="signalbe36"
Evidence

↓

Signal Classification

↓

Risk Scoring

↓

Signal Creation

↓

Recommendation Trigger

↓

Notification Trigger

↓

Audit Record
```

Every Signal should pass through a consistent, deterministic processing pipeline.

---

# Final Rule

The Signal Backend is the operational core of Highlight Signal.

It transforms factual Evidence into structured business Signals through classification, scoring, correlation, and lifecycle management.

The module must guarantee deterministic processing, transactional consistency, complete traceability, and clean separation from downstream Recommendation and Notification execution while remaining optimized for the PHP-first modular monolith architecture.
