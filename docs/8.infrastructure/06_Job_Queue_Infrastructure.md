# 06_Job_Queue_Infrastructure

Version: v1.0

Status: Stable

---

# Purpose

> V1 Alignment Patch: Queue Job is an infrastructure execution unit stored in MySQL. It is distinct from business Action, human Task, Execution Result, and Business Outcome. Redis, RabbitMQ, Kafka, Cloud Tasks, and managed queues are Future options only.

Job Queue Infrastructure 定義 Highlight Signal V1 的背景工作處理架構。

Queue 作為：

Asynchronous Processing Layer

負責串接：

* API
* Database
* Worker

使耗時工作可於背景執行，而不影響 API 回應速度。

---

# Design Philosophy

Queue 採用：

Asynchronous

↓

Reliable

↓

Simple

↓

Persistent

V1 不使用：

* Redis
* RabbitMQ
* Kafka
* Cloud Tasks

而是採用：

Database Job Queue

降低 Infrastructure Complexity。

---

# Infrastructure Position

Job Queue 位於：

```text id="jq1m8v"
Client

↓

Backend API

↓

Job Queue

↓

Worker

↓

Database Update
```

Queue 為 API 與 Worker 之間的橋樑。

---

# Responsibilities

Job Queue 負責：

* Job Buffer
* Processing Order
* Status Tracking
* Retry Control
* Worker Coordination

Queue 不負責：

* Business Logic
* AI Processing
* Website Scan
* Notification

上述工作皆由 Worker 執行。

---

# Queue Lifecycle

每個 Job 皆遵循固定生命週期。

```text id="qv9u2c"
Created

↓

Queued

↓

Claimed

↓

Processing

↓

Completed

↓

Archived
```

若發生錯誤：

```text id="mz7k1r"
Processing

↓

Failed

↓

Retry

↓

Completed
```

或：

Failed

↓

Manual Review

---

# Job Creation

所有 Background Task：

由 Backend API 建立。

例如：

* Website Scan
* Secret Scan
* AI Recommendation
* Report Generation
* Notification

API 僅建立 Job。

不直接執行工作。

---

# Queue Flow

```text id="b7xk4p"
Client Request

↓

Backend API

↓

Insert Job

↓

Queue Table

↓

Worker Claim

↓

Execute Job

↓

Update Status
```

整個流程保持非同步。

---

# Queue Storage

V1 Queue 使用：

MySQL Queue Table

所有 Job 狀態：

皆永久保存於 Database。

優點：

* 可追蹤
* 可恢復
* 可審計
* 容易除錯

---

# Job Status

每個 Job 應具有明確狀態。

例如：

* Queued
* Claimed
* Processing
* Completed
* Failed
* Cancelled

避免：

Unknown State。

---

# Worker Coordination

Worker 定期查詢：

Queued Job

↓

Claim Job

↓

Execute

↓

Update Status

同一 Job

僅能由一個 Worker 執行。

避免：

Duplicate Processing。

---

# Retry Strategy

若 Worker 執行失敗：

Job

↓

Failed

↓

Retry Queue

↓

Worker

Retry 次數：

依系統設定控制。

超過限制後：

標記為 Failed。

等待人工處理。

---

# Idempotency

所有 Background Job

皆應具備：

Idempotent

特性。

即：

同一 Job

即使重複執行，

結果仍保持一致。

避免：

* Duplicate Email
* Duplicate Report
* Duplicate Recommendation

---

# Queue Persistence

Queue 採用：

Persistent Storage

即使：

* API Restart
* Worker Restart
* Hosting Restart

Job 仍保留於 Database。

待 Worker 恢復後繼續執行。

---

# Performance

Queue 可吸收：

Traffic Spike。

例如：

100 個 Scan Request

↓

100 個 Queue Job

↓

Worker

依序處理。

避免：

API Blocking。

---

# Monitoring

應持續監控：

* Queue Length
* Waiting Jobs
* Processing Jobs
* Failed Jobs
* Retry Count
* Processing Time

上述資訊可作為：

System Health Indicator。

---

# Security

Queue 不直接對外開放。

所有 Job：

皆由 Backend 建立。

Client 無法：

* 修改 Queue
* 刪除 Queue
* Claim Queue

避免：

未授權操作。

---

# Scalability

目前：

```text id="l5cx8d"
Single Queue

↓

Single Worker
```

未來可演進：

```text id="p4ra9j"
Multiple Queues

↓

Multiple Workers

↓

Priority Queue

↓

Distributed Queue
```

API 保持一致。

---

# Future Evolution

未來可導入：

Queue Platform

* Redis
* RabbitMQ
* Cloud Tasks
* Pub/Sub
* Kafka

Application Layer

保持不變。

僅替換 Queue Infrastructure。

---

# Relationship with Other Documents

本文件描述：

Job Queue Infrastructure。

相關文件：

Database

* Queue Table

Backend

* Queue Repository
* Queue Service

Worker Infrastructure

* Job Execution

Scheduler Infrastructure

* Queue Trigger

各文件負責不同層級。

---

# Summary

Highlight Signal V1 採用 Database Job Queue 作為背景工作基礎設施。

Queue 提供：

* Job Buffer
* Asynchronous Processing
* Retry Control
* Status Tracking
* Worker Coordination

透過 Persistent Queue 與 Stateless API 的設計，使系統能在低成本架構下支援穩定的背景工作處理，同時保留未來升級至 Redis、Cloud Tasks 或分散式訊息佇列的彈性，而不需修改既有應用程式架構。
