# 01_Frontend_Overview

Version: v1.0

Status: Stable

---

# Purpose

> V1 Alignment Patch: The frontend presents the Human Review flow but never makes the final permission decision or executes business rules. All formal Decisions and mutations pass through the PHP REST API. Autonomous Decision is outside V1.

Frontend Layer 定義 Highlight Signal 的使用者介面（User Interface）與使用者體驗（User Experience）。

Frontend 負責：

* User Interaction
* Data Presentation
* Navigation
* State Management
* API Communication

Frontend 不負責：

* Business Logic
* Database Access
* Background Processing
* AI Decision Engine

所有商業邏輯皆由 Backend 提供。

---

# Frontend Philosophy

Highlight Signal 採用：

Decision First

而不是：

Dashboard First

Frontend 的目的不是展示大量資訊。

而是：

協助使用者做出決策。

因此：

所有畫面皆圍繞著：

Signal

↓

Evidence

↓

Recommendation

↓

Action

展開。

---

# Design Principles

Frontend 遵循以下設計原則：

Simple

Information 應容易理解。

Consistent

所有 Module 保持一致操作方式。

Responsive

適用於 Desktop、Tablet 與 Mobile。

Fast

降低等待時間。

Accessible

降低使用門檻。

Modular

各 Module 可獨立演進。

---

# Frontend Responsibilities

Frontend 提供：

Presentation Layer

包含：

* Page Rendering
* Navigation
* Component Rendering
* Form Interaction
* API Request
* State Management

Frontend 不處理：

* Recommendation Calculation
* Evidence Analysis
* Queue Processing
* Permission Decision
* Database Transaction

上述皆由 Backend 完成。

---

# Technology Stack

V1 採用：

Framework

* Next.js

Runtime

* React

Deployment

* OpenNext
* Cloudflare Workers

Communication

* REST API

Language

* TypeScript

Styling

* Tailwind CSS

未來可逐步升級，

不影響 Product Architecture。

---

# Architecture Position

Frontend 位於：

```text id="a9k4nx"
Browser

↓

Frontend

↓

Backend API

↓

Database
```

Frontend 不直接連線 Database。

所有資料皆透過 API 存取。

---

# Frontend Layers

Frontend 分為：

Application

↓

Layout

↓

Page

↓

Module

↓

Component

↓

Shared Component

各 Layer 保持單一責任。

---

# Rendering Strategy

V1 採用：

Server Side Rendering（SSR）

搭配：

Client-side Interaction

Rendering 原則：

SEO

↓

SSR

Interactive UI

↓

Client Component

Static Resource

↓

Static Generation

依頁面需求選擇最佳 Rendering Strategy。

---

# User Interface Model

Highlight Signal UI：

Workspace

↓

Dashboard

↓

Signal

↓

Evidence

↓

Recommendation

↓

Action

使用者始終圍繞同一套決策流程操作。

---

# Navigation Philosophy

Navigation 採用：

Workspace-centric

每個 Workspace

擁有自己的：

* Dashboard
* Signal
* Evidence
* Recommendation
* Notification
* Settings

降低跨模組切換成本。

---

# Data Flow

Frontend 採用：

Unidirectional Data Flow

```text id="x7d5me"
User

↓

Frontend

↓

API

↓

Backend

↓

Response

↓

UI Update
```

資料更新皆經由 API。

避免：

直接修改 Local Data。

---

# State Management

Frontend State 分為：

UI State

例如：

* Sidebar
* Dialog
* Loading

Application State

例如：

* User
* Workspace
* Session

Server State

例如：

* Signal
* Recommendation
* Notification

不同 State

採不同管理方式。

---

# Component Design

UI Component

遵循：

Reusable

Composable

Independent

Shared Component

不應依賴：

Business Module。

降低耦合。

---

# API Communication

所有資料皆透過：

REST API

取得。

```text id="n2u8zp"
Frontend

↓

HTTPS

↓

Backend API
```

禁止：

Frontend

直接連線 Database。

---

# Authentication

Frontend

負責：

* Login Flow
* Logout
* Session Detection
* Token Management

Permission

由 Backend 驗證。

避免：

Frontend 作為權限依據。

---

# Error Handling

Frontend 應提供：

* Loading State
* Empty State
* Error State
* Retry Action

避免：

空白畫面。

提升使用體驗。

---

# Performance

Frontend 優先考量：

* Fast Initial Load
* Lazy Loading
* Code Splitting
* Route Optimization
* Image Optimization

保持操作流暢。

---

# Security

Frontend

不得保存：

* Database Password
* Secret Key
* Internal Token

所有敏感資訊：

皆保留於 Backend。

Frontend 僅保存：

必要的 Session 資訊。

---

# Accessibility

Frontend 應考量：

* Keyboard Navigation
* Readable Typography
* Color Contrast
* Screen Size Adaptation

提升不同裝置與使用者的可用性。

---

# Future Evolution

未來可逐步導入：

UI

* Design System
* Component Library

Performance

* Partial Prerendering
* Edge Rendering Optimization

Architecture

* Plugin-based UI
* Module Extension

Application Architecture

保持一致。

---

# Relationship with Other Documents

本文件描述：

Frontend Layer。

相關文件：

Architecture

* System Architecture

Backend

* Business Logic

API

* REST Contract

Infrastructure

* Frontend Deployment

Layout Framework

* UI Structure

Component System

* UI Components

各文件分別描述不同層級。

---

# Frontend Documents

Frontend 章節包含：

1. Frontend Overview

2. Routing Architecture

3. Layout Framework

4. State Management

5. API Integration

6. Component System

7. Widget System

8. User Experience

9. Theme Design System

10. Frontend Evolution

---

# Summary

Frontend 是 Highlight Signal 的 Presentation Layer。

負責：

* User Interface
* Navigation
* State Management
* API Communication
* User Experience

V1 採用 Next.js、React、TypeScript、Tailwind CSS 與 Cloudflare Workers 建構現代化 Web Frontend，透過模組化設計、SSR 與統一 API 溝通模式，提供快速、穩定且易於維護的使用體驗，同時保留未來演進至更大型前端架構的能力，而不需改變既有 Product Architecture。
