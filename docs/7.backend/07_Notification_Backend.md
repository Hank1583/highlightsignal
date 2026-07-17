# 07_Notification_Backend.md

# Notification Backend

Version: v1.0

Status: Draft

Layer: Backend Specification

Depends On:

* 01_Backend_Overview
* 07_Notification_Database
* 07_Notification_API
* 04_Signal_Backend
* 06_Recommendation_Backend
* Architecture v1.0 Frozen

---

# Purpose

> V1 Alignment Patch: Notification handlers subscribe to internal Domain Events. Notification remains a delivery resource and does not become part of the business decision pipeline.

The Notification Backend implements the Decision Delivery Layer of Highlight Signal.

Notifications deliver important Signals and Recommendations to the appropriate recipients through configurable communication channels.

The Notification Backend manages notification lifecycle, delivery routing, retry handling, acknowledgement, and user preferences while remaining independent of the underlying communication providers.

---

# Domain Responsibility

The Notification Backend is responsible for:

* Notification creation
* Recipient resolution
* Delivery routing
* Channel selection
* Retry handling
* User acknowledgement
* Notification preferences
* Delivery analytics

The Notification Backend is **not** responsible for:

* Signal generation
* Recommendation generation
* Email provider implementation
* Dashboard rendering

Actual message delivery is delegated to provider adapters.

---

# Module Structure

```text id="notifybe01"
Modules/
└── Notification/
    ├── Controllers/
    ├── Services/
    ├── Repositories/
    ├── DTO/
    ├── Validators/
    ├── Policies/
    ├── Events/
    ├── Jobs/
    └── Providers/
```

---

# Core Components

## Controllers

```text id="notifybe02"
NotificationController

NotificationPreferenceController

NotificationDeliveryController
```

Controllers:

* Validate requests
* Check permissions
* Invoke services
* Return DTOs

No delivery logic belongs in controllers.

---

## Services

```text id="notifybe03"
NotificationService

NotificationDeliveryService

NotificationPreferenceService

NotificationRetryService

NotificationRoutingService

NotificationAnalyticsService
```

NotificationService coordinates the complete notification lifecycle.

---

## Repositories

```text id="notifybe04"
NotificationRepository

NotificationPreferenceRepository

NotificationDeliveryRepository
```

Repositories perform persistence only.

---

## Validators

```text id="notifybe05"
NotificationValidator

NotificationPreferenceValidator

RetryValidator
```

---

## Policies

```text id="notifybe06"
NotificationPolicy
```

Responsible for notification authorization.

---

# Provider Adapters

Delivery providers should implement a common interface.

Recommended adapters:

```text id="notifybe07"
EmailProvider

SlackProvider

DiscordProvider

WebhookProvider

PushProvider

SMSProvider
```

All providers should implement:

```text id="notifybe08"
send()

validate()

healthCheck()
```

Domain services must never call provider SDKs directly.

---

# Service Responsibilities

---

## NotificationService

Responsible for:

```text id="notifybe09"
Create Notification

Retrieve Notification

Search Notification

Dismiss Notification

Archive Notification
```

Acts as the orchestration service.

---

## NotificationDeliveryService

Responsible for:

```text id="notifybe10"
Resolve Recipient

Resolve Channel

Deliver Notification

Store Delivery Result

Create Delivery History
```

Provider selection occurs here.

---

## NotificationPreferenceService

Responsible for:

```text id="notifybe11"
Load Preferences

Validate Preferences

Apply Quiet Hours

Apply Severity Threshold

Determine Delivery Eligibility
```

---

## NotificationRetryService

Responsible for:

```text id="notifybe12"
Retry Failed Delivery

Retry Scheduling

Retry Policy

Retry Limit
```

Recommended strategy:

```text id="notifybe13"
Exponential Backoff
```

---

## NotificationRoutingService

Responsible for:

```text id="notifybe14"
Channel Selection

Recipient Resolution

Fallback Channel

Delivery Priority
```

---

## NotificationAnalyticsService

Responsible for:

```text id="notifybe15"
Delivery Rate

Failure Rate

Acknowledgement Rate

Delivery Latency
```

---

# Transaction Boundaries

## Create Notification

Transaction:

```text id="notifybe16"
Validate Request

↓

Create Notification

↓

Determine Recipient

↓

Queue Delivery Job

↓

Audit Record

↓

Commit
```

Delivery should always occur asynchronously.

---

## Acknowledge Notification

Transaction:

```text id="notifybe17"
Validate Ownership

↓

Update Status

↓

Write History

↓

Audit Record

↓

Commit
```

---

## Retry Notification

Transaction:

```text id="notifybe18"
Validate Retry

↓

Queue Retry Job

↓

Audit Record

↓

Commit
```

Retry execution occurs in workers.

---

# Repository Interfaces

## NotificationRepository

```text id="notifybe19"
findById()

findByWorkspace()

findByRecipient()

search()

create()

update()

archive()
```

---

## NotificationPreferenceRepository

```text id="notifybe20"
findByUser()

create()

update()
```

---

## NotificationDeliveryRepository

```text id="notifybe21"
createAttempt()

findAttempts()

findFailed()

findPending()
```

---

# Notification Processing Flow

Delivery pipeline:

```text id="notifybe22"
Signal

↓

Recommendation

↓

Create Notification

↓

Preference Evaluation

↓

Channel Routing

↓

Queue Delivery

↓

Worker

↓

Provider

↓

Delivery Result

↓

Audit Record
```

The Notification Backend should remain provider-independent.

---

# Event Flow

Domain events:

```text id="notifybe23"
NotificationCreated

NotificationQueued

NotificationDelivered

NotificationFailed

NotificationRetried

NotificationAcknowledged

NotificationDismissed
```

Events may trigger analytics updates.

---

# Worker Jobs

Possible background jobs:

```text id="notifybe24"
Email Delivery

Slack Delivery

Discord Delivery

Webhook Delivery

Retry Failed Delivery

Notification Cleanup

Daily Digest Generation
```

Workers execute asynchronously through the shared job queue.

---

# DTO Strategy

## Request DTOs

```text id="notifybe25"
AcknowledgeNotificationRequest

DismissNotificationRequest

RetryNotificationRequest

UpdatePreferenceRequest
```

---

## Response DTOs

```text id="notifybe26"
NotificationSummaryDTO

NotificationDetailDTO

DeliveryAttemptDTO

NotificationPreferenceDTO
```

DTOs isolate persistence models from API contracts.

---

# Error Handling

Domain exceptions:

```text id="notifybe27"
NotificationNotFoundException

NotificationAlreadyAcknowledgedException

InvalidDeliveryChannelException

RetryLimitExceededException

PreferenceValidationException

ProviderUnavailableException
```

Exceptions should be translated through global middleware.

---

# Audit Strategy

Audit records should be generated for:

```text id="notifybe28"
Notification Created

Notification Queued

Notification Delivered

Notification Failed

Notification Retried

Notification Acknowledged

Notification Dismissed

Notification Preference Updated
```

Audit logging belongs to the Service layer.

---

# Performance Strategy

Frequently accessed objects:

```text id="notifybe29"
Unread Notifications

Pending Deliveries

Failed Deliveries

User Preferences

Delivery History
```

Recommended optimizations:

* Recipient indexes
* Status indexes
* Background batching
* Provider connection reuse

---

# Security Rules

Notification services must enforce:

```text id="notifybe30"
Workspace Isolation

Recipient Ownership

Role Authorization

Audit Logging

Provider Isolation
```

Users must never access notifications belonging to another recipient.

---

# Testing Strategy

Unit Tests:

```text id="notifybe31"
NotificationService

NotificationDeliveryService

NotificationPreferenceService

NotificationRetryService

NotificationRoutingService
```

Integration Tests:

```text id="notifybe32"
Create Notification

Deliver Email

Retry Delivery

Acknowledge Notification

Update Preferences
```

Mock provider adapters should be used during testing.

---

# Dependency Graph

```text id="notifybe33"
NotificationController

↓

NotificationService

↓

NotificationRepository

↓

Database
```

Supporting services:

```text id="notifybe34"
NotificationService

↓

NotificationRoutingService

↓

NotificationDeliveryService

↓

AuditService

↓

JobService

↓

ProviderAdapter
```

Dependencies should remain one-directional.

---

# Codex Generation Targets

This specification should allow Codex to generate:

```text id="notifybe35"
NotificationController

NotificationPreferenceController

NotificationDeliveryController

NotificationService

NotificationDeliveryService

NotificationRoutingService

NotificationRetryService

NotificationRepository

Provider Adapters

Validators

Policies

DTOs

Worker Jobs

Domain Events

Unit Tests
```

---

# Delivery Pipeline

The Notification Backend represents the delivery layer of the Decision Engine.

```text id="notifybe36"
Signal

↓

Recommendation

↓

Notification Created

↓

Preference Evaluation

↓

Routing

↓

Provider Queue

↓

Delivery Worker

↓

Recipient

↓

Acknowledgement
```

Every notification should remain reliable, traceable, and independently auditable.

---

# Final Rule

The Notification Backend delivers business decisions to users and systems.

It manages routing, delivery, retries, acknowledgement, and preferences while remaining completely independent of provider-specific implementations.

The module must provide reliable asynchronous delivery, complete auditability, configurable routing, and clean provider abstraction, fully aligned with the PHP-first modular monolith architecture.
