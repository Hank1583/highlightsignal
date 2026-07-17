# 08_Widget_Backend.md

# Widget Backend

Version: v1.0

Status: Draft

Layer: Backend Specification

Depends On:

* 01_Backend_Overview
* 08_Widget_Database
* 08_Widget_API
* 04_Signal_Backend
* 05_Evidence_Backend
* 06_Recommendation_Backend
* Architecture v1.0 Frozen

---

# Purpose

The Widget Backend implements the Presentation Layer of Highlight Signal.

Widgets transform business data into reusable presentation models for dashboards, reports, executive summaries, mobile applications, and future AI interfaces.

Widgets never own business data.

They assemble and present information provided by other domain services.

---

# Domain Responsibility

The Widget Backend is responsible for:

* Widget rendering
* Widget configuration
* Dashboard layout management
* Widget instance lifecycle
* Widget cache management
* Presentation aggregation
* Widget personalization

The Widget Backend is **not** responsible for:

* Signal generation
* Recommendation generation
* Notification delivery
* Business calculations

Business information remains owned by the corresponding domain modules.

---

# Module Structure

```text id="widgetbe01"
Modules/
└── Widget/
    ├── Controllers/
    ├── Services/
    ├── Repositories/
    ├── DTO/
    ├── Validators/
    ├── Policies/
    ├── Events/
    ├── Jobs/
    └── Renderers/
```

---

# Core Components

## Controllers

```text id="widgetbe02"
WidgetController

WidgetInstanceController

DashboardLayoutController

WidgetRenderController
```

Controllers:

* Validate requests
* Check permissions
* Call services
* Return DTOs

Controllers should never assemble dashboard data directly.

---

## Services

```text id="widgetbe03"
WidgetService

WidgetInstanceService

DashboardLayoutService

WidgetRenderService

WidgetCacheService

WidgetPersonalizationService
```

WidgetService coordinates the presentation workflow.

---

## Repositories

```text id="widgetbe04"
WidgetRepository

WidgetInstanceRepository

DashboardLayoutRepository
```

Repositories provide persistence only.

---

## Validators

```text id="widgetbe05"
WidgetValidator

LayoutValidator

WidgetConfigurationValidator
```

---

## Policies

```text id="widgetbe06"
WidgetPolicy

DashboardPolicy
```

Responsible for authorization.

---

# Renderers

Each Widget type should have its own renderer.

Examples:

```text id="widgetbe07"
SignalSummaryRenderer

RecommendationRenderer

EvidenceTrendRenderer

RiskOverviewRenderer

ActivityTimelineRenderer

ExecutiveSummaryRenderer
```

All renderers implement:

```text id="widgetbe08"
render()

validateConfiguration()

buildPayload()
```

Renderers should remain stateless.

---

# Service Responsibilities

---

## WidgetService

Responsible for:

```text id="widgetbe09"
Retrieve Widget

List Widgets

Manage Widget Metadata

Validate Widget Type
```

---

## WidgetInstanceService

Responsible for:

```text id="widgetbe10"
Create Widget

Update Widget

Delete Widget

Enable Widget

Disable Widget
```

---

## DashboardLayoutService

Responsible for:

```text id="widgetbe11"
Create Layout

Update Layout

Delete Layout

Reorder Widgets

Set Default Layout
```

---

## WidgetRenderService

Responsible for:

```text id="widgetbe12"
Select Renderer

Load Business Data

Generate Payload

Build Presentation Model
```

Business data should be requested through domain services.

---

## WidgetCacheService

Responsible for:

```text id="widgetbe13"
Generate Cache

Refresh Cache

Invalidate Cache

Cache Expiration
```

---

## WidgetPersonalizationService

Responsible for:

```text id="widgetbe14"
User Preferences

Workspace Preferences

Adaptive Layout

Default Dashboard
```

---

# Transaction Boundaries

## Create Widget Instance

Transaction:

```text id="widgetbe15"
Validate Widget

↓

Validate Layout

↓

Create Instance

↓

Audit Record

↓

Commit
```

---

## Update Layout

Transaction:

```text id="widgetbe16"
Validate Configuration

↓

Reorder Widgets

↓

Persist Layout

↓

Audit Record

↓

Commit
```

---

## Refresh Widget Cache

Transaction:

```text id="widgetbe17"
Invalidate Cache

↓

Generate Payload

↓

Persist Cache

↓

Audit Record

↓

Commit
```

Rendering should never occur inside the database transaction.

---

# Repository Interfaces

## WidgetRepository

```text id="widgetbe18"
findById()

findTemplates()

findCategory()

create()

update()
```

---

## WidgetInstanceRepository

```text id="widgetbe19"
findByWorkspace()

findByLayout()

create()

update()

delete()
```

---

## DashboardLayoutRepository

```text id="widgetbe20"
findByWorkspace()

create()

update()

delete()

setDefault()
```

---

# Widget Rendering Flow

Rendering pipeline:

```text id="widgetbe21"
Widget Request

↓

Load Configuration

↓

Select Renderer

↓

Retrieve Business Data

↓

Build Payload

↓

Cache

↓

Return DTO
```

Renderers should remain independent of HTTP requests.

---

# Business Data Integration

Widgets should consume business services instead of querying databases directly.

Example:

```text id="widgetbe22"
WidgetRenderService

↓

SignalService

RecommendationService

EvidenceService

NotificationService
```

This preserves domain boundaries.

---

# Event Flow

Domain events:

```text id="widgetbe23"
WidgetCreated

WidgetUpdated

WidgetDeleted

LayoutCreated

LayoutUpdated

LayoutDeleted

CacheRefreshed
```

Events may trigger cache invalidation.

---

# Worker Jobs

Possible background jobs:

```text id="widgetbe24"
Refresh Dashboard Cache

Generate Executive Dashboard

Generate Weekly Summary

Cleanup Widget Cache

Preload Popular Widgets
```

Workers should perform expensive rendering asynchronously.

---

# DTO Strategy

## Request DTOs

```text id="widgetbe25"
CreateWidgetRequest

UpdateWidgetRequest

UpdateLayoutRequest

RefreshWidgetRequest
```

---

## Response DTOs

```text id="widgetbe26"
WidgetDTO

WidgetInstanceDTO

DashboardLayoutDTO

WidgetPayloadDTO
```

DTOs isolate presentation models from persistence models.

---

# Error Handling

Domain exceptions:

```text id="widgetbe27"
WidgetNotFoundException

LayoutNotFoundException

RendererNotFoundException

WidgetConfigurationException

DisplayOrderConflictException
```

Exceptions should be translated through global middleware.

---

# Audit Strategy

Audit records should be generated for:

```text id="widgetbe28"
Widget Created

Widget Updated

Widget Deleted

Layout Created

Layout Updated

Layout Deleted

Widget Cache Refreshed
```

Audit logging belongs to the Service layer.

---

# Performance Strategy

Frequently accessed objects:

```text id="widgetbe29"
Dashboard Layout

Widget Payload

Widget Cache

Executive Dashboard
```

Recommended optimizations:

* Payload caching
* Lazy loading
* Renderer reuse
* Background cache refresh
* Metadata caching

---

# Security Rules

Widget services must enforce:

```text id="widgetbe30"
Workspace Isolation

Role Authorization

Configuration Validation

Audit Logging

Renderer Isolation
```

Widget rendering must never expose unauthorized business data.

---

# Testing Strategy

Unit Tests:

```text id="widgetbe31"
WidgetService

WidgetRenderService

WidgetCacheService

DashboardLayoutService

Renderer Implementations
```

Integration Tests:

```text id="widgetbe32"
Create Widget

Update Layout

Render Dashboard

Refresh Cache

Delete Widget
```

Renderer tests should verify deterministic output.

---

# Dependency Graph

```text id="widgetbe33"
WidgetController

↓

WidgetService

↓

WidgetRepository

↓

Database
```

Supporting services:

```text id="widgetbe34"
WidgetRenderService

↓

SignalService

RecommendationService

EvidenceService

↓

WidgetCacheService

↓

AuditService

↓

JobService
```

Dependencies should remain one-directional and presentation-only.

---

# Codex Generation Targets

This specification should allow Codex to generate:

```text id="widgetbe35"
WidgetController

WidgetInstanceController

DashboardLayoutController

WidgetRenderController

WidgetService

WidgetRenderService

WidgetCacheService

DashboardLayoutService

Renderer Implementations

Repositories

Validators

Policies

DTOs

Worker Jobs

Unit Tests
```

---

# Presentation Pipeline

The Widget Backend transforms business information into reusable presentation models.

```text id="widgetbe36"
Business Services

↓

Widget Renderer

↓

Presentation Model

↓

Cache

↓

Dashboard

↓

User
```

Widgets should never contain business decision logic.

---

# Multi-Platform Strategy

The same Widget should support multiple presentation targets.

```text id="widgetbe37"
Web Dashboard

↓

Mobile App

↓

Tablet

↓

Executive Report

↓

AI Copilot

↓

Future Interfaces
```

Only the presentation layer changes.

The underlying Widget model remains identical.

---

# Final Rule

The Widget Backend implements the presentation layer of Highlight Signal.

It assembles business information from domain services into reusable, cacheable, and platform-independent presentation models.

The module must maintain strict separation between business logic and presentation, provide deterministic rendering, efficient caching, and complete auditability while remaining fully compatible with the PHP-first modular monolith architecture.
