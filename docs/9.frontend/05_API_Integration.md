# 05_API_Integration

Version: v1.0

Status: Stable

---

# Purpose

> V1 Alignment Patch: HTTPS REST through the PHP Backend is the only V1 business data path. Frontend code does not call Queue workers, databases, or external provider secrets directly.

API Integration 定義 Highlight Signal Frontend 與 Backend API 的整合方式。

Frontend 所有資料皆透過 API 存取。

API Integration 負責：

* API Communication
* Request Lifecycle
* Response Processing
* Error Handling
* Authentication
* Data Synchronization

API Contract

由 API Specification 定義。

本文件描述：

Frontend 如何使用 API。

---

# Design Philosophy

API Integration 採用：

Backend First

↓

Stateless

↓

Consistent

↓

Replaceable

Frontend 不直接操作 Database。

所有商業邏輯皆交由 Backend。

---

# Communication Architecture

Frontend 與 Backend：

```text id="g8p4nd"
Browser

↓

Frontend

↓

HTTPS REST API

↓

Backend

↓

Database
```

Frontend 永遠透過 HTTPS 與 Backend 溝通。

---

# Communication Principles

所有 API

遵循：

* HTTPS Only
* Stateless
* JSON Payload
* REST Convention
* Version Compatible

保持一致的整合方式。

---

# API Lifecycle

每一次 API Request：

```text id="u2m7rx"
User Action

↓

Request

↓

Backend

↓

Response

↓

State Update

↓

UI Render
```

所有畫面更新，

皆由 API Response 驅動。

---

# Request Flow

Frontend

負責：

* Build Request
* Send Request
* Loading State
* Error Handling

Backend

負責：

* Validation
* Authentication
* Business Logic
* Database
* Response

職責明確分離。

---

# Response Processing

API Response：

```text id="c5z1kb"
Response

↓

Validation

↓

Update State

↓

Refresh UI
```

Frontend

不修改：

Business Rule。

---

# Data Synchronization

所有正式資料：

以 Backend 為準。

例如：

Signal

↓

Backend

↓

Frontend

Recommendation

↓

Backend

↓

Frontend

Frontend 不保存永久版本。

---

# API Categories

Frontend 使用：

Authentication API

Workspace API

Signal API

Evidence API

Recommendation API

Notification API

Widget API

Audit API

各 Module

透過對應 API 溝通。

---

# Authentication Flow

登入流程：

```text id="m4q9ae"
Login

↓

Authentication API

↓

Token

↓

Session State

↓

Authenticated
```

權限驗證：

由 Backend 完成。

---

# Authorized Request

登入後：

每次 Request

皆帶入：

Authentication Information。

```text id="y3j8lt"
Frontend

↓

Token

↓

Backend

↓

Authorization

↓

Response
```

Frontend

不自行判斷最終權限。

---

# Loading Strategy

API Request

應提供：

* Loading Indicator
* Skeleton
* Progress（Future）

避免：

使用者等待時無任何回饋。

---

# Error Handling

API Error

分為：

Client Error

例如：

* Validation Error
* Unauthorized
* Forbidden

Server Error

例如：

* Internal Error
* Service Unavailable

Frontend

應提供：

適當錯誤訊息。

---

# Retry Strategy

暫時性錯誤：

可提供：

Retry

例如：

Network Error

↓

Retry Request

避免：

重複送出寫入操作。

---

# Timeout Handling

API Timeout：

Frontend

應：

* 停止 Loading
* 顯示 Timeout Message
* 提供 Retry

避免：

永久等待。

---

# Concurrent Requests

多個 API

可平行執行。

例如：

Dashboard

↓

Signal API

Recommendation API

Notification API

Widget API

提升：

Initial Loading Speed。

---

# Request Cancellation

若使用者：

離開頁面

或：

切換 Workspace

應取消：

不必要 Request。

避免：

過期資料更新 UI。

---

# Pagination

大量資料：

應使用：

Pagination

或：

Cursor（Future）

避免：

一次載入全部資料。

---

# API Version

Frontend

不依賴：

Internal Implementation。

僅依賴：

API Contract。

Backend 可調整內部架構，

只要 API 保持相容。

---

# File Upload

File Upload

採用：

HTTPS Upload API。

Frontend

負責：

* File Selection
* Upload Progress
* Result Display

Backend

負責：

* Validation
* Storage
* Processing

---

# Security

API Communication

必須：

HTTPS

所有敏感資料：

不得放入：

* URL
* Query Parameter

Authentication

不得儲存於：

Public Configuration。

---

# Performance

API Integration

應降低：

* Duplicate Request
* Unnecessary Refresh
* Over-fetching

必要時：

使用 Cache

改善讀取速度。

---

# Offline Strategy

V1

不提供：

Offline Mode。

若 API 無法連線：

應提示：

Network Error。

未來可加入：

Offline Cache。

---

# Future Evolution

未來可導入：

Communication

* GraphQL
* Server Actions
* Streaming Response

Performance

* Request Deduplication
* Background Refresh
* Incremental Fetch

Application Architecture

保持一致。

---

# Relationship with Other Documents

本文件描述：

Frontend API Integration。

相關文件：

API Specification

* API Contract

Backend

* API Implementation

State Management

* Server State

Routing Architecture

* Route Data Loading

Infrastructure

* Network Communication

各文件共同構成完整的前後端整合架構。

---

# Summary

API Integration 定義 Highlight Signal Frontend 與 Backend API 的整合模式。

V1 採用 HTTPS REST API 作為唯一資料交換方式，Frontend 專注於 Request、State 與 UI 更新，Backend 負責商業邏輯、資料驗證與權限控制。

透過一致的 API Lifecycle、Stateless Communication 與 Backend First 設計，建立可維護、可擴充且技術無關的整合架構，並保留未來演進至 GraphQL、Streaming 或其他通訊模式的彈性，而不影響既有 Product Architecture。
