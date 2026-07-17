# 01_Database_Overview.md

# Database Overview

Version: v1.0

Status: Draft

Layer: Database Specification

Depends On:

* Handbook
* Concepts
* Framework
* Architecture v1.0 Frozen

---

# Purpose

This document defines the database foundation for Highlight Signal.

The goal of the database layer is to convert the frozen architecture into concrete data structures that can be implemented directly by backend services and generated into code by Codex.

The database layer does not redefine product concepts.

It maps existing architecture into persistent entities, relationships, constraints, lifecycle rules, and future service boundaries.

---

# Domain Responsibility

The database is responsible for storing the core operational state of Highlight Signal.

It supports:

* Users
* Workspaces
* Signals
* Evidence
* Recommendations
* Notifications
* Widgets
* Audit logs
* Backend service execution state

The database must support a decision-first product experience.

It should not only store raw data.

It must preserve the relationship between:

* What happened
* Why it matters
* What evidence supports it
* What action is recommended
* Whether the user acted on it

---

# Database Principles

## 1. Architecture Mapping First

Database tables must reflect the frozen architecture.

No database entity should introduce a new product concept without architecture approval.

---

## 2. Decision Traceability

Every signal, recommendation, and notification should be traceable back to its source evidence.

The system must be able to answer:

* Why was this signal created?
* What evidence generated it?
* Which user or workspace saw it?
* What recommendation was produced?
* Was any action taken?

---

## 3. Workspace Isolation

Workspace is the primary business boundary.

Most business data must belong to a workspace.

This includes:

* Signals
* Evidence
* Recommendations
* Widgets
* Notifications
* Audit logs

---

## 4. Append-Friendly Design

Important decision records should avoid destructive updates.

Where possible, the system should preserve historical states.

Examples:

* Signal status history
* Recommendation changes
* Notification delivery attempts
* Evidence snapshots
* User action logs

---

## 5. Backend-Service Ready

Each table should be designed with future backend services in mind.

The database should support:

* API services
* Background workers
* AI processing jobs
* Notification services
* Report generation
* Audit and analytics

---

# Core Entity Groups

The database is divided into the following entity groups:

---

# 1. Workspace Entities

Workspace entities define ownership, access, and product context.

Core tables:

* workspaces
* workspace_members
* workspace_settings
* workspace_integrations

Primary responsibility:

Define who owns the data and how users access the product.

---

# 2. User Account Entities

User account entities manage identity and access.

Core tables:

* users
* user_profiles
* user_auth_providers
* user_sessions

Primary responsibility:

Identify users and connect them to workspaces.

---

# 3. Signal Entities

Signal entities represent meaningful business or system changes detected by Highlight Signal.

Core tables:

* signals
* signal_types
* signal_status_history
* signal_sources

Primary responsibility:

Store detected signals and their current interpretation.

---

# 4. Evidence Entities

Evidence entities store the supporting data behind each signal.

Core tables:

* evidence_items
* evidence_sources
* evidence_snapshots
* signal_evidence_links

Primary responsibility:

Preserve why a signal exists.

---

# 5. Recommendation Entities

Recommendation entities store AI-generated or rule-generated suggestions.

Core tables:

* recommendations
* recommendation_actions
* recommendation_status_history

Primary responsibility:

Connect signals to possible user decisions.

---

# 6. Notification Entities

Notification entities manage delivery of important updates to users.

Core tables:

* notifications
* notification_channels
* notification_delivery_attempts
* notification_preferences

Primary responsibility:

Deliver the right signal to the right user at the right time.

---

# 7. Widget Entities

Widget entities store dashboard-level display configuration.

Core tables:

* widgets
* widget_instances
* widget_data_cache
* widget_layouts

Primary responsibility:

Support adaptive dashboard presentation.

---

# 8. Audit Log Entities

Audit log entities record important user and system actions.

Core tables:

* audit_logs
* system_events
* worker_job_logs

Primary responsibility:

Support debugging, compliance, accountability, and system observability.

---

# Global Relationships

## User to Workspace

A user may belong to multiple workspaces.

A workspace may have multiple users.

Relationship:

users
→ workspace_members
→ workspaces

---

## Workspace to Signal

A workspace owns many signals.

Relationship:

workspaces
→ signals

---

## Signal to Evidence

A signal may have multiple evidence items.

An evidence item may support multiple signals.

Relationship:

signals
→ signal_evidence_links
→ evidence_items

---

## Signal to Recommendation

A signal may generate one or more recommendations.

Relationship:

signals
→ recommendations

---

## Recommendation to Action

A recommendation may contain one or more possible actions.

Relationship:

recommendations
→ recommendation_actions

---

## Signal to Notification

A signal may trigger notifications.

Relationship:

signals
→ notifications

---

## Workspace to Widget

A workspace owns dashboard widgets.

Relationship:

workspaces
→ widget_instances
→ widgets

---

# Primary Keys

All primary entities should use stable unique identifiers.

Recommended format:

```text
UUID
```

Primary keys should be:

* Globally unique
* Non-sequential where security matters
* Stable across service boundaries
* Safe for API exposure when appropriate

Example:

```sql
id UUID PRIMARY KEY
```

---

# Foreign Keys

Foreign keys should enforce ownership and traceability.

Common foreign keys:

```sql
workspace_id UUID REFERENCES workspaces(id)
user_id UUID REFERENCES users(id)
signal_id UUID REFERENCES signals(id)
evidence_id UUID REFERENCES evidence_items(id)
recommendation_id UUID REFERENCES recommendations(id)
notification_id UUID REFERENCES notifications(id)
```

Foreign keys should be used for core business relationships.

For high-volume logs, soft references may be allowed if performance requires it.

---

# Lifecycle

The database lifecycle follows the product decision flow.

## 1. Data Ingestion

External or internal data is collected.

Possible sources:

* Website
* Analytics
* SEO data
* Ads data
* Security scans
* User input
* Backend workers
* AI analysis

Result:

* evidence_items
* evidence_snapshots

---

## 2. Signal Generation

The system evaluates evidence and creates signals.

Result:

* signals
* signal_evidence_links
* signal_status_history

---

## 3. Recommendation Generation

The system generates recommended actions.

Result:

* recommendations
* recommendation_actions
* recommendation_status_history

---

## 4. User Delivery

Important signals and recommendations are delivered to users.

Result:

* notifications
* notification_delivery_attempts

---

## 5. Dashboard Presentation

Signals, evidence, and recommendations appear in widgets.

Result:

* widget_instances
* widget_data_cache

---

## 6. User Action

User accepts, ignores, dismisses, or acts on recommendations.

Result:

* recommendation_status_history
* audit_logs

---

## 7. Historical Review

The system preserves decision history for future review.

Result:

* audit_logs
* system_events
* historical signal and recommendation records

---

# Index Strategy

Indexes should support common product access patterns.

## Workspace-Based Query

Most queries should filter by workspace.

Recommended index pattern:

```sql
CREATE INDEX idx_table_workspace_id ON table_name(workspace_id);
```

---

## Time-Based Query

Signals, evidence, notifications, and logs should support timeline queries.

Recommended index pattern:

```sql
CREATE INDEX idx_table_workspace_created_at ON table_name(workspace_id, created_at DESC);
```

---

## Status-Based Query

Signals, recommendations, notifications, and jobs should support status filtering.

Recommended index pattern:

```sql
CREATE INDEX idx_table_workspace_status ON table_name(workspace_id, status);
```

---

## Relationship Query

Join tables should index both sides of the relationship.

Example:

```sql
CREATE INDEX idx_signal_evidence_signal_id ON signal_evidence_links(signal_id);
CREATE INDEX idx_signal_evidence_evidence_id ON signal_evidence_links(evidence_id);
```

---

## Worker Query

Background jobs should support queue-style access.

Recommended fields:

* status
* scheduled_at
* locked_at
* locked_by
* retry_count

Recommended index:

```sql
CREATE INDEX idx_jobs_status_scheduled_at ON jobs(status, scheduled_at);
```

---

# Constraints

## Required Common Fields

Most tables should include:

```sql
id
created_at
updated_at
```

Workspace-owned tables should include:

```sql
workspace_id
```

User-action tables should include:

```sql
created_by_user_id
```

Soft-deletable tables should include:

```sql
deleted_at
```

---

## Status Constraints

Status fields should use controlled values.

Examples:

```text
active
inactive
pending
processing
completed
failed
dismissed
archived
```

Implementation options:

* ENUM
* VARCHAR with CHECK constraint
* Application-level constant mapping

---

## Ownership Constraints

Business entities must not exist without ownership.

Examples:

* A signal must belong to a workspace.
* A recommendation must belong to a signal or workspace.
* A notification must belong to a workspace and target user.
* A widget instance must belong to a workspace.

---

## Deletion Constraints

Hard delete should be avoided for decision records.

Preferred strategy:

* Soft delete for user-visible entities
* Archive for old signals
* Retain audit logs
* Retain evidence snapshots unless retention policy removes them

---

# Future APIs

The database should support future APIs including:

* Workspace API
* User API
* Signal API
* Evidence API
* Recommendation API
* Notification API
* Widget API
* Audit Log API
* Integration API
* Report API

API design should follow database ownership boundaries.

Most APIs should require:

```text
workspace_id
```

---

# Future Backend Services

The database should support future backend services including:

* Signal Detection Service
* Evidence Collection Service
* AI Recommendation Service
* Notification Delivery Service
* Widget Rendering Service
* Report Generation Service
* Audit Logging Service
* Integration Sync Service
* Data Retention Service
* Worker Queue Service

Each service should own its operational logic.

The database should preserve shared state and historical records.

---

# Implementation Notes

V1 uses a relational database with one fixed baseline:

* MySQL for production
* MySQL for local development and integration testing
* MySQL tables for the V1 database job queue

PostgreSQL, SQLite, Redis, RabbitMQ, Kafka, Cloud Tasks, and managed queue services are not V1 baselines. They may only be considered as replaceable Future implementations under the Incremental Evolution strategy.
* UUID primary keys
* Timestamp fields
* Workspace-based isolation
* Explicit foreign keys for core relationships

The database should be designed so that Codex can generate:

* SQL migrations
* ORM models
* API DTOs
* Repository classes
* Backend services
* Seed data
* Unit tests

---

# Final Rule

Database specification must not change product strategy.

It must only make the frozen architecture executable.

Architecture defines what the system is.

Database defines how the system remembers it.
