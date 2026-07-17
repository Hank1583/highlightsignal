# 06_Recommendation_Database.md

# Recommendation Database

Version: v1.0

Status: Draft

Layer: Database Specification

Depends On:

* 01_Database_Overview
* 04_Signal_Database
* 05_Evidence_Database
* AI Recommendation Engine
* AI Decision Engine
* Architecture v1.0 Frozen

---

# Purpose

> V1 Alignment Patch: The Recommendation Domain also owns Human Review, formal Decision, and business-level Action records. Recommendation is never itself a Decision. Insight remains embedded analysis content and has no standalone V1 table.

The Recommendation database defines the decision layer of Highlight Signal.

A Recommendation represents one or more suggested actions generated from a Signal.

Recommendations may be produced by AI models, deterministic rules, or hybrid decision engines.

Every Recommendation should explain:

* What should be done
* Why it should be done
* How urgent it is
* What outcome is expected

Recommendations are actionable business objects rather than conversational responses.

---

# Domain Responsibility

The Recommendation domain is responsible for:

* Recommendation generation
* Action planning
* Priority
* Expected impact
* User decision tracking
* Recommendation lifecycle
* Recommendation history

The Recommendation domain is **not** responsible for:

* Evidence collection
* Signal detection
* Notification delivery
* Widget rendering

---

# Core Entities

```text id="l0o3wy"
recommendations

recommendation_actions

recommendation_status_history

recommendation_feedback
```

---

# Aggregate Structure

```text id="r7smu4"
Recommendation

├── Actions
├── Status History
├── User Feedback
├── Signal Reference
└── Evidence Reference
```

Recommendation is the Aggregate Root for decision execution.

---

# Entity Definition

---

## recommendations

Represents one decision generated from a Signal.

### Fields

| Field               | Type         | Required | Description               |
| ------------------- | ------------ | -------- | ------------------------- |
| id                  | UUID         | Yes      | Primary key               |
| workspace_id        | UUID         | Yes      | Workspace owner           |
| signal_id           | UUID         | Yes      | Related signal            |
| title               | VARCHAR(255) | Yes      | Recommendation title      |
| summary             | TEXT         | Yes      | Decision summary          |
| recommendation_type | VARCHAR(50)  | Yes      | Recommendation category   |
| priority            | INTEGER      | Yes      | Execution priority        |
| expected_impact     | VARCHAR(30)  | Yes      | Estimated business impact |
| confidence          | DECIMAL(5,2) | Yes      | Decision confidence       |
| ai_model            | VARCHAR(100) | No       | Generated model           |
| status              | VARCHAR(30)  | Yes      | Current status            |
| created_at          | TIMESTAMP    | Yes      | Generated time            |
| updated_at          | TIMESTAMP    | Yes      | Last update               |
| completed_at        | TIMESTAMP    | No       | Completion time           |

---

### Recommendation Types

```text id="uvl0md"
Optimize

Fix

Investigate

Monitor

Review

Upgrade

Ignore
```

---

### Status

```text id="tr92mn"
pending

accepted

in_progress

completed

dismissed

expired
```

---

## recommendation_actions

Represents executable actions belonging to a recommendation.

### Fields

| Field                | Type      |
| -------------------- | --------- |
| id                   | UUID      |
| recommendation_id    | UUID      |
| action_order         | INTEGER   |
| action_title         | VARCHAR   |
| action_description   | TEXT      |
| estimated_minutes    | INTEGER   |
| automation_supported | BOOLEAN   |
| created_at           | TIMESTAMP |

---

## recommendation_status_history

Tracks recommendation lifecycle changes.

### Fields

| Field              | Type      |
| ------------------ | --------- |
| id                 | UUID      |
| recommendation_id  | UUID      |
| previous_status    | VARCHAR   |
| new_status         | VARCHAR   |
| changed_by_user_id | UUID      |
| changed_by_service | VARCHAR   |
| reason             | TEXT      |
| created_at         | TIMESTAMP |

Status history is append-only.

---

## recommendation_feedback

Captures user feedback for learning and evaluation.

### Fields

| Field             | Type      |
| ----------------- | --------- |
| id                | UUID      |
| recommendation_id | UUID      |
| user_id           | UUID      |
| feedback_type     | VARCHAR   |
| rating            | SMALLINT  |
| comment           | TEXT      |
| created_at        | TIMESTAMP |

---

### Feedback Types

```text id="gr9xzy"
Helpful

Not Helpful

Incorrect

Already Done

Needs Review
```

---

# Relationships

```text id="f3oz6u"
Signal

↓

Recommendation

├── Actions
├── Status History
└── User Feedback
```

Evidence remains connected through Signal traceability.

---

## Cardinality

```text id="hf8vne"
Signal

↓

Many Recommendations

Recommendation

↓

Many Actions

Recommendation

↓

Many Status History Records

Recommendation

↓

Many Feedback Records
```

---

# Primary Keys

```text id="e6kdw9"
recommendations.id

recommendation_actions.id

recommendation_status_history.id

recommendation_feedback.id
```

---

# Foreign Keys

```text id="9lf1gt"
recommendations.workspace_id
→ workspaces.id
```

```text id="o6b0vb"
recommendations.signal_id
→ signals.id
```

```text id="meydbm"
recommendation_actions.recommendation_id
→ recommendations.id
```

```text id="iq7m4r"
recommendation_status_history.recommendation_id
→ recommendations.id
```

```text id="7ttcfr"
recommendation_feedback.recommendation_id
→ recommendations.id
```

```text id="ngo9qs"
recommendation_feedback.user_id
→ users.id
```

---

# Lifecycle

## Recommendation Generation

```text id="6u4e1x"
Evidence

↓

Signal

↓

Recommendation Created
```

---

## User Review

```text id="t85v3n"
Pending

↓

Accepted

↓

In Progress
```

---

## Completion

```text id="nr7m5b"
In Progress

↓

Completed
```

---

## Dismissal

```text id="ubzv1j"
Pending

↓

Dismissed
```

---

## Feedback Loop

```text id="z2sxgw"
Completed

↓

User Feedback

↓

AI Evaluation

↓

Future Model Improvement
```

---

# Index Strategy

## Workspace Query

```sql id="m4wj0a"
INDEX(workspace_id)
```

---

## Signal Lookup

```sql id="xn8q7u"
INDEX(signal_id)
```

---

## Status

```sql id="a1i5fk"
INDEX(status)
```

---

## Priority

```sql id="ws6l0o"
INDEX(priority DESC)
```

---

## Expected Impact

```sql id="k9o1pr"
INDEX(expected_impact)
```

---

## Feedback Search

```sql id="z5m7yh"
INDEX(user_id)

INDEX(feedback_type)
```

---

# Constraints

---

## Workspace Ownership

Every Recommendation belongs to exactly one workspace.

---

## Signal Ownership

Every Recommendation references one Signal.

---

## Confidence

Allowed range:

```text id="b8p4qx"
0

↓

100
```

---

## Action Order

Actions must be unique within a Recommendation.

Constraint:

```text id="ph2i5m"
recommendation_id

+

action_order
```

---

## History Preservation

Recommendation status transitions must never overwrite previous states.

Use append-only history.

---

## Feedback

One user may submit one feedback entry per recommendation.

Recommended constraint:

```sql id="gj8hqw"
UNIQUE(recommendation_id, user_id)
```

---

# Future APIs

```text id="rl7z4v"
Create Recommendation

Get Recommendation

List Recommendations

Accept Recommendation

Dismiss Recommendation

Complete Recommendation

List Actions

Update Action Status

Submit Feedback

Get Recommendation Timeline

Search Recommendations
```

---

# Future Backend Services

## Recommendation Engine

Generates recommendations from Signals.

---

## Action Planning Service

Produces executable action lists.

---

## Recommendation Ranking Service

Ranks recommendations by priority, confidence, and expected impact.

---

## Recommendation Lifecycle Service

Handles state transitions and completion.

---

## Feedback Learning Service

Aggregates user feedback to improve future recommendation quality.

---

## Recommendation Search Service

Supports filtering, ranking, and historical search.

---

# Implementation Notes

Recommended implementation:

```text id="e2n8cf"
UUID Primary Keys

Workspace Isolation

Append-Only Status History

Ordered Actions

JSONB Extension Metadata

Soft Archive
```

Optional future extension:

```sql id="v7r9bk"
metadata JSONB
```

Example:

```json id="j3m1zt"
{
  "estimated_roi": 18.5,
  "estimated_risk": "low",
  "automation_available": true,
  "agent_supported": true,
  "generated_by": "Recommendation Engine v2.3"
}
```

This allows richer AI decision metadata without schema migrations.

---

# Decision Flow

The Recommendation database transforms interpreted Signals into executable work.

```text id="u6k0lf"
Evidence

↓

Signal

↓

Recommendation

↓

Action

↓

User Decision

↓

Feedback

↓

AI Learning
```

This closes the decision loop between observation and continuous improvement.

---

# Integration with Future Agents

Recommendations are designed to support both human execution and autonomous AI agents.

Execution modes include:

```text id="n5v8sa"
Manual

Human Assisted

AI Assisted

Fully Automated
```

Future agents may claim executable actions directly from `recommendation_actions` while preserving the same lifecycle and audit history.

---

# Final Rule

Recommendations are the operational output of the Decision Engine.

Signals identify what matters.

Evidence proves why it matters.

Recommendations define what should happen next.

Every Recommendation should be explainable, traceable, measurable, and executable, allowing Highlight Signal to evolve from an analytics platform into an intelligent decision and execution platform.
