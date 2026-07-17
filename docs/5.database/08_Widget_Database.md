# 08_Widget_Database.md

# Widget Database

Version: v1.0

Status: Draft

Layer: Database Specification

Depends On:

* 01_Database_Overview
* 02_Workspace_Database
* 04_Signal_Database
* 06_Recommendation_Database
* Widget Framework
* Architecture v1.0 Frozen

---

# Purpose

The Widget database defines the presentation layer of Highlight Signal.

Widgets transform Signals, Recommendations, and Evidence into structured visual components for dashboards, reports, and future AI interfaces.

A Widget does not store business data.

Instead, it defines **how business data is organized, configured, and presented**.

The Widget domain enables reusable, adaptive, and workspace-specific decision visualization.

---

# Domain Responsibility

The Widget domain is responsible for:

* Widget definitions
* Widget instances
* Dashboard layouts
* Widget configuration
* Cached rendering data
* Presentation preferences

The Widget domain is **not** responsible for:

* Signal generation
* Recommendation generation
* Notification delivery
* User authentication

---

# Core Entities

```text id="widget01"
widgets

widget_instances

widget_layouts

widget_data_cache
```

---

# Aggregate Structure

```text id="widget02"
Widget

├── Widget Instance
├── Dashboard Layout
├── Cached Data
└── Presentation Configuration
```

Widget is the Aggregate Root of the presentation layer.

---

# Entity Definition

---

## widgets

Defines reusable widget templates.

### Fields

| Field                 | Type         | Required | Description           |
| --------------------- | ------------ | -------- | --------------------- |
| id                    | UUID         | Yes      | Primary key           |
| code                  | VARCHAR(50)  | Yes      | Internal identifier   |
| name                  | VARCHAR(150) | Yes      | Display name          |
| category              | VARCHAR(50)  | Yes      | Widget category       |
| description           | TEXT         | No       | Description           |
| default_configuration | JSONB        | Yes      | Default configuration |
| created_at            | TIMESTAMP    | Yes      | Created time          |

---

### Example Categories

```text id="widget03"
Signal

Recommendation

Evidence

Trend

Summary

Timeline

Risk

Performance

Activity
```

---

## widget_instances

Represents a widget configured within a workspace.

### Fields

| Field         | Type         |
| ------------- | ------------ |
| id            | UUID         |
| workspace_id  | UUID         |
| widget_id     | UUID         |
| layout_id     | UUID         |
| title         | VARCHAR(255) |
| configuration | JSONB        |
| display_order | INTEGER      |
| enabled       | BOOLEAN      |
| created_at    | TIMESTAMP    |
| updated_at    | TIMESTAMP    |

---

## widget_layouts

Defines dashboard layouts.

### Fields

| Field         | Type         |
| ------------- | ------------ |
| id            | UUID         |
| workspace_id  | UUID         |
| layout_name   | VARCHAR(100) |
| layout_type   | VARCHAR(50)  |
| columns       | INTEGER      |
| configuration | JSONB        |
| is_default    | BOOLEAN      |
| created_at    | TIMESTAMP    |
| updated_at    | TIMESTAMP    |

---

### Example Layout Types

```text id="widget04"
Desktop

Tablet

Mobile

Report

Presentation
```

---

## widget_data_cache

Stores precomputed widget data.

### Fields

| Field              | Type      |
| ------------------ | --------- |
| id                 | UUID      |
| widget_instance_id | UUID      |
| cache_key          | VARCHAR   |
| payload            | JSONB     |
| generated_at       | TIMESTAMP |
| expires_at         | TIMESTAMP |

Cache data may be regenerated at any time.

---

# Relationships

```text id="widget05"
Workspace

↓

Dashboard Layout

↓

Widget Instance

↓

Widget Template

↓

Cached Data
```

Business objects are queried dynamically.

Widgets do not duplicate business records.

---

## Cardinality

```text id="widget06"
Workspace

↓

Many Layouts

Layout

↓

Many Widget Instances

Widget

↓

Many Widget Instances

Widget Instance

↓

Many Cached Results
```

---

# Primary Keys

```text id="widget07"
widgets.id

widget_instances.id

widget_layouts.id

widget_data_cache.id
```

---

# Foreign Keys

```text id="widget08"
widget_instances.workspace_id
→ workspaces.id
```

```text id="widget09"
widget_instances.widget_id
→ widgets.id
```

```text id="widget10"
widget_instances.layout_id
→ widget_layouts.id
```

```text id="widget11"
widget_layouts.workspace_id
→ workspaces.id
```

```text id="widget12"
widget_data_cache.widget_instance_id
→ widget_instances.id
```

---

# Lifecycle

## Widget Registration

```text id="widget13"
Widget Template

↓

Available For Use
```

---

## Workspace Initialization

```text id="widget14"
Workspace

↓

Default Layout

↓

Default Widgets
```

---

## User Customization

```text id="widget15"
Widget Instance

↓

Configuration Updated

↓

Layout Saved
```

---

## Cache Refresh

```text id="widget16"
Signal Changed

↓

Cache Invalidated

↓

Cache Rebuilt
```

---

## Dashboard Rendering

```text id="widget17"
Widget

↓

Cache

↓

UI Rendering
```

---

# Index Strategy

## Workspace Widgets

```sql id="widget18"
INDEX(workspace_id)
```

---

## Layout Lookup

```sql id="widget19"
INDEX(layout_id)
```

---

## Display Order

```sql id="widget20"
INDEX(layout_id, display_order)
```

---

## Widget Template

```sql id="widget21"
INDEX(widget_id)
```

---

## Cache Lookup

```sql id="widget22"
UNIQUE(cache_key)
```

---

## Cache Expiration

```sql id="widget23"
INDEX(expires_at)
```

---

# Constraints

---

## Workspace Ownership

Every Widget Instance belongs to exactly one Workspace.

---

## Layout Ownership

Layouts belong to one Workspace.

---

## Widget Template

Templates are global system resources.

They are not owned by a workspace.

---

## Cache

Cached data is disposable.

Business records must never rely on cache for persistence.

---

## Display Order

Display order should be unique within a layout.

Recommended constraint:

```sql id="widget24"
UNIQUE(layout_id, display_order)
```

---

## Configuration

Widget configuration should be stored as structured JSONB.

---

# Future APIs

```text id="widget25"
List Widgets

Get Widget

Create Widget Instance

Update Widget Configuration

Delete Widget Instance

Get Layout

Update Layout

Reset Dashboard

Refresh Cache

Render Widget
```

---

# Future Backend Services

## Widget Service

Maintains widget definitions and instances.

---

## Dashboard Service

Builds workspace dashboards.

---

## Layout Service

Handles dashboard layout management.

---

## Widget Cache Service

Generates and refreshes cached widget data.

---

## Widget Rendering Service

Transforms business objects into presentation models.

---

## Personalization Service

Adapts widget ordering and visibility based on user preferences and future AI recommendations.

---

# Implementation Notes

Recommended implementation:

```text id="widget26"
UUID Primary Keys

Workspace Isolation

JSONB Configuration

Disposable Cache

Optimistic Locking

Global Widget Templates
```

Example widget configuration:

```json id="widget27"
{
  "show_severity": true,
  "max_items": 10,
  "sort": "priority_desc",
  "filter": {
    "status": [
      "new",
      "investigating"
    ]
  }
}
```

Example cached payload:

```json id="widget28"
{
  "generated_at": "2026-07-02T09:30:00Z",
  "signal_count": 18,
  "critical": 2,
  "high": 6,
  "top_recommendations": [
    "Fix missing CSP",
    "Optimize landing page",
    "Resolve GA tracking issue"
  ]
}
```

---

# Presentation Flow

The Widget database converts business decisions into reusable presentation models.

```text id="widget29"
Evidence

↓

Signal

↓

Recommendation

↓

Widget Query

↓

Widget Cache

↓

Dashboard

↓

User
```

The same Widget definition can support multiple presentation targets without changing the underlying business logic.

---

# Integration with Future Clients

Widget definitions are presentation-independent.

Future clients may include:

```text id="widget30"
Web Dashboard

Mobile App

PDF Report

Executive Summary

TV Dashboard

AI Copilot

Voice Assistant
```

Each client consumes the same Widget model while applying its own rendering layer.

---

# Final Rule

Widgets are presentation models, not business entities.

Signals define **what is important**.

Recommendations define **what should be done**.

Widgets define **how that information is organized and presented**.

The Widget database separates presentation from business logic, ensuring a consistent decision-first experience across every interface in the Highlight Signal platform.
