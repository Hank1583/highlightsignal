# ADR-004 Database Job Queue

Document

04_ADR_004_Database_Job_Queue.md

Version: v1.0

Status: Accepted

Date: 2026-07-02

---

# Title

Adopt Database Job Queue as the Background Processing Infrastructure for V1

---

# Status

Accepted

---

# Context

Highlight Signal 包含多項長時間執行的背景工作，例如：

* Website Scan
* Secret Scan
* AI Analysis
* Report Generation
* Notification Delivery

上述工作：

* 執行時間不可預測
* 不適合 HTTP Request 生命週期
* 不應阻塞 API Response

因此需要建立可靠的背景工作處理機制。

---

# Problem

若 API 直接執行背景工作：

```text id="api1rt"
Client

↓

API

↓

Long Running Task

↓

Response
```

可能造成：

* Request Timeout
* User Waiting
* Web Server Occupied
* Poor User Experience

需要建立：

非同步處理架構。

---

# Decision

Alignment Patch v1.2: The V1 database job queue is stored in MySQL. Queue Job is an infrastructure execution unit and must remain distinct from business Action, human Task, Execution Result, and Business Outcome.

Highlight Signal V1 採用：

Database Job Queue

作為唯一的 Background Processing Queue。

所有耗時工作：

皆先建立 Queue Job。

由 Worker：

非同步執行。

---

# Architecture

Background Processing：

```text id="dbq9pw"
Client

↓

REST API

↓

Insert Job

↓

MySQL Queue

↓

Worker Claim

↓

Execute

↓

Update Status
```

API

僅負責：

建立 Job。

Worker

負責：

執行 Job。

---

# Rationale

採用 Database Queue 的原因：

Infrastructure Simple

不需新增：

* Redis
* RabbitMQ
* Kafka

Shared Hosting Compatible

MySQL 已存在。

無須新增 Server。

Persistent

Job 永久保存。

Worker Restart

後仍可恢復。

Easy Debugging

可直接查詢：

Queue Table。

Deployment Simple

Infrastructure 成本最低。

符合：

Simple First。

---

# Consequences

優點：

* 成本低
* 架構簡單
* 永久保存
* 容易除錯
* Shared Hosting 可直接使用
* 不增加 Infrastructure

缺點：

* Throughput 較低
* Polling 成本較高
* 不適合大量即時訊息

目前皆可接受。

---

# Alternatives Considered

## Redis Queue

優點：

* 高效能
* In-memory
* 延遲低

缺點：

* 額外 Server
* 額外維護
* Shared Hosting 不適用

V1 不採用。

---

## RabbitMQ

優點：

* Message Queue 成熟
* Routing 能力完整

缺點：

* 部署複雜
* 維護成本增加
* 對 V1 屬於過度設計

---

## Kafka

優點：

* 大規模 Event Streaming
* 高吞吐量

缺點：

* Infrastructure 成本高
* 不符合目前產品規模

---

## Cloud Tasks

優點：

* Managed Service
* 自動 Retry

缺點：

* 綁定雲端平台
* 增加營運成本
* Shared Hosting 無法直接整合

---

# Architectural Impact

Database Queue

成為：

API

與

Worker

之間的唯一橋樑。

影響：

Backend

* Queue Service
* Worker

Database

* Queue Table

Infrastructure

* Scheduler
* Worker

Application Layer

保持不變。

---

# Worker Relationship

Queue

與

Worker

分離。

```text id="wrk8nh"
Queue

↓

Store Job

↓

Worker

↓

Process Job
```

Queue

不執行工作。

Worker

不建立工作。

職責分離。

---

# Reliability

所有 Job：

永久保存。

即使：

* API Restart
* Worker Restart
* Hosting Restart

Queue

仍存在。

Worker 恢復後：

可繼續執行。

---

# Scalability

V1：

```text id="scm3zt"
Single Queue

↓

Single Worker
```

Future：

```text id="xq7kpa"
Single Queue

↓

Multiple Workers

↓

Priority Queue

↓

Distributed Queue
```

Queue Interface

保持一致。

---

# Evolution Strategy

未來若：

* Traffic 大幅增加
* Worker 數量增加
* Processing Volume 增加

可替換：

Database Queue

↓

Redis

↓

RabbitMQ

↓

Cloud Tasks

Application Layer

無須修改。

---

# Future Evolution

V1

Database Queue

↓

V2

Database Queue + Multiple Workers

↓

V3

Managed Queue Service

↓

Cloud Native Queue

Architecture

保持一致。

---

# References

Infrastructure

* Job Queue Infrastructure
* Database Infrastructure

Backend

* Queue Backend

Architecture

* Signal Framework

ADR

* ADR-003 PHP Backend Architecture

---

# Summary

Highlight Signal V1 採用 Database Job Queue 作為背景工作基礎設施。

此決策以簡單、可靠、低成本為優先，充分利用既有 MySQL 環境，在不增加額外基礎設施的情況下提供非同步背景工作能力。

透過 Queue 與 Worker 的責任分離，系統能支援 Website Scan、AI Analysis、Report Generation 等長時間工作，同時保留未來升級至 Redis、RabbitMQ 或 Managed Queue Service 的彈性，而無須調整整體 Product Architecture。
