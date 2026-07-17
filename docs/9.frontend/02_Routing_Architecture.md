# 02_Routing_Architecture

Version: v1.0

Status: Stable

---

# Purpose

Routing Architecture 定義 Highlight Signal Frontend 的頁面路由、URL 結構、導航規則與權限入口。

Routing 的目的不是單純切換頁面。

而是將使用者導向正確的：

Workspace

↓

Module

↓

Signal

↓

Evidence

↓

Recommendation

↓

Action

---

# Routing Philosophy

Highlight Signal 採用：

Workspace-centric Routing

所有主要功能皆圍繞 Workspace 展開。

使用者進入系統後，

應先進入 Workspace Context，

再操作各模組功能。

---

# Design Principles

Routing 遵循：

Clear

URL 應清楚表達目前位置。

Stable

URL 不應頻繁變動。

Permission-aware

不可存取的頁面應被攔截。

Module-based

每個 Module 擁有自己的路由區域。

Extensible

未來可加入新 Module。

---

# Routing Position

Frontend Routing 位於：

```text id="f9a3nq"
Browser

↓

Frontend Router

↓

Page

↓

Module

↓

API
```

Routing 不處理 Business Logic。

Routing 只決定：

使用者看到哪一個畫面。

---

# Route Structure

V1 Route Structure：

```text id="x6q8la"
/

├── /login
├── /register
├── /workspaces
├── /workspaces/[workspaceId]
├── /workspaces/[workspaceId]/dashboard
├── /workspaces/[workspaceId]/signals
├── /workspaces/[workspaceId]/signals/[signalId]
├── /workspaces/[workspaceId]/evidence
├── /workspaces/[workspaceId]/recommendations
├── /workspaces/[workspaceId]/recommendations/[recommendationId]
├── /workspaces/[workspaceId]/notifications
└── /workspaces/[workspaceId]/settings
```

所有核心功能皆掛載於 Workspace 下。

---

# Public Routes

Public Routes 不需要登入。

包含：

* Home
* Login
* Register
* Forgot Password
* Public Landing Page

Public Routes 不應存取：

* Workspace Data
* User Data
* Business Data

---

# Protected Routes

Protected Routes 需要登入。

包含：

* Workspaces
* Dashboard
* Signals
* Evidence
* Recommendations
* Notifications
* Settings

未登入使用者進入 Protected Routes：

導向 Login。

---

# Workspace Routes

Workspace Routes 以：

```text id="7p42qv"
/workspaces/[workspaceId]
```

作為主要 Context。

所有 Workspace 內資料皆依據：

workspaceId

載入。

---

# Dashboard Route

Dashboard Route：

```text id="e0zrjd"
/workspaces/[workspaceId]/dashboard
```

負責呈現：

* Workspace Overview
* Key Signals
* Recommendations
* Notifications
* Widgets

Dashboard 是決策入口。

不是資料倉庫。

---

# Signal Routes

Signal List：

```text id="kvc9th"
/workspaces/[workspaceId]/signals
```

Signal Detail：

```text id="lw2yxa"
/workspaces/[workspaceId]/signals/[signalId]
```

Signal Route 負責：

* Signal List
* Signal Detail
* Signal Status
* Related Evidence
* Recommendation Entry

---

# Evidence Routes

Evidence Route：

```text id="a4rs1n"
/workspaces/[workspaceId]/evidence
```

Evidence 不一定需要成為使用者主要入口。

但需支援：

* Evidence List
* Evidence Detail（Future）
* Evidence Source
* Evidence Trace

---

# Recommendation Routes

Recommendation List：

```text id="d1ukbh"
/workspaces/[workspaceId]/recommendations
```

Recommendation Detail：

```text id="y22tca"
/workspaces/[workspaceId]/recommendations/[recommendationId]
```

Recommendation Route 是決策結果的核心呈現區。

---

# Notification Routes

Notification Route：

```text id="ew5kfh"
/workspaces/[workspaceId]/notifications
```

負責：

* System Notification
* Signal Notification
* Recommendation Notification
* Action Reminder

---

# Settings Routes

Settings Route：

```text id="q270k7"
/workspaces/[workspaceId]/settings
```

負責：

* Workspace Settings
* User Management
* Permission
* Integration
* Notification Settings

---

# Route Guards

所有 Protected Routes

皆需經過 Route Guard。

Route Guard 負責：

* Authentication Check
* Workspace Access Check
* Permission Check
* Redirect

但最終權限仍由 Backend 驗證。

Frontend Guard 僅改善 UX。

---

# Authentication Redirect

未登入使用者：

```text id="fm4h0a"
Protected Route

↓

Login
```

登入後：

```text id="zwkqob"
Login

↓

Original Requested Route
```

若無指定來源：

導向 Workspace List。

---

# Permission Routing

若使用者無權限：

```text id="tkvc64"
Route Request

↓

Permission Check

↓

403 Page
```

或導向：

Workspace Home。

避免使用者看到未授權資料。

---

# Default Route

登入後預設進入：

```text id="xj00ib"
/workspaces
```

若使用者只有一個 Workspace：

可導向：

```text id="x5yjzn"
/workspaces/[workspaceId]/dashboard
```

提升操作效率。

---

# Route Naming Convention

路由命名採用：

* Lowercase
* Plural Resource
* Stable URL
* Meaningful Segment

例如：

```text id="w5tnhi"
/workspaces/[workspaceId]/signals/[signalId]
```

避免：

```text id="cuxm5u"
/ws/123/sig/456
```

URL 應可讀。

---

# Module Routing

每個 Module 擁有自己的 Route Segment。

例如：

Signal Module

```text id="i3lt9n"
/signals
```

Recommendation Module

```text id="ld9h1v"
/recommendations
```

未來新增 Module 時，

不影響既有路由。

---

# Nested Routing

Workspace 內部採用 Nested Routing。

```text id="pvxecd"
/workspaces/[workspaceId]

↓

dashboard
signals
evidence
recommendations
notifications
settings
```

共用：

* Workspace Layout
* Sidebar
* Header
* Permission Context

---

# URL as State

URL 應保存重要頁面狀態。

例如：

* Current Workspace
* Current Module
* Current Entity
* Filter（Future）
* Sort（Future）

避免使用者重新整理後遺失核心位置。

---

# Query Parameters

Query Parameters 用於暫時性 UI State。

例如：

```text id="zf1mrv"
/signals?status=active&type=seo
```

適合：

* Filter
* Search
* Sort
* Pagination

不適合：

* Secret
* Token
* Sensitive Data

---

# Error Routes

系統應提供：

* 404 Not Found
* 403 Forbidden
* 500 Error
* Maintenance Page（Future）

避免使用者遇到空白頁。

---

# Loading Routes

Route Loading 應提供：

* Skeleton
* Loading Indicator
* Suspense Boundary

避免切換頁面時閃爍或空白。

---

# SEO Routes

Public Routes

可支援 SEO。

Protected Routes

不以 SEO 為主要目標。

Dashboard 與 Workspace Data

不應被搜尋引擎索引。

---

# Future Routing Evolution

未來可加入：

* Organization Route
* Team Route
* Billing Route
* Integration Route
* Admin Route
* Public Report Route

路由結構仍維持 Workspace-centric。

---

# Relationship with Other Documents

本文件描述：

Frontend Routing。

相關文件：

Frontend Overview

* Frontend Layer

Layout Framework

* Layout Structure

State Management

* Route State

API Integration

* Route-based Data Fetching

Permission Framework

* Permission-aware Routing

各文件分工明確。

---

# Summary

Routing Architecture 定義 Highlight Signal Frontend 的頁面結構與導航規則。

V1 採用 Workspace-centric Routing，使所有核心功能皆圍繞 Workspace 展開，並透過 Protected Routes、Route Guards、Nested Routing 與穩定 URL 結構，建立清楚、可維護且可擴充的前端路由架構。

Routing 不承擔 Business Logic，而是將使用者導向正確的操作情境，使 Signal、Evidence、Explanation、Business Impact、Recommendation、Human Review、Decision 與 Action 能在一致的 Workspace Context 下運作。
