# ADR-005 REST API Architecture

Document

05_ADR_005_REST_API_Architecture.md

Version: v1.0

Status: Accepted

Date: 2026-07-02

---

# Title

Adopt REST API as the Primary Communication Architecture

---

# Status

Accepted

---

# Context

Highlight Signal 採用前後端分離架構。

主要元件包括：

* Frontend
* Backend
* Worker
* Scheduler
* Future AI Services

所有元件皆需要：

* 穩定通訊
* 清楚介面
* 低耦合
* 易於擴充

因此需要建立一致的 API Communication Model。

---

# Problem

不同元件之間若採用：

直接 Database 存取

或：

Module 間直接呼叫

容易造成：

* 高度耦合
* 難以維護
* 權限難管理
* 無法獨立演進

需要建立統一的 Service Boundary。

---

# Decision

Highlight Signal 採用：

REST API

作為主要通訊架構。

所有外部與內部服務：

皆透過：

HTTPS REST API

交換資料。

Backend

成為唯一的 Business Entry Point。

---

# Architecture

Communication Model：

```text id="api7mx"
Frontend

↓

REST API

↓

Backend

↓

Database
```

Future：

```text id="api4tw"
Frontend

↓

REST API

↓

Backend

├── Worker
├── AI Service
└── External Service
```

API

作為所有服務的共同介面。

---

# Rationale

採用 REST API 的原因：

Mature Standard

REST 已廣泛使用。

Simple

容易理解。

Stateless

方便水平擴充。

Language Independent

Frontend、Worker

皆可使用。

Easy Testing

容易：

* Debug
* Mock
* Integration Test

符合：

Modular Architecture。

---

# Consequences

優點：

* 架構清楚
* 容易除錯
* 模組低耦合
* 技術無關
* 易於擴充

缺點：

* 多次 Request
* 固定資料結構
* 部分畫面可能 Over-fetch

上述限制：

目前可接受。

---

# Alternatives Considered

## GraphQL

優點：

* Client 可自由查詢
* 降低 Over-fetch

缺點：

* 架構較複雜
* Cache 較困難
* 權限控制複雜
* 不符合目前產品規模

Future

可局部導入。

---

## gRPC

優點：

* 高效能
* 型別安全

缺點：

* Browser 支援有限
* Debug 成本較高
* 不適合作為主要 Web API

---

## Direct Database Access

優點：

* 開發快速

缺點：

* 無 Business Boundary
* 無權限控制
* 高耦合

不採用。

---

## Server Actions Only

優點：

* Next.js 整合佳
* 程式碼較少

缺點：

* 與 Frontend Framework 綁定
* 不利 Worker 與未來多產品共用

不作為主要通訊模式。

---

# Architectural Impact

REST API

成為：

Application Boundary。

影響：

Frontend

* API Integration

Backend

* Controller
* Service

Infrastructure

* HTTPS

Worker

* Internal API（Future）

API Contract

保持穩定。

---

# API Boundary

所有 Module：

皆透過 API 溝通。

例如：

Workspace API

Signal API

Evidence API

Recommendation API

Notification API

Module

不得直接跨層操作。

---

# Versioning

API

應保持：

Backward Compatibility。

新增功能：

優先：

擴充 Endpoint。

避免：

破壞既有 Client。

---

# Security

所有 API：

必須：

HTTPS。

所有 Request：

經過：

Authentication

Authorization

Validation

Frontend

不得直接操作 Database。

---

# Scalability

REST API

可支援：

* Frontend
* Mobile App（Future）
* CLI（Future）
* Worker（Future）
* Third-party Integration（Future）

Communication Interface

保持一致。

---

# Evolution Strategy

未來若：

特定場景需要：

* Flexible Query
* Realtime
* Streaming

可局部加入：

GraphQL

Server Actions

Streaming API

但：

REST API

仍為主要通訊方式。

---

# Future Evolution

V1

REST API

↓

V2

REST API + Streaming

↓

V3

REST API + GraphQL（Selective）

↓

Enterprise

Multiple API Gateway

Application Architecture

保持一致。

---

# References

API

* API Overview
* API Specification

Frontend

* API Integration

Backend

* Backend Overview

ADR

* ADR-001 Project Architecture
* ADR-002 Workspace-centric Architecture

---

# Summary

Highlight Signal 採用 REST API 作為主要通訊架構。

此決策建立 Frontend、Backend、Worker 與未來服務之間的一致介面，使各模組能以低耦合方式協作，並維持清楚的 Business Boundary。

REST API 提供成熟、穩定且技術無關的通訊模式，符合 V1 的開發效率與維護需求，同時保留未來導入 GraphQL、Streaming 或其他 API 技術的彈性，而不改變整體 Product Architecture。
