# 01_Backend_Overview.md

# Backend Overview

Version: v1.0

Status: Draft

Layer: Backend Specification

Depends On:

* 5.database
* 6.api
* Architecture v1.0 Frozen

---

# Purpose

> V1 Alignment Patch: The V1 backend is a PHP Modular Monolith backed by MySQL. Python, Cloud Run, microservices, and managed queues are Future implementations. Human Review produces the formal Decision; autonomous decision and autonomous learning are outside V1.

This document defines the backend implementation foundation of Highlight Signal.

The Backend layer converts Database Specification and API Specification into executable server-side modules.

The V1 backend target is:

```text
PHP + Cloudflare
```

The backend should be designed as a PHP-first modular monolith while remaining ready for future service extraction.

---

# Backend Position

The Backend layer defines:

* Service classes
* Repository classes
* Domain logic
* Permission checks
* DTO mapping
* Transaction boundaries
* Worker jobs
* Event flow
* Audit events
* Error handling

The Backend layer does **not** redefine:

* Product concepts
* Database schema
* API contract
* Architecture principles

---

# V1 Implementation Target

```text
Primary Backend: PHP

Frontend / Edge: Cloudflare

Deployment Style: Low-cost first

Architecture Style: Modular Monolith

Future Extension: Optional Python / Java / Cloud Run services
```

---

# V1 System Flow

```text
Next.js Frontend

↓

Cloudflare Workers / Pages

↓

PHP API Backend

↓

Database

↓

PHP Worker / Cron
```

---

# Backend Architecture Style

## PHP-First Modular Monolith

V1 should use a modular monolith.

Each domain has its own:

```text
Controller

Service

Repository

DTO

Validator

Policy

Event Handler
```

Recommended module structure:

```text
backend/
  modules/
    Workspace/
    UserAccount/
    Signal/
    Evidence/
    Recommendation/
    Notification/
    Widget/
    AuditLog/
    Retention/
```

---

# Why Modular Monolith

The modular monolith is suitable for V1 because it provides:

* Lower hosting cost
* Faster development
* Simpler deployment
* Easier debugging
* Shared database transactions
* Clear domain boundaries
* Future extraction path

Microservices are not required for V1.

---

# Cloudflare Responsibility

Cloudflare is responsible for:

* Frontend hosting
* Edge routing
* SSL
* CDN
* Cache
* Basic protection
* Custom domain
* Future edge functions

Cloudflare is **not** responsible for core business logic.

---

# PHP Backend Responsibility

PHP backend is responsible for:

* API request handling
* Authentication
* Authorization
* Domain service execution
* Database access
* Worker job creation
* Audit log creation
* Integration calls
* OpenAI API calls
* Notification dispatch
* Report preparation

---

# Background Job Strategy

V1 background jobs should be database-driven.

Recommended pattern:

```text
API creates job

↓

jobs table stores queued work

↓

PHP Worker / Cron claims job

↓

Worker executes task

↓

Worker writes result

↓

Audit log records execution
```

This avoids requiring Cloud Run, Redis, RabbitMQ, or external queue infrastructure in V1.

---

# Worker Types

V1 worker jobs may include:

```text
Signal Detection Job

Evidence Collection Job

Recommendation Generation Job

Notification Delivery Job

Widget Cache Refresh Job

Report Generation Job

Retention Cleanup Job

Integration Sync Job
```

---

# Future Service Extraction

Some services may later be extracted to Python, Java, or Cloud Run.

Extraction candidates:

```text
AI Analysis Worker

Large Crawling Worker

Security Scanner

PDF Generator

Vector Search Service

Heavy Report Service

Large Batch Processor
```

Extraction should happen only when PHP becomes insufficient or cost-effective scaling requires it.

---

# Standard Backend Flow

Every API request should follow this flow:

```text
Request

↓

Controller

↓

Authentication Middleware

↓

Authorization Policy

↓

Request Validation

↓

Service

↓

Repository

↓

Database

↓

DTO Response

↓

Audit Event
```

---

# Service Layer Rules

Services contain business logic.

Controllers should remain thin.

A controller should only:

* Parse request
* Call validator
* Check permission
* Call service
* Return response

A service should:

* Enforce business rules
* Manage transactions
* Call repositories
* Emit audit events
* Create worker jobs when needed

---

# Repository Layer Rules

Repositories are responsible for database access.

Repositories should not contain business decision logic.

Repositories should provide:

```text
findById

findByWorkspace

create

update

softDelete

search

paginate
```

---

# Transaction Boundary

Transactions should be owned by the Service layer.

Example:

```text
Create Workspace

↓

Create workspace record

↓

Create owner membership

↓

Create default settings

↓

Create default dashboard

↓

Create audit log

↓

Commit
```

If any step fails, the transaction should roll back.

---

# Permission Strategy

Permission checks should be centralized.

Recommended components:

```text
AuthMiddleware

WorkspacePolicy

RolePolicy

ResourcePolicy
```

Every workspace-scoped request must verify:

```text
User is authenticated

↓

User belongs to workspace

↓

User role allows action
```

---

# DTO Strategy

Use DTOs to separate API response shape from database records.

Recommended DTO types:

```text
Request DTO

Response DTO

List DTO

Detail DTO

Internal DTO

Job DTO
```

Database entities should not be returned directly.

---

# Error Handling

Backend errors should map to API error codes.

Common backend exceptions:

```text
UnauthorizedException

ForbiddenException

NotFoundException

ValidationException

ConflictException

InvalidStateTransitionException

WorkerJobFailedException

ExternalServiceException
```

---

# Audit Strategy

Every meaningful action should create an audit event.

Examples:

```text
Workspace Created

Signal Resolved

Recommendation Accepted

Notification Acknowledged

Widget Updated

Retention Policy Updated

Worker Job Failed

AI Recommendation Generated
```

Audit should be written by services, not controllers.

---

# Security Rules

Backend must never expose:

```text
Password Hash

Refresh Token Hash

OAuth Token

API Secret

Credential Value

OpenAI API Key

Provider Secret
```

Only references may be stored or returned.

---

# Integration Strategy

External integrations should be wrapped behind service interfaces.

Examples:

```text
OpenAIClient

EmailClient

SlackClient

GoogleAnalyticsClient

SearchConsoleClient

CloudflareClient
```

Domain services should not call raw external APIs directly.

---

# Configuration Strategy

Environment variables should be used for secrets and deployment configuration.

Examples:

```text
DB_HOST

DB_NAME

DB_USER

DB_PASSWORD

OPENAI_API_KEY

JWT_SECRET

APP_ENV

APP_URL
```

Secrets should not be committed to Git.

---

# Recommended Folder Structure

```text
backend/
  public/
    index.php

  app/
    Core/
      Http/
      Auth/
      Database/
      Queue/
      Events/
      Errors/

    Modules/
      Workspace/
        Controllers/
        Services/
        Repositories/
        DTO/
        Policies/
        Validators/

      Signal/
      Evidence/
      Recommendation/
      Notification/
      Widget/
      AuditLog/
      Retention/

  workers/
    worker.php
    cron.php

  config/
    app.php
    database.php
    services.php

  migrations/
  tests/
```

---

# Codex Generation Targets

This Backend Specification should allow Codex to generate:

```text
PHP Controllers

PHP Services

PHP Repositories

DTO Classes

Validators

Policies

Middleware

Worker Scripts

Job Handlers

Database Transactions

Unit Tests

Integration Tests
```

---

# Backend Layer Sequence

The Backend layer contains:

```text
01_Backend_Overview

02_Workspace_Backend

03_User_Account_Backend

04_Signal_Backend

05_Evidence_Backend

06_Recommendation_Backend

07_Notification_Backend

08_Widget_Backend

09_Audit_Log_Backend

10_Retention_Backend
```

---

# Final Rule

The Highlight Signal V1 backend is PHP-first, Cloudflare-assisted, database-centered, and modular.

PHP handles the core business backend.

Cloudflare handles edge, frontend, routing, caching, and protection.

Future Python, Java, or Cloud Run services should be extracted only when a domain requires heavier processing, specialized libraries, or independent scaling.

The backend must remain simple enough to deploy cheaply, but structured enough to grow into an enterprise-grade decision intelligence platform.
