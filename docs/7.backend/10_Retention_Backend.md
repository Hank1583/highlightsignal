# 10_Retention_Backend.md

# Data Retention Backend

Version: v1.0

Status: Draft

Layer: Backend Specification

Depends On:

* 01_Backend_Overview
* 10_Data_Retention_Database
* 10_Retention_API
* 09_Audit_Log_Backend
* Architecture v1.0 Frozen

---

# Purpose

> V1 Alignment Patch: Retention may archive or eventually delete eligible records according to policy. Audit immutability means records cannot be edited during retention; it does not override legal hold, compliance freeze, or an approved lifecycle policy.

The Data Retention Backend implements the Data Lifecycle Management Layer of Highlight Signal.

It governs how long business data is retained, when it is archived, when it may be restored, and when it is permanently deleted according to configurable retention policies.

The module ensures storage optimization, regulatory compliance, and long-term governance while remaining independent of business domain logic.

---

# Domain Responsibility

The Data Retention Backend is responsible for:

* Retention policy management
* Archive execution
* Restore execution
* Deletion scheduling
* Lifecycle monitoring
* Retention reporting
* Storage optimization

The Data Retention Backend is **not** responsible for:

* Business logic
* Signal generation
* Recommendation generation
* Authentication
* Audit record persistence

Audit events are generated through the Audit Backend.

---

# Module Structure

```text id="retainbe01"
Modules/
└── Retention/
    ├── Controllers/
    ├── Services/
    ├── Repositories/
    ├── DTO/
    ├── Validators/
    ├── Policies/
    ├── Events/
    ├── Jobs/
    └── Strategies/
```

---

# Core Components

## Controllers

```text id="retainbe02"
RetentionPolicyController

ArchiveController

RestoreController

DeletionController

RetentionHistoryController
```

Controllers:

* Validate requests
* Check permissions
* Call services
* Return DTOs

Controllers should never execute archive or deletion logic directly.

---

## Services

```text id="retainbe03"
RetentionPolicyService

ArchiveService

RestoreService

DeletionService

RetentionHistoryService

StorageOptimizationService
```

ArchiveService coordinates the complete archive lifecycle.

---

## Repositories

```text id="retainbe04"
RetentionPolicyRepository

ArchiveRepository

DeletionRepository

RetentionHistoryRepository
```

Repositories perform persistence only.

---

## Validators

```text id="retainbe05"
RetentionPolicyValidator

ArchiveValidator

RestoreValidator

DeletionValidator
```

---

## Policies

```text id="retainbe06"
RetentionPolicy

ArchivePolicy

DeletionPolicy
```

Responsible for authorization.

---

# Retention Strategies

Retention behavior should be implemented through interchangeable strategies.

Examples:

```text id="retainbe07"
ArchiveStrategy

SoftDeleteStrategy

HardDeleteStrategy

LegalHoldStrategy

ComplianceFreezeStrategy
```

Each strategy should implement:

```text id="retainbe08"
validate()

execute()

rollback()
```

This allows future policy expansion without modifying business modules.

---

# Service Responsibilities

---

## RetentionPolicyService

Responsible for:

```text id="retainbe09"
Create Policy

Update Policy

Validate Policy

Apply Policy

Evaluate Policy
```

---

## ArchiveService

Responsible for:

```text id="retainbe10"
Archive Entity

Queue Archive Job

Restore Metadata

Track Archive Status
```

---

## RestoreService

Responsible for:

```text id="retainbe11"
Restore Entity

Validate Recovery Window

Rebuild References

Update Lifecycle
```

---

## DeletionService

Responsible for:

```text id="retainbe12"
Schedule Deletion

Validate Policy

Permanent Delete

Cancel Scheduled Delete
```

Hard deletion should execute only after all policy checks pass.

---

## RetentionHistoryService

Responsible for:

```text id="retainbe13"
Lifecycle Timeline

Retention History

Archive History

Deletion History
```

---

## StorageOptimizationService

Responsible for:

```text id="retainbe14"
Storage Analysis

Expired Data Detection

Archive Recommendation

Cleanup Recommendation
```

Recommendations should never automatically delete data.

---

# Transaction Boundaries

## Archive Entity

Transaction:

```text id="retainbe15"
Validate Policy

↓

Archive Entity

↓

Persist Archive Record

↓

Audit Record

↓

Commit
```

---

## Restore Entity

Transaction:

```text id="retainbe16"
Validate Recovery Window

↓

Restore Entity

↓

Restore Relationships

↓

Audit Record

↓

Commit
```

---

## Permanent Deletion

Transaction:

```text id="retainbe17"
Validate Policy

↓

Validate Legal Hold

↓

Delete Entity

↓

Create History

↓

Audit Record

↓

Commit
```

Deletion should execute through asynchronous workers.

---

# Repository Interfaces

## RetentionPolicyRepository

```text id="retainbe18"
find()

create()

update()

delete()
```

---

## ArchiveRepository

```text id="retainbe19"
create()

findArchived()

restore()

search()
```

---

## DeletionRepository

```text id="retainbe20"
schedule()

cancel()

findPending()

complete()
```

---

## RetentionHistoryRepository

```text id="retainbe21"
create()

findTimeline()

findEntityHistory()
```

---

# Lifecycle Processing Flow

Lifecycle pipeline:

```text id="retainbe22"
Business Entity

↓

Retention Policy Evaluation

↓

Archive

↓

Recovery Window

↓

Deletion Schedule

↓

Worker

↓

Permanent Deletion

↓

Audit Record
```

Business services should never delete records directly.

---

# Event Flow

Domain events:

```text id="retainbe23"
RetentionPolicyUpdated

EntityArchived

EntityRestored

DeletionScheduled

DeletionCancelled

EntityDeleted
```

Events may trigger storage analytics.

---

# Worker Jobs

Possible background jobs:

```text id="retainbe24"
Archive Expired Data

Restore Processing

Deletion Worker

Retention Evaluation

Storage Optimization Scan

Retention Report Generation
```

Workers should execute lifecycle transitions asynchronously.

---

# Audit Integration

Every lifecycle operation should generate an audit event.

Examples:

```text id="retainbe25"
Archive Started

Archive Completed

Restore Completed

Deletion Scheduled

Deletion Cancelled

Entity Permanently Deleted
```

Retention services should call AuditService instead of writing audit records directly.

---

# DTO Strategy

## Request DTOs

```text id="retainbe26"
UpdateRetentionPolicyRequest

ArchiveRequest

RestoreRequest

DeletionRequest
```

---

## Response DTOs

```text id="retainbe27"
RetentionPolicyDTO

ArchiveJobDTO

DeletionJobDTO

RetentionHistoryDTO
```

DTOs isolate persistence models from API contracts.

---

# Error Handling

Domain exceptions:

```text id="retainbe28"
RetentionPolicyException

RecoveryWindowExpiredException

EntityNotArchivedException

LegalHoldActiveException

ComplianceFreezeActiveException

DeletionAlreadyScheduledException
```

Exceptions should be translated through global middleware.

---

# Performance Strategy

Frequently accessed objects:

```text id="retainbe29"
Retention Policies

Archive Queue

Deletion Queue

Lifecycle History
```

Recommended optimizations:

* Background policy evaluation
* Batch archive execution
* Batch deletion execution
* Policy caching
* Historical partitioning

---

# Security Rules

Retention services must enforce:

```text id="retainbe30"
Workspace Isolation

Role Authorization

Policy Validation

Legal Hold Protection

Audit Logging
```

Permanent deletion should always require explicit authorization.

---

# Testing Strategy

Unit Tests:

```text id="retainbe31"
RetentionPolicyService

ArchiveService

RestoreService

DeletionService

StorageOptimizationService
```

Integration Tests:

```text id="retainbe32"
Archive Entity

Restore Entity

Schedule Deletion

Cancel Deletion

Policy Evaluation
```

Deletion tests should verify policy enforcement before execution.

---

# Dependency Graph

```text id="retainbe33"
RetentionController

↓

RetentionPolicyService

↓

RetentionRepository

↓

Database
```

Supporting services:

```text id="retainbe34"
RetentionPolicyService

↓

ArchiveService

↓

DeletionService

↓

AuditService

↓

JobService
```

Dependencies should remain one-directional.

---

# Codex Generation Targets

This specification should allow Codex to generate:

```text id="retainbe35"
RetentionPolicyController

ArchiveController

RestoreController

DeletionController

RetentionHistoryController

RetentionPolicyService

ArchiveService

RestoreService

DeletionService

StorageOptimizationService

Repositories

Strategies

Validators

Policies

DTOs

Worker Jobs

Unit Tests
```

---

# Data Lifecycle Pipeline

The Retention Backend manages the complete lifecycle of persistent data.

```text id="retainbe36"
Business Entity

↓

Retention Policy

↓

Archive

↓

Recovery Window

↓

Deletion Queue

↓

Deletion Worker

↓

Permanent Removal

↓

Audit Log
```

Lifecycle transitions should always be policy-driven and independently auditable.

---

# Enterprise Governance

The Retention Backend supports future enterprise governance capabilities.

```text id="retainbe37"
Legal Hold

Compliance Freeze

Regional Policies

Tenant Policies

Export Before Deletion

Long-Term Archive

Storage Optimization
```

These capabilities extend lifecycle management without affecting business domains.

---

# Final Rule

The Data Retention Backend governs the lifecycle of persistent information within Highlight Signal.

Business modules create and update operational data.

The Retention Backend determines how long that data exists, when it is archived, when it may be restored, and when it is permanently removed.

The module must provide policy-driven lifecycle management, asynchronous execution, enterprise-grade governance, and complete auditability while remaining fully compatible with the PHP-first modular monolith architecture.
