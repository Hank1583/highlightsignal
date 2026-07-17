# 09_Audit_Log_Backend.md

# Audit Log Backend

Version: v1.0

Status: Draft

Layer: Backend Specification

Depends On:

* 01_Backend_Overview
* 09_Audit_Log_Database
* 09_Audit_Log_API
* Architecture v1.0 Frozen

---

# Purpose

> V1 Alignment Patch: Audit logging is a cross-cutting Service invoked for important mutations across all modules. Public Audit APIs remain read-only; retention operations are separately governed.

The Audit Log Backend implements the Operational History Layer of Highlight Signal.

Every meaningful business operation should produce an immutable Audit Event.

The Audit Log Backend provides complete traceability, investigation capability, compliance support, operational debugging, and AI explainability.

Audit Logs are append-only records.

They must never be modified after creation.

---

# Domain Responsibility

The Audit Log Backend is responsible for:

* Audit event creation
* Audit persistence
* Timeline reconstruction
* Entity history
* User activity history
* System event recording
* Compliance export

The Audit Log Backend is **not** responsible for:

* Business logic
* Authentication
* Authorization
* Notification delivery
* Data retention policy

Every other backend module depends on the Audit Log Backend.

---

# Module Structure

```text id="auditbe01"
Modules/
└── AuditLog/
    ├── Controllers/
    ├── Services/
    ├── Repositories/
    ├── DTO/
    ├── Validators/
    ├── Policies/
    ├── Events/
    ├── Jobs/
    └── Exporters/
```

---

# Core Components

## Controllers

```text id="auditbe02"
AuditLogController

TimelineController

SystemEventController

ComplianceExportController
```

Controllers:

* Validate requests
* Check permissions
* Invoke services
* Return DTOs

Controllers should never create audit records directly.

---

## Services

```text id="auditbe03"
AuditService

TimelineService

EntityHistoryService

UserActivityService

ComplianceExportService

SystemEventService
```

AuditService is the central entry point.

All business modules should call AuditService.

---

## Repositories

```text id="auditbe04"
AuditRepository

SystemEventRepository

ComplianceExportRepository
```

Repositories perform persistence only.

---

## Validators

```text id="auditbe05"
AuditSearchValidator

ExportValidator

TimelineValidator
```

---

## Policies

```text id="auditbe06"
AuditPolicy
```

Responsible for authorization.

---

# Exporters

Export implementations should be isolated.

Examples:

```text id="auditbe07"
PDFExporter

CSVExporter

JSONExporter
```

All exporters implement:

```text id="auditbe08"
export()

validate()

generate()
```

---

# Service Responsibilities

---

## AuditService

Responsible for:

```text id="auditbe09"
Create Audit Event

Store Metadata

Store Actor

Store Entity

Store Context
```

Every backend module should depend on this service.

---

## TimelineService

Responsible for:

```text id="auditbe10"
Workspace Timeline

Chronological History

Timeline Pagination

Timeline Filtering
```

---

## EntityHistoryService

Responsible for:

```text id="auditbe11"
Entity History

Relationship History

Historical Lookup

State Reconstruction
```

---

## UserActivityService

Responsible for:

```text id="auditbe12"
User Activity

Agent Activity

Service Activity

Actor Timeline
```

---

## ComplianceExportService

Responsible for:

```text id="auditbe13"
Generate Report

Prepare Export

Queue Export Job

Download Package
```

Large exports should execute asynchronously.

---

## SystemEventService

Responsible for:

```text id="auditbe14"
Record Worker Events

Record Infrastructure Events

Record Internal Errors

Operational Monitoring
```

---

# Transaction Strategy

Audit records should be created inside the same transaction as the originating business operation.

Example:

```text id="auditbe15"
Resolve Signal

↓

Update Signal

↓

Create Audit Event

↓

Commit
```

If the transaction rolls back, the audit event should also roll back.

---

# Repository Interfaces

## AuditRepository

```text id="auditbe16"
create()

findById()

search()

findTimeline()

findEntityHistory()

findUserHistory()
```

---

## SystemEventRepository

```text id="auditbe17"
create()

search()

findRecent()
```

---

## ComplianceExportRepository

```text id="auditbe18"
create()

update()

findById()

findPending()
```

---

# Audit Event Flow

Standard flow:

```text id="auditbe19"
Business Service

↓

AuditService

↓

AuditRepository

↓

Database
```

Audit creation should require only a single service call.

Example:

```php
AuditService::record(...)
```

---

# Standard Audit Payload

Recommended structure:

```text id="auditbe20"
Actor

Workspace

Entity

Entity ID

Action

Result

Metadata

IP Address

User Agent

Timestamp
```

Additional metadata should remain extensible.

---

# Event Flow

Typical events:

```text id="auditbe21"
Workspace Created

User Logged In

Signal Created

Signal Resolved

Recommendation Completed

Notification Delivered

Widget Updated

Retention Executed

Worker Failed

Integration Synced
```

Every business module should emit standardized audit events.

---

# Worker Jobs

Possible background jobs:

```text id="auditbe22"
Generate Compliance Report

Compress Historical Logs

Archive Old Logs

Export Audit Package

Generate Investigation Timeline
```

Workers should never modify existing audit records.

---

# Compliance Export Flow

```text id="auditbe23"
Export Request

↓

Validation

↓

Queue Export Job

↓

Worker

↓

Generate File

↓

Store Result

↓

Audit Record
```

Large exports should never block HTTP requests.

---

# DTO Strategy

## Request DTOs

```text id="auditbe24"
SearchAuditRequest

ExportAuditRequest

TimelineRequest
```

---

## Response DTOs

```text id="auditbe25"
AuditEventDTO

TimelineDTO

EntityHistoryDTO

SystemEventDTO

ExportDTO
```

DTOs isolate persistence from API responses.

---

# Error Handling

Domain exceptions:

```text id="auditbe26"
AuditNotFoundException

ExportAlreadyRunningException

ExportLimitExceededException

TimelineNotFoundException

ComplianceExportException
```

Exceptions should be translated by global middleware.

---

# Audit Strategy

Audit access should itself be audited.

Generated events:

```text id="auditbe27"
Audit Viewed

Audit Searched

Timeline Retrieved

Compliance Export Requested

Compliance Export Completed

System Event Viewed
```

The Audit module audits itself where appropriate.

---

# Performance Strategy

Frequently accessed objects:

```text id="auditbe28"
Recent Audit Logs

Entity Timeline

User Activity

Compliance Summary
```

Recommended optimizations:

* Time-based indexes
* Entity indexes
* Actor indexes
* Background export generation
* Archive historical records

---

# Security Rules

Audit services must enforce:

```text id="auditbe29"
Workspace Isolation

Read-Only Access

Immutable Records

Role Authorization

Audit Access Logging
```

Audit records must never be updated or deleted through business services.

---

# Testing Strategy

Unit Tests:

```text id="auditbe30"
AuditService

TimelineService

EntityHistoryService

ComplianceExportService

SystemEventService
```

Integration Tests:

```text id="auditbe31"
Create Audit Event

Entity Timeline

User Activity

Compliance Export

System Event Recording
```

Historical reconstruction should be deterministic.

---

# Dependency Graph

```text id="auditbe32"
AuditController

↓

AuditService

↓

AuditRepository

↓

Database
```

Supporting services:

```text id="auditbe33"
All Business Services

↓

AuditService

↓

AuditRepository

↓

Database
```

The Audit module should not depend on business modules.

Business modules depend on Audit.

---

# Codex Generation Targets

This specification should allow Codex to generate:

```text id="auditbe34"
AuditLogController

TimelineController

SystemEventController

ComplianceExportController

AuditService

TimelineService

EntityHistoryService

ComplianceExportService

SystemEventService

Repositories

Exporters

Validators

Policies

DTOs

Worker Jobs

Unit Tests
```

---

# Investigation Pipeline

The Audit Backend reconstructs operational history.

```text id="auditbe35"
Business Operation

↓

Audit Event

↓

Audit Repository

↓

Timeline

↓

Compliance Report

↓

Investigation
```

Every operational change should be traceable through immutable audit records.

---

# Enterprise Compliance

The Audit Backend is designed to support enterprise governance.

```text id="auditbe36"
Append-Only Records

Immutable History

Full Traceability

Compliance Reporting

Operational Investigation

AI Explainability
```

These principles apply across every business domain.

---

# Final Rule

The Audit Log Backend is the operational memory of Highlight Signal.

It records every significant business action, preserves immutable historical records, and enables complete investigation, compliance reporting, and AI explainability.

Every backend module should integrate with the AuditService, ensuring that every important operation is traceable, reproducible, and independently verifiable while remaining fully compatible with the PHP-first modular monolith architecture.
