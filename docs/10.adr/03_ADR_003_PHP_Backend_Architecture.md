# ADR-003 PHP Backend Architecture

Document

03_ADR_003_PHP_Backend_Architecture.md

Version: v1.0

Status: Accepted

Date: 2026-07-02

---

# Title

Adopt PHP as the Primary Backend Runtime for V1

---

# Status

Accepted

---

# Context

Highlight Signal V1 的目標為：

建立一套可正式營運的 SaaS Platform。

Backend 必須提供：

* REST API
* Authentication
* Workspace Management
* Signal Processing
* Recommendation Service
* Notification Service
* Database Access

同時需要：

* 快速開發
* 穩定部署
* 低維護成本
* 可逐步演進

---

# Problem

Highlight Signal 的開發模式：

* 單人開發
* 快速迭代
* MVP 優先
* 有限 Infrastructure 成本

若一開始採用：

Container

↓

Cloud Run

↓

Microservices

將增加：

* 部署成本
* 維護成本
* 基礎設施複雜度

Backend Runtime

需要符合產品現階段需求。

---

# Decision

Alignment Patch v1.2: PHP Modular Monolith is the only V1 primary backend implementation. Python and Cloud Run may be introduced only as Future workers or extracted services behind stable interfaces.

Highlight Signal V1 採用：

PHP

作為 Primary Backend Runtime。

負責：

* REST API
* Business Logic
* Authentication
* Database Access
* Queue Management
* Notification

AI、Background Processing

未來可由其他 Runtime 補充。

---

# Rationale

採用 PHP 的原因：

成熟穩定

PHP 已廣泛應用於 Web Backend。

Shared Hosting 支援

可直接部署。

無須：

* Container
* Kubernetes
* Cloud Run

Deployment 簡單

FTP 即可更新。

Maintenance Cost 低

適合快速迭代。

與 MySQL 整合成熟。

符合 V1：

Simple First

Design Philosophy。

---

# Consequences

優點：

* 部署快速
* 維護容易
* 成本低
* 生態成熟
* Shared Hosting 可直接執行
* 適合 SaaS MVP

缺點：

* 長時間背景工作能力有限
* 不適合作為 AI Runtime
* 水平擴充能力有限

上述限制：

可透過 Worker Architecture 解決。

---

# Alternatives Considered

## Java

優點：

* 高效能
* 適合大型系統
* 生態成熟

缺點：

* 部署成本較高
* Shared Hosting 支援有限
* 對 V1 而言過於重量級

---

## Python

優點：

* AI 生態完整
* Machine Learning 支援佳
* 適合 Background Processing

缺點：

* Web Runtime 部署成本較高
* Shared Hosting 支援有限
* 對一般 CRUD API 無明顯優勢

Python 更適合作為：

AI Worker。

---

## Node.js

優點：

* JavaScript 生態完整
* 前後端一致

缺點：

* 需額外 Runtime
* 對目前團隊無明顯優勢
* 部署方式與既有 Infrastructure 不一致

---

# Architectural Impact

PHP 作為：

Primary Backend。

影響：

Frontend

* REST API

Database

* MySQL

Infrastructure

* Shared Hosting
* FTP Deployment

Scheduler

* Google Apps Script

Worker

* Database Job Queue

Application Architecture

保持不變。

---

# Evolution Strategy

Backend 採用：

Polyglot Architecture。

例如：

```text id="ev3qtm"
Frontend

↓

PHP API

├── Authentication
├── Workspace
├── Signal
├── Recommendation
└── Notification

↓

Database Queue

↓

Python Worker（Future）

↓

AI Processing
```

PHP

不需要負責所有工作。

---

# Migration Strategy

未來：

可逐步新增：

* Python Worker
* Cloud Run Service
* AI Service

甚至：

Java Service

各 Runtime

可共同存在。

Primary API

仍維持：

PHP。

---

# Future Evolution

V1

PHP Backend

↓

V2

PHP + Python Worker

↓

V3

Hybrid Runtime

↓

Cloud Native

Application Architecture

保持一致。

無需重新設計。

---

# References

Backend

* Backend Overview

Infrastructure

* PHP Hosting Infrastructure
* Job Queue Infrastructure

Architecture

* Core Framework

ADR

* ADR-001 Project Architecture

---

# Summary

Highlight Signal V1 採用 PHP 作為 Primary Backend Runtime，而非將 PHP 視為唯一技術選擇。

此決策基於產品現階段對快速開發、低部署成本與穩定營運的需求，使系統能在 Shared Hosting 環境下提供完整 REST API 與商業邏輯。

同時透過 Modular Architecture 與 Job Queue 設計，保留未來導入 Python Worker、Cloud Run 或其他 Runtime 的彈性，使 Backend 能以漸進方式演進，而無須重建整個系統。
