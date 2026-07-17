# Highlight Signal Documentation

Version: v1.2

Status: Stable

Last Updated: 2026-07-02

---

# V1 Alignment Authority

V1 的技術規格、Domain Flow、模組邊界與實作選型，統一以：

[`00_Technical_Specification_Alignment_v1.2.md`](./00_Technical_Specification_Alignment_v1.2.md)

為最高對齊準則。

若其他文件與 Alignment v1.2 發生衝突，應以 Alignment v1.2 為準，並將該文件視為等待 Alignment Patch，而不是建立第二套平行架構。

固定 V1 Baseline：

```text
Workspace-centric
Human-in-the-loop
PHP Modular Monolith
MySQL Production Database
MySQL Database Job Queue
HTTPS REST API
Next.js Frontend on Cloudflare
Google Apps Script Trigger Only
```

---

# Overview

Highlight Signal Documentation 定義整個產品的：

* Product Vision
* Product Concepts
* Architecture
* Database
* API
* Backend
* Infrastructure
* Frontend
* Architecture Decisions

本文件作為整套 Documentation 的入口。

---

# Documentation Philosophy

Highlight Signal Documentation 採用：

Business

↓

Concept

↓

Architecture

↓

Implementation

↓

Decision

Documentation 不只是程式文件。

而是產品知識（Product Knowledge）與架構知識（Architecture Knowledge）的完整集合。

---

# Reading Guide

建議閱讀順序：

第一次閱讀：

```text
Technical Specification Alignment v1.2

↓

Handbook

↓

Concepts

↓

Framework

↓

Architecture
```

開發 Backend：

```text
Architecture

↓

Database

↓

API

↓

Backend
```

開發 Frontend：

```text
Architecture

↓

API

↓

Frontend
```

部署系統：

```text
Infrastructure

↓

Backend

↓

Deployment
```

理解設計原因：

```text
ADR
```

---

# Documentation Structure

## 1. Handbook

定義產品願景、設計理念與商業定位。

包含：

* Product Vision
* Product Philosophy
* Product Principles
* Business Layer
* Decision First Experience
* AI Recommendation Engine
* Mentor Product Research

回答：

> Why does Highlight Signal exist?

---

## 2. Concepts

定義產品核心概念。

包含：

* Workspace
* Signal
* Evidence
* Recommendation
* Notification
* Widget

回答：

> What are the core concepts?

---

## 3. Framework

定義各 Framework 如何協同運作。

包含：

* AI Core Framework
* Signal Framework
* Workspace Framework
* Module Framework
* Evidence Framework
* Notification Framework
* Widget Framework
* Data Flow Framework
* Permission Framework

回答：

> How do the concepts work together?

---

## 4. Architecture（Stable Core / Alignment Patch in Progress）

定義整個系統的邏輯架構。

包含：

* Core Architecture
* Information Architecture
* Module Architecture
* Workspace Architecture

Architecture 為 Stable Core。

除重大版本外不應頻繁修改。

回答：

> How is the system designed?

---

## 5. Database

定義資料模型。

包含：

* Schema
* Table
* Relationship
* Index
* Data Model

回答：

> How is data organized?

---

## 6. API

定義所有 API Contract。

包含：

* Authentication
* Workspace
* Signal
* Evidence
* Recommendation
* Notification
* Widget
* Audit Log

回答：

> How do systems communicate?

---

## 7. Backend

定義 Backend Implementation。

包含：

* Service
* Repository
* Queue
* Worker
* Notification

回答：

> How is the backend implemented?

---

## 8. Infrastructure

定義部署與維運架構。

包含：

* Cloudflare
* PHP Hosting
* Database
* Job Queue
* Scheduler
* Monitoring
* Deployment

回答：

> How is the system deployed?

---

## 9. Frontend

定義 Frontend Implementation。

包含：

* Routing
* Layout
* State Management
* Component System
* Widget System
* User Experience
* Design System

回答：

> How is the user interface implemented?

---

## 10. ADR

Architecture Decision Records。

記錄：

所有重要架構決策。

例如：

* Modular Monolith
* Workspace-centric
* PHP Backend
* Database Queue
* REST API
* Decision-first UX

回答：

> Why was this architecture chosen?

---

# Stable vs Evolvable

Documentation 分為：

Stable Core

* Handbook
* Concepts
* Framework
* Architecture
* ADR

Evolvable

* Database
* API
* Backend
* Infrastructure
* Frontend

Architecture 保持穩定。

Implementation 持續演進。

---

# Product Architecture

```text
Business

↓

Concept

↓

Framework

↓

Architecture

↓

Implementation

├── Database
├── API
├── Backend
├── Infrastructure
└── Frontend

↓

ADR
```

所有 Implementation

皆建立於相同 Architecture。

---

# Design Principles

Highlight Signal 遵循：

* Decision First
* Workspace-centric
* Modular Monolith
* Stable Core
* Incremental Evolution
* API First
* Simple First

所有新功能皆應符合上述原則。

---

# Intended Audience

本 Documentation 適用於：

* Product Owner
* Software Architect
* Backend Engineer
* Frontend Engineer
* AI Engineer
* DevOps Engineer
* QA Engineer
* Future Contributors

亦可作為：

AI Coding Assistant

的專案知識來源。

---

# Maintenance Policy

Documentation 應與產品同步更新。

Architecture

僅於重大版本變更。

Implementation

依功能更新。

ADR

於重要架構決策後新增。

保持 Documentation 與實際系統一致。

---

# Version

Current Version

v1.2

Status

Stable

Architecture

Frozen

Implementation

Continuous Evolution

---

# Summary

Highlight Signal Documentation 是產品、架構、實作與設計決策的完整知識庫。

Documentation 採用由 Business 到 Architecture，再到 Implementation，最後以 ADR 記錄決策的分層結構，建立長期可維護、可擴充且技術無關的知識體系。

所有未來功能、模組與技術演進，皆應建立於本 Documentation 所定義的 Stable Core Architecture 之上。
