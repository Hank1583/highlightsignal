# 01_Infrastructure_Overview

Version: v1.0

Status: Stable

---

# Purpose

> V1 Alignment Patch: MySQL is the only V1 production relational database and database job queue store. PHP Shared Hosting is the primary backend runtime, Cloudflare is the edge/frontend platform, and Google Apps Script only triggers authenticated cron endpoints.

Infrastructure Layer 定義 Highlight Signal 的實際部署方式、系統運行環境、服務組成以及未來演進方向。

本章並不改變 Product Architecture。

Architecture 描述的是：

> 系統應該如何設計（How the system is designed）

Infrastructure 描述的是：

> 系統目前如何部署（How the system is deployed）

因此 Infrastructure 可以依照產品版本持續演進，而不影響 Core Architecture。

---

# Infrastructure Principles

Highlight Signal 採用：

> Simple First
>
> Cost Effective
>
> Incremental Evolution

初期優先考量：

* 快速部署
* 穩定運行
* 維護成本低
* 容易除錯
* 可逐步升級

而非一開始導入大型雲端架構。

---

# Design Philosophy

Infrastructure 採取：

Business First

↓

Architecture

↓

Backend

↓

Infrastructure

Infrastructure 永遠服務於產品。

不是因為有 Kubernetes 就使用 Kubernetes。

不是因為 Cloud Run 很新就全部搬遷。

只有在：

* 成本
* 效能
* 維護性
* 擴充性

達到升級條件時，

Infrastructure 才會演進。

---

# Infrastructure Layers

Highlight Signal Infrastructure 分為數個層級：

```
Users

↓

Cloudflare

↓

Frontend

↓

Backend API

↓

Database

↓

Background Worker

↓

External Services
```

各層彼此保持低耦合。

---

# Current V1 Infrastructure

目前 V1 使用：

Frontend

* Next.js
* OpenNext
* Cloudflare Workers

Backend

* PHP
* Shared Hosting

Database

* MySQL

Queue

* Database Job Queue

Worker

* Local PHP Worker

Scheduler

* Google Apps Script

Network

* Cloudflare DNS
* Cloudflare SSL
* Cloudflare CDN

Storage

* MySQL

Notification

* Email

此架構符合：

* 成本低
* 部署快速
* 維護容易
* 已驗證可正式運行

---

# Why PHP First

V1 Backend 採用 PHP。

原因包括：

## Shared Hosting 成本最低

PHP 可直接部署於共享主機。

無需：

* VM
* Container
* Kubernetes
* Cloud Run

即可提供 API。

---

## 成熟穩定

PHP 已具有成熟：

* Session
* Database
* REST API
* Email
* 檔案管理

適合作為 SaaS MVP。

---

## 維護成本低

PHP：

FTP Upload

↓

立即部署

無需：

* Docker
* Image Build
* Registry

適合小型團隊快速迭代。

---

# Asynchronous Architecture

Highlight Signal 所有耗時工作：

例如：

* Website Scan
* Secret Scan
* AI Analysis
* Report Generation

皆採用：

API

↓

Database Queue

↓

Worker

↓

Result

避免：

Request Timeout

以及：

同步等待。

---

# Queue Architecture

V1 Queue：

```
API

↓

Insert Job

↓

MySQL Queue

↓

Worker Polling

↓

Processing

↓

Completed
```

未使用：

* Redis
* RabbitMQ
* Kafka

原因：

目前 Database Queue 已可滿足需求。

---

# Scheduling

排程工作採用：

Google Apps Script

↓

HTTP Request

↓

PHP Cron Endpoint

↓

Worker Trigger

優點：

* 免費
* 容易管理
* 不需 Server Cron
* 不依賴 Hosting Provider

---

# Cloudflare Responsibilities

Cloudflare 提供：

Network Layer

包含：

* DNS
* SSL
* CDN
* Reverse Proxy
* Edge Cache
* Workers

Cloudflare 不負責：

* Business Logic
* Database
* Queue
* AI Processing

保持責任分離。

---

# Deployment Strategy

目前部署方式：

```
Developer

↓

Git

↓

Build

↓

Deploy

↓

Cloudflare

↓

Shared Hosting

↓

Production
```

Frontend 與 Backend 可獨立部署。

互不影響。

---

# Reliability

Infrastructure 以：

Stateless API

搭配：

Persistent Database

實作。

Worker 可重新啟動。

API 可重新部署。

資料不受影響。

---

# Scalability

目前支援：

Vertical Scaling

例如：

* Shared Hosting 升級
* MySQL 升級

當流量增加時，

可逐步導入：

* Cloud Run
* Python Worker
* Container
* Redis Queue

而不需重寫整個系統。

---

# Security

Infrastructure 提供：

Network Security

* HTTPS
* SSL
* Cloudflare Protection

Application Security

* Authentication
* Authorization
* Audit Log

Data Security

* Database Backup
* Access Control
* Secret Management

Infrastructure 與 Application Security 保持分層。

---

# Future Evolution

Infrastructure 可逐步演進：

V1

Shared Hosting

↓

V2

Hybrid Infrastructure

↓

Cloud Run Worker

↓

Redis Queue

↓

Object Storage

↓

V3

Cloud Native Infrastructure

↓

Container

↓

Auto Scaling

↓

Managed Queue

↓

Observability

整體 Product Architecture 不需修改。

僅 Infrastructure 演進即可。

---

# Infrastructure Documents

Infrastructure 章節包含：

1. Infrastructure Overview

2. Deployment Architecture

3. Cloudflare Infrastructure

4. Backend Infrastructure

5. Database Infrastructure

6. Queue & Worker Infrastructure

7. Scheduler Infrastructure

8. Security Infrastructure

9. Monitoring & Operations

10. Infrastructure Evolution

---

# Summary

Infrastructure 定義 Highlight Signal 的實際部署方式。

V1 採用：

* PHP Backend
* Cloudflare
* Shared Hosting
* MySQL
* Database Queue
* Google Apps Script Scheduler

以最低成本完成可正式運行的 SaaS 架構。

未來可平滑演進至 Cloud Run、Container 與 Cloud Native Infrastructure，而無需改變既有 Product Architecture。
