# 05_Google_Apps_Script_Cron_Infrastructure

Version: v1.0

Status: Stable

---

# Purpose

> V1 Alignment Patch: Google Apps Script supplies time-based triggers only. It must not contain business rules or understand Recommendation, Decision, Queue internals, or Worker execution. The cron endpoint authenticates the request and creates or triggers a MySQL Queue Job.

Google Apps Script Cron Infrastructure 定義 Highlight Signal V1 的排程執行架構。

V1 採用：

Google Apps Script

作為：

System Scheduler

定期觸發 Backend Cron Endpoint。

Google Apps Script 僅負責：

* Time-based Scheduling
* HTTPS Request
* Trigger Execution

不負責：

* Business Logic
* Queue Processing
* Database Operation

---

# Design Philosophy

Scheduler 採用：

Simple

↓

Reliable

↓

Serverless

↓

Low Cost

V1 不依賴：

* Linux Cron
* Hosting Provider Scheduler
* Dedicated Scheduler Server

降低部署限制。

---

# Why Google Apps Script

選擇 Google Apps Script 的原因：

* 免費使用
* 高可用性
* 雲端執行
* 容易維護
* 可設定固定時間觸發
* 不受 Shared Hosting 限制

符合 V1 快速部署需求。

---

# Infrastructure Position

Scheduler 位於：

```text id="2xqk9m"
Google Apps Script

↓

HTTPS

↓

PHP Cron Endpoint

↓

Queue

↓

Worker
```

Scheduler 僅作為系統觸發器。

---

# Responsibilities

Google Apps Script 負責：

* 定時執行
* 發送 HTTPS Request
* 呼叫 Backend Endpoint
* Trigger Cron Process

Backend 負責：

* 驗證請求
* 執行商業邏輯
* Queue 管理
* Database 操作

責任明確分離。

---

# Execution Flow

排程流程：

```text id="v5n8cw"
Timer

↓

Google Apps Script

↓

HTTPS Request

↓

Cron Endpoint

↓

Backend Service

↓

Database

↓

Queue

↓

Worker
```

所有背景工作皆由 Backend 接手。

---

# Trigger Model

Google Apps Script 使用：

Time-driven Trigger

依照預先設定的時間間隔執行。

例如：

* Every Minute
* Every 5 Minutes
* Every Hour
* Daily
* Weekly

實際排程頻率依系統需求調整。

---

# Communication

Scheduler 與 Backend 採用：

HTTPS REST Request

```text id="u4mz7p"
Google Apps Script

↓

HTTPS

↓

Cloudflare

↓

PHP Backend
```

所有通訊皆經過：

* DNS
* SSL
* Cloudflare Protection

---

# Authentication

Cron Endpoint 不應完全公開。

建議驗證方式：

* API Token
* Secret Key
* Signature Validation
* IP Restriction（Future）

避免：

未授權第三方觸發排程。

---

# Failure Handling

若排程執行失敗：

Google Apps Script

↓

Request Failed

↓

下次 Trigger 再次執行

Backend 應設計：

Idempotent Process

避免：

重複執行造成資料錯誤。

---

# Retry Strategy

Google Apps Script 不負責：

複雜 Retry Logic。

Retry 應由 Backend 控制：

例如：

* Queue Retry
* Job Retry
* Error Recovery

保持 Scheduler 簡單。

---

# Availability

Google Apps Script 為：

Serverless Platform

無需：

* 維護 VM
* 管理 Cron Service
* Server Monitoring

降低 Infrastructure Complexity。

---

# Monitoring

可監控：

Google Apps Script

* Trigger Status
* Execution Log
* Error Log
* Last Execution

Backend 則監控：

* Cron Endpoint
* Queue Status
* Worker Status

Scheduler 與 Application Monitoring 分離。

---

# Security

Scheduler 僅持有：

* Endpoint URL
* Authentication Token（如有）

不得保存：

* Database Password
* Business Data
* User Information

敏感資訊應集中管理。

---

# Scalability

V1 Scheduler：

Google Apps Script

↓

Single Trigger

未來可演進：

```text id="m1pw7d"
Google Apps Script

↓

Cloud Scheduler

↓

Cloud Tasks

↓

Event Scheduler

↓

Workflow Engine
```

Backend Endpoint 維持一致。

無須修改 API。

---

# Advantages

採用 Google Apps Script 的優點：

* 免費
* 無須自行維護 Scheduler
* 快速部署
* 容易修改排程
* 與 Google 生態整合良好
* 不依賴 Hosting Provider

適合 MVP 與 Early Production。

---

# Limitations

Google Apps Script 並非：

* Job Queue
* Workflow Engine
* Background Worker

因此：

所有商業邏輯皆保留於 Backend。

避免：

Scheduler 過度複雜。

---

# Future Evolution

未來可逐步演進：

Scheduling

* Google Cloud Scheduler
* Cloud Tasks
* EventBridge（跨平台）
* Workflow Orchestrator

Infrastructure 可升級。

Backend 不需修改。

---

# Relationship with Other Documents

本文件描述：

Scheduler Infrastructure。

相關文件：

Infrastructure Overview

* Infrastructure Layer

PHP Hosting Infrastructure

* Cron Endpoint

Queue Infrastructure

* Background Processing

Backend

* Cron Controller
* Worker Trigger

彼此職責互不重疊。

---

# Summary

Highlight Signal V1 採用 Google Apps Script 作為雲端排程服務。

Scheduler 僅負責：

* 定時觸發
* HTTPS 呼叫
* 啟動 Backend Cron Endpoint

所有商業邏輯、Queue 管理與背景工作皆由 PHP Backend 執行，使排程層保持輕量、低成本且易於維護，同時保留未來升級至 Cloud Scheduler 或其他企業級排程平台的彈性。
