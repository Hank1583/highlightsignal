# 02_Workspace_Backend.md

# Workspace Backend

Version: v1.0

Status: Draft

Layer: Backend Specification

Depends On:

* 01_Backend_Overview
* 02_Workspace_Database
* 02_Workspace_API
* Architecture v1.0 Frozen

---

# Purpose

The Workspace Backend implements the Workspace domain of Highlight Signal.

Workspace is the tenant boundary of the platform.

Every business object belongs to exactly one Workspace.

The Workspace Backend manages workspace lifecycle, membership, settings, and initialization while ensuring complete tenant isolation.

---

# Domain Responsibility

The Workspace Backend is responsible for:

* Workspace lifecycle
* Workspace initialization
* Workspace membership
* Workspace settings
* Workspace integrations
* Workspace permissions

The Workspace Backend is **not** responsible for:

* User authentication
* Signal processing
* Recommendation generation
* Notification delivery

---

# Module Structure

```text
Modules/
└── Workspace/
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

## Controller

```text
WorkspaceController

WorkspaceMemberController

WorkspaceSettingsController

WorkspaceIntegrationController
```

Controllers should:

* Validate requests
* Check authentication
* Invoke policies
* Call services
* Return DTOs

Controllers must not contain business logic.

---

## Services

```text
WorkspaceService

WorkspaceInitializationService

WorkspaceMemberService

WorkspaceSettingsService

WorkspaceIntegrationService
```

Services contain all Workspace business rules.

---

## Repositories

```text
WorkspaceRepository

WorkspaceMemberRepository

WorkspaceSettingsRepository

WorkspaceIntegrationRepository
```

Repositories only access the database.

---

## Validators

```text
CreateWorkspaceValidator

UpdateWorkspaceValidator

InviteMemberValidator

WorkspaceSettingsValidator

IntegrationValidator
```

---

## Policies

```text
WorkspacePolicy

WorkspaceMemberPolicy
```

Policies determine whether a user may perform an action.

---

# Service Responsibilities

---

## WorkspaceService

Responsible for:

* Create workspace
* Update workspace
* Archive workspace
* Retrieve workspace
* List workspaces

Does not create default resources.

---

## WorkspaceInitializationService

Runs immediately after workspace creation.

Creates:

```text
Default Workspace Settings

Default Dashboard Layout

Default Widgets

Owner Membership

Initial Audit Record
```

Initialization must execute within the same transaction.

---

## WorkspaceMemberService

Responsible for:

* Invite member
* Accept invitation
* Remove member
* Change role
* List members

Role validation occurs here.

---

## WorkspaceSettingsService

Responsible for:

* Read settings
* Update settings
* Validate configuration

---

## WorkspaceIntegrationService

Responsible for:

* Register integration
* Enable integration
* Disable integration
* Synchronize metadata

Credential validation should occur through integration clients.

---

# Transaction Boundaries

## Create Workspace

Transaction:

```text
Create Workspace

↓

Create Owner Membership

↓

Create Default Settings

↓

Create Default Dashboard

↓

Create Default Widgets

↓

Create Audit Record

↓

Commit
```

Any failure causes rollback.

---

## Invite Member

Transaction:

```text
Validate Email

↓

Create Invitation

↓

Create Membership

↓

Queue Invitation Email

↓

Create Audit Record

↓

Commit
```

Email delivery occurs asynchronously.

---

## Archive Workspace

Transaction:

```text
Validate Ownership

↓

Update Workspace Status

↓

Disable Scheduled Jobs

↓

Create Audit Record

↓

Commit
```

---

# Repository Interface

Recommended methods:

## WorkspaceRepository

```text
findById()

findBySlug()

findByUser()

create()

update()

archive()

exists()
```

---

## WorkspaceMemberRepository

```text
findMembers()

findByUser()

create()

updateRole()

remove()

exists()
```

---

## WorkspaceSettingsRepository

```text
find()

create()

update()
```

---

## WorkspaceIntegrationRepository

```text
find()

create()

update()

delete()
```

---

# Permission Flow

Every request should follow:

```text
JWT Authentication

↓

Workspace Exists

↓

Workspace Active

↓

User Membership Exists

↓

Role Validation

↓

Business Logic
```

Permission evaluation belongs to Policies.

---

# Event Flow

Workspace events:

```text
WorkspaceCreated

WorkspaceUpdated

WorkspaceArchived

MemberInvited

MemberJoined

MemberRemoved

RoleChanged

SettingsUpdated

IntegrationConnected

IntegrationDisconnected
```

Events may trigger background jobs.

---

# Worker Jobs

Possible jobs:

```text
Send Invitation Email

Sync Integration Metadata

Refresh Workspace Cache

Initialize Analytics

Cleanup Archived Workspace
```

Workers execute asynchronously.

---

# External Integrations

External systems should be wrapped by interfaces.

Examples:

```text
GoogleAnalyticsClient

SearchConsoleClient

CloudflareClient

OpenAIClient
```

The Workspace module should never call external APIs directly.

---

# DTO Strategy

## Request DTOs

```text
CreateWorkspaceRequest

UpdateWorkspaceRequest

InviteMemberRequest

UpdateSettingsRequest
```

---

## Response DTOs

```text
WorkspaceSummaryDTO

WorkspaceDetailDTO

MemberDTO

WorkspaceSettingsDTO

IntegrationDTO
```

DTOs isolate API responses from database entities.

---

# Error Handling

Domain exceptions:

```text
WorkspaceNotFoundException

WorkspaceArchivedException

DuplicateWorkspaceSlugException

MemberAlreadyExistsException

InvalidWorkspaceRoleException

OwnerTransferRequiredException

IntegrationAlreadyConnectedException
```

Global exception middleware converts exceptions into API responses.

---

# Audit Strategy

Audit records should be generated for:

```text
Workspace Created

Workspace Updated

Workspace Archived

Member Invited

Member Joined

Member Removed

Role Updated

Settings Updated

Integration Connected

Integration Disconnected
```

Audit logging belongs to the Service layer.

---

# Background Processing

Background jobs should use the shared jobs table.

Example flow:

```text
Workspace Created

↓

Job Created

↓

PHP Worker

↓

Process Job

↓

Update Status

↓

Audit Record
```

No controller should execute long-running operations.

---

# Performance Strategy

Frequently queried objects:

```text
Workspace

Workspace Settings

Membership

Active Integrations
```

These may be cached.

Cache should be invalidated when updates occur.

---

# Security Rules

Workspace services must enforce:

```text
Workspace Isolation

Role-Based Authorization

Input Validation

Transaction Safety

Audit Logging
```

Workspace IDs must always be validated against the authenticated user's memberships.

---

# Testing Strategy

Unit Tests:

```text
WorkspaceService

WorkspaceMemberService

WorkspacePolicy
```

Integration Tests:

```text
Create Workspace

Invite Member

Archive Workspace

Update Settings

Integration Registration
```

---

# Dependency Graph

```text
WorkspaceController

↓

WorkspaceService

↓

WorkspaceRepository

↓

Database
```

Additional services:

```text
WorkspaceService

↓

AuditService

↓

JobService

↓

WorkspaceInitializationService
```

Dependencies should remain one-directional.

---

# Codex Generation Targets

This specification should allow Codex to generate:

```text
WorkspaceController

WorkspaceMemberController

WorkspaceSettingsController

WorkspaceService

WorkspaceInitializationService

WorkspaceRepository

Policies

Validators

DTOs

Worker Jobs

Unit Tests
```

---

# Final Rule

The Workspace Backend implements the tenant foundation of Highlight Signal.

Every business operation begins with Workspace validation.

The module must guarantee tenant isolation, consistent initialization, centralized permission enforcement, transactional integrity, and complete auditability while remaining lightweight enough for a PHP-first modular monolith architecture.
