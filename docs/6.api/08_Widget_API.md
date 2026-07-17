# 08_Widget_API.md

# Widget API

Version: v1.0

Status: Draft

Layer: API Specification

Depends On:

* 01_API_Overview
* 02_Workspace_API
* 04_Signal_API
* 06_Recommendation_API
* 08_Widget_Database
* Widget Framework
* Architecture v1.0 Frozen

---

# Purpose

The Widget API defines how clients retrieve, configure, organize, and render Widgets within Highlight Signal.

Widgets are presentation models that transform business objects into decision-oriented visual components.

The Widget API enables consistent dashboard experiences across web applications, mobile applications, reports, executive summaries, and future AI interfaces.

Widgets do not own business data.

They define how business data is presented.

---

# Domain Responsibility

The Widget API is responsible for:

* Widget retrieval
* Widget instance management
* Dashboard layout management
* Widget configuration
* Widget rendering
* Widget cache management

The Widget API is **not** responsible for:

* Signal generation
* Recommendation generation
* Notification delivery
* Business calculations

Business data is retrieved from other domain services.

---

# Base Routes

```text id="widgetapi01"
/api/workspaces/{workspace_id}/widgets

/api/workspaces/{workspace_id}/widget-instances

/api/workspaces/{workspace_id}/widget-layouts
```

---

# Authentication

```text id="widgetapi02"
Auth Required: Yes
```

---

# Authorization

Minimum permission:

```text id="widgetapi03"
viewer
```

Layout modification requires:

```text id="widgetapi04"
member

manager

admin

owner
```

---

# Endpoints

---

## List Widget Templates

```text id="widgetapi05"
GET /api/workspaces/{workspace_id}/widgets
```

Returns available Widget templates.

### Query Parameters

```text id="widgetapi06"
category

enabled

sort
```

### Response

```json id="widgetapi07"
{
  "data": [
    {
      "id": "widget_uuid",
      "code": "signal_summary",
      "name": "Signal Summary",
      "category": "Signal"
    }
  ]
}
```

---

## Get Widget Template

```text id="widgetapi08"
GET /api/workspaces/{workspace_id}/widgets/{widget_id}
```

Returns Widget definition.

---

# Widget Instance Endpoints

---

## List Widget Instances

```text id="widgetapi09"
GET /api/workspaces/{workspace_id}/widget-instances
```

Returns configured Widgets.

### Response

```json id="widgetapi10"
{
  "data": [
    {
      "id": "instance_uuid",
      "widget": "Signal Summary",
      "layout": "Desktop",
      "display_order": 1,
      "enabled": true
    }
  ]
}
```

---

## Create Widget Instance

```text id="widgetapi11"
POST /api/workspaces/{workspace_id}/widget-instances
```

Adds a Widget to a dashboard.

### Permission

```text id="widgetapi12"
member

manager

admin

owner
```

### Request Body

```json id="widgetapi13"
{
  "widget_id": "widget_uuid",
  "layout_id": "layout_uuid",
  "display_order": 3,
  "configuration": {
    "max_items": 10,
    "sort": "priority_desc"
  }
}
```

### Response

```json id="widgetapi14"
{
  "data": {
    "id": "instance_uuid",
    "enabled": true
  }
}
```

---

## Update Widget Instance

```text id="widgetapi15"
PATCH /api/workspaces/{workspace_id}/widget-instances/{instance_id}
```

Updates Widget configuration.

### Request Body

```json id="widgetapi16"
{
  "display_order": 2,
  "enabled": true,
  "configuration": {
    "max_items": 20
  }
}
```

---

## Delete Widget Instance

```text id="widgetapi17"
DELETE /api/workspaces/{workspace_id}/widget-instances/{instance_id}
```

Removes a Widget from the dashboard.

---

# Layout Endpoints

---

## List Layouts

```text id="widgetapi18"
GET /api/workspaces/{workspace_id}/widget-layouts
```

Returns dashboard layouts.

---

## Get Layout

```text id="widgetapi19"
GET /api/workspaces/{workspace_id}/widget-layouts/{layout_id}
```

Returns one layout.

---

## Create Layout

```text id="widgetapi20"
POST /api/workspaces/{workspace_id}/widget-layouts
```

Creates a dashboard layout.

### Request Body

```json id="widgetapi21"
{
  "layout_name": "Executive Dashboard",
  "layout_type": "Desktop",
  "columns": 3,
  "is_default": false
}
```

---

## Update Layout

```text id="widgetapi22"
PATCH /api/workspaces/{workspace_id}/widget-layouts/{layout_id}
```

Updates dashboard layout.

---

## Delete Layout

```text id="widgetapi23"
DELETE /api/workspaces/{workspace_id}/widget-layouts/{layout_id}
```

Deletes a custom layout.

Default layouts cannot be deleted.

---

# Rendering Endpoints

---

## Render Widget

```text id="widgetapi24"
GET /api/workspaces/{workspace_id}/widget-instances/{instance_id}/render
```

Returns presentation-ready data.

### Response

```json id="widgetapi25"
{
  "data": {
    "widget": "Signal Summary",
    "generated_at": "2026-07-02T09:30:00Z",
    "payload": {
      "critical": 2,
      "high": 6,
      "medium": 12
    }
  }
}
```

---

## Refresh Widget Cache

```text id="widgetapi26"
POST /api/workspaces/{workspace_id}/widget-instances/{instance_id}/refresh
```

Invalidates and regenerates cached data.

### Permission

```text id="widgetapi27"
manager

admin

owner
```

---

# Validation Rules

## Display Order

Positive integer.

Must be unique within one layout.

---

## Layout Type

Allowed values:

```text id="widgetapi28"
Desktop

Tablet

Mobile

Report

Presentation
```

---

## Widget Category

Allowed values:

```text id="widgetapi29"
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

## Configuration

Widget configuration must be valid JSON.

Unknown fields should be ignored or rejected based on Widget definition.

---

# Filtering

Supported filters:

```text id="widgetapi30"
category

enabled

layout

created_after
```

---

# Sorting

Supported sorting:

```text id="widgetapi31"
display_order

created_at

updated_at

category
```

---

# Error Codes

```text id="widgetapi32"
UNAUTHORIZED

FORBIDDEN

NOT_FOUND

VALIDATION_ERROR

LAYOUT_NOT_FOUND

DISPLAY_ORDER_CONFLICT

DEFAULT_LAYOUT_REQUIRED
```

---

# Future Backend Services Used

```text id="widgetapi33"
Widget Service

Dashboard Service

Layout Service

Widget Cache Service

Widget Rendering Service

Personalization Service

Audit Service
```

---

# Audit Events

Widget API should generate audit events for:

```text id="widgetapi34"
Widget Added

Widget Updated

Widget Removed

Layout Created

Layout Updated

Layout Deleted

Widget Cache Refreshed
```

---

# Response Expansion

Supported expansions:

```text id="widgetapi35"
layout

configuration

cache

signal_summary

recommendation_summary
```

Example:

```text id="widgetapi36"
GET /widget-instances/{instance_id}?expand=layout,cache
```

---

# Future Agent Operations

Future AI Agents may use the Widget API to:

```text id="widgetapi37"
Generate Personalized Dashboards

Optimize Widget Ordering

Refresh Cached Data

Create Executive Views

Prepare Report Layouts
```

Agents should only modify Widget configuration and presentation.

Business data remains owned by domain services.

---

# Presentation Flow

The Widget API transforms business information into presentation models.

```text id="widgetapi38"
Evidence

↓

Signal

↓

Recommendation

↓

Widget API

↓

Rendering Service

↓

Dashboard

↓

User
```

Rendering should remain deterministic and independent of the client platform.

---

# Client Compatibility

The Widget API supports multiple presentation targets.

```text id="widgetapi39"
Web Dashboard

Mobile App

Tablet

PDF Report

Executive Summary

TV Dashboard

AI Copilot
```

Each client consumes the same Widget model while rendering according to its own user experience.

---

# Final Rule

The Widget API exposes the presentation layer of Highlight Signal.

Widgets do not own business data.

They organize and present business decisions in a consistent, reusable, and workspace-aware manner.

Every Widget should provide a stable presentation contract that allows the same business information to be rendered across dashboards, reports, mobile applications, and future AI-driven interfaces without changing the underlying decision model.
