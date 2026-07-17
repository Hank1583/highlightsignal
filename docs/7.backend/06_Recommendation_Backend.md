# 06_Recommendation_Backend.md

# Recommendation Backend

Version: v1.0

Status: Draft

Layer: Backend Specification

Depends On:

* 01_Backend_Overview
* 06_Recommendation_Database
* 06_Recommendation_API
* 04_Signal_Backend
* 05_Evidence_Backend
* AI Recommendation Engine
* Architecture v1.0 Frozen

---

# Purpose

> V1 Alignment Patch: The Recommendation module owns Recommendation, Human Review transitions, formal Decision, and business-level Action intent. It may create a Task through Execution or an authorized Queue Job through the queue interface. Recommendation never auto-executes without explicit human authorization.

The Recommendation Backend implements the Decision Execution Layer of Highlight Signal.

Recommendations transform business Signals into executable actions.

Unlike Signals, which identify important situations, Recommendations determine **what should happen next**.

The Recommendation Backend coordinates recommendation generation, action planning, lifecycle management, and user feedback while remaining independent of notification delivery and presentation.

---

# Domain Responsibility

The Recommendation Backend is responsible for:

* Recommendation generation
* Recommendation ranking
* Action planning
* Recommendation lifecycle
* Recommendation feedback
* Recommendation search
* Recommendation history

The Recommendation Backend is **not** responsible for:

* Evidence collection
* Signal detection
* Notification delivery
* Widget rendering

---

# Module Structure

```text id="recommendbe01"
Modules/
└── Recommendation/
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

```text id="recommendbe02"
RecommendationController

RecommendationLifecycleController

RecommendationActionController

RecommendationFeedbackController
```

Controllers should:

* Validate requests
* Check permissions
* Invoke services
* Return DTOs

Business rules belong exclusively to the Service layer.

---

## Services

```text id="recommendbe03"
RecommendationService

RecommendationGenerationService

RecommendationRankingService

ActionPlanningService

RecommendationLifecycleService

RecommendationFeedbackService

RecommendationSearchService
```

RecommendationService coordinates the recommendation workflow.

---

## Repositories

```text id="recommendbe04"
RecommendationRepository

RecommendationActionRepository

RecommendationFeedbackRepository

RecommendationHistoryRepository
```

Repositories provide persistence only.

---

## Validators

```text id="recommendbe05"
RecommendationValidator

RecommendationLifecycleValidator

RecommendationFeedbackValidator
```

---

## Policies

```text id="recommendbe06"
RecommendationPolicy
```

Responsible for authorization.

---

# Service Responsibilities

---

## RecommendationService

Responsible for:

```text id="recommendbe07"
Retrieve Recommendation

Create Recommendation

Update Recommendation

Search Recommendation

Archive Recommendation
```

Acts as the orchestration service.

---

## RecommendationGenerationService

Responsible for:

```text id="recommendbe08"
Generate Recommendation

Select Recommendation Template

Generate Summary

Estimate Impact

Assign Confidence
```

The generation algorithm should remain isolated.

---

## RecommendationRankingService

Responsible for:

```text id="recommendbe09"
Priority Calculation

Business Impact Ranking

Execution Order

Recommendation Sorting
```

---

## ActionPlanningService

Responsible for:

```text id="recommendbe10"
Generate Action List

Order Actions

Estimate Execution Time

Determine Automation Capability
```

Action planning should be deterministic.

---

## RecommendationLifecycleService

Responsible for:

```text id="recommendbe11"
Accept

Start

Complete

Dismiss

Expire
```

Only this service may change Recommendation status.

---

## RecommendationFeedbackService

Responsible for:

```text id="recommendbe12"
Store Feedback

Validate Rating

Aggregate Feedback

Prepare Learning Data
```

Feedback should improve future recommendations without modifying historical records.

---

## RecommendationSearchService

Responsible for:

```text id="recommendbe13"
Filtering

Sorting

Pagination

Keyword Search
```

---

# Transaction Boundaries

## Generate Recommendation

Transaction:

```text id="recommendbe14"
Validate Signal

↓

Generate Recommendation

↓

Plan Actions

↓

Calculate Priority

↓

Persist Recommendation

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

## Accept Recommendation

Transaction:

```text id="recommendbe15"
Validate Status

↓

Update Lifecycle

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

## Submit Feedback

Transaction:

```text id="recommendbe16"
Validate Feedback

↓

Persist Feedback

↓

Update Learning Queue

↓

Audit Record

↓

Commit
```

Feedback processing should remain asynchronous after persistence.

---

# Repository Interfaces

## RecommendationRepository

```text id="recommendbe17"
findById()

findByWorkspace()

findBySignal()

search()

create()

update()

archive()
```

---

## RecommendationActionRepository

```text id="recommendbe18"
findByRecommendation()

create()

update()

delete()
```

---

## RecommendationFeedbackRepository

```text id="recommendbe19"
create()

findByRecommendation()

findByUser()

aggregate()
```

---

## RecommendationHistoryRepository

```text id="recommendbe20"
create()

findTimeline()

findHistory()
```

---

# Recommendation Processing Flow

Recommendation pipeline:

```text id="recommendbe21"
Signal

↓

Recommendation Generation

↓

Priority Calculation

↓

Action Planning

↓

Persistence

↓

Notification Trigger

↓

Audit Record
```

Recommendation generation should remain deterministic for identical inputs whenever possible.

---

# Event Flow

Domain events:

```text id="recommendbe22"
RecommendationCreated

RecommendationAccepted

RecommendationStarted

RecommendationCompleted

RecommendationDismissed

RecommendationExpired

FeedbackSubmitted
```

Events may trigger notification workflows.

---

# Worker Jobs

Possible background jobs:

```text id="recommendbe23"
Recommendation Generation

Recommendation Recalculation

Feedback Aggregation

Recommendation Expiration

Learning Dataset Export

Batch Recommendation Update
```

Workers execute asynchronously.

---

# Notification Integration

Recommendation lifecycle may trigger:

```text id="recommendbe24"
Recommendation Created

↓

Notification Queue

↓

Notification Backend
```

Recommendation services should never send notifications directly.

---

# DTO Strategy

## Request DTOs

```text id="recommendbe25"
AcceptRecommendationRequest

CompleteRecommendationRequest

DismissRecommendationRequest

RecommendationFeedbackRequest
```

---

## Response DTOs

```text id="recommendbe26"
RecommendationSummaryDTO

RecommendationDetailDTO

RecommendationActionDTO

RecommendationTimelineDTO

RecommendationFeedbackDTO
```

DTOs isolate API contracts from persistence models.

---

# Error Handling

Domain exceptions:

```text id="recommendbe27"
RecommendationNotFoundException

InvalidRecommendationTransitionException

RecommendationAlreadyCompletedException

RecommendationAlreadyDismissedException

InvalidFeedbackException
```

Exceptions should be translated by global exception middleware.

---

# Audit Strategy

Audit records should be generated for:

```text id="recommendbe28"
Recommendation Created

Recommendation Viewed

Recommendation Accepted

Recommendation Started

Recommendation Completed

Recommendation Dismissed

Feedback Submitted
```

Audit logging belongs to the Service layer.

---

# Performance Strategy

Frequently accessed objects:

```text id="recommendbe29"
Pending Recommendations

Top Priority Recommendations

Recommendation Timeline

Recommendation Actions

Feedback Summary
```

Recommended optimizations:

* Priority indexes
* Action lazy loading
* Cached recommendation summaries
* Background ranking recalculation

---

# Security Rules

Recommendation services must enforce:

```text id="recommendbe30"
Workspace Isolation

Role Authorization

Lifecycle Validation

Audit Logging

Immutable History
```

Recommendations must never bypass lifecycle validation.

---

# Testing Strategy

Unit Tests:

```text id="recommendbe31"
RecommendationService

RecommendationGenerationService

RecommendationRankingService

ActionPlanningService

RecommendationLifecycleService

RecommendationFeedbackService
```

Integration Tests:

```text id="recommendbe32"
Generate Recommendation

Accept Recommendation

Complete Recommendation

Dismiss Recommendation

Submit Feedback
```

---

# Dependency Graph

```text id="recommendbe33"
RecommendationController

↓

RecommendationService

↓

RecommendationRepository

↓

Database
```

Supporting services:

```text id="recommendbe34"
RecommendationService

↓

RecommendationGenerationService

↓

ActionPlanningService

↓

NotificationService

↓

AuditService

↓

JobService
```

Dependencies should remain one-directional and free of cyclic references.

---

# Codex Generation Targets

This specification should allow Codex to generate:

```text id="recommendbe35"
RecommendationController

RecommendationLifecycleController

RecommendationActionController

RecommendationFeedbackController

RecommendationService

RecommendationGenerationService

RecommendationRankingService

ActionPlanningService

RecommendationLifecycleService

RecommendationRepository

Validators

Policies

DTOs

Worker Jobs

Domain Events

Unit Tests
```

---

# Decision Execution Pipeline

The Recommendation Backend represents the execution layer of the Decision Engine.

```text id="recommendbe36"
Evidence

↓

Signal

↓

Recommendation Generation

↓

Action Planning

↓

Recommendation Persistence

↓

Notification Queue

↓

User / AI Agent

↓

Feedback
```

Every Recommendation should remain explainable, executable, and traceable throughout its lifecycle.

---

# Final Rule

The Recommendation Backend transforms business Signals into executable decisions.

It generates recommendations, plans actions, manages execution lifecycles, and collects feedback while remaining independent of delivery and presentation concerns.

The module must provide deterministic decision generation, transactional consistency, complete auditability, and clean integration with downstream Notification services, fully aligned with the PHP-first modular monolith architecture.
