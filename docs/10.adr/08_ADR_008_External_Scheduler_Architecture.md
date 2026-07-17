# ADR-008 External Scheduler Architecture

Document

08_ADR_008_External_Scheduler_Architecture.md

Version: v1.0

Status: Accepted

Date: 2026-07-02

---

# Title

Adopt an External Scheduler Architecture for Background Task Triggering

---

# Status

Accepted

---

# Context

Highlight Signal 包含許多需要定期執行的背景工作，例如：

* Website Scan
* Secret Scan
* Scheduled Recommendation
* Notification Delivery
* Health Check
* System Maintenance

系統需要一個可靠的 Scheduler，

定期觸發 Backend Background Processing。

---

# Problem

若完全依賴：

Hosting Provider Cron

將產生：

* Hosting Provider 綁定
* 不同 Hosting 行為不一致
* 遷移困難
* 維護成本增加

若由：

API

自行輪詢，

則：

* 浪費資源
* 架構不清楚

需要建立：

獨立於 Application 的 Scheduler。

---

# Decision

Highlight Signal 採用：

External Scheduler Architecture。

V1

由：

Google Apps Script

定期呼叫：

Backend Cron Endpoint。

Scheduler

僅負責：

Trigger。

Business Logic

仍由 Backend 執行。

---

# Architecture

Scheduler Flow：

```text id="sch6kt"
Time Trigger

↓

External Scheduler

↓

HTTPS Request

↓

Backend Cron Endpoint

↓

Queue

↓

Worker

↓

Completed
```

Scheduler

不執行：

Business Logic。

---

# Rationale

External Scheduler

具有：

Independent

與 Application 分離。

Simple

架構清楚。

Portable

Backend

可遷移。

Low Cost

無需額外 Infrastructure。

Shared Hosting Friendly

符合 V1 部署方式。

---

# Implementation

V1

Scheduler

採用：

Google Apps Script。

負責：

* Time Trigger
* HTTPS Request
* Basic Authentication

Backend

負責：

* Validation
* Queue
* Worker Trigger

Google Apps Script

僅為目前 Implementation。

不是 Architecture 本身。

---

# Consequences

優點：

* Scheduler 與 Backend 解耦
* Hosting Independent
* 成本低
* 部署容易
* 易於替換

缺點：

* 增加一個外部服務
* 依賴 HTTPS Trigger
* Trigger Frequency 受平台限制

上述限制可接受。

---

# Alternatives Considered

## Linux Cron

優點：

* 成熟
* 穩定

缺點：

* Hosting 綁定
* Shared Hosting 支援有限
* 遷移成本高

---

## Hosting Provider Scheduler

優點：

* 設定簡單

缺點：

* Vendor Lock-in
* 不同平台差異大

---

## Internal Scheduler

Application

自行 Trigger。

優點：

* 無外部依賴

缺點：

* 浪費資源
* Application Complexity 增加
* 不符合單一責任

---

## Cloud Scheduler

優點：

* Managed Service
* 高可靠性

缺點：

* 增加雲端成本
* 對 V1 屬於過度設計

未來可採用。

---

# Architectural Impact

Scheduler

位於：

Application

之外。

影響：

Infrastructure

* Scheduler

Backend

* Cron Endpoint

Worker

* Queue Trigger

Application Layer

保持獨立。

---

# Decoupling

Scheduler

只知道：

```text id="dec3hy"
Time

↓

Endpoint

↓

Authentication
```

Scheduler

不知道：

* Database
* Queue
* Recommendation
* Business Rule

保持：

Low Coupling。

---

# Evolution Strategy

Future

Scheduler

可替換為：

* Google Cloud Scheduler
* AWS EventBridge
* Azure Scheduler
* GitHub Actions
* Enterprise Scheduler

Backend Endpoint

保持一致。

Application

無須修改。

---

# Scalability

V1

```text id="sca8rf"
Google Apps Script

↓

Cron Endpoint
```

V2

```text id="sca5pw"
Cloud Scheduler

↓

Cron Endpoint
```

Enterprise

```text id="sca2na"
Multiple Scheduler

↓

Cron API Gateway

↓

Worker
```

Architecture

保持一致。

---

# Future Evolution

V1

Google Apps Script

↓

V2

Cloud Scheduler

↓

V3

Distributed Scheduler

↓

Enterprise

Workflow Engine

Scheduler Interface

保持一致。

---

# References

Infrastructure

* Google Apps Script Cron Infrastructure
* Job Queue Infrastructure

Backend

* Cron Backend

ADR

* ADR-004 Database Job Queue

---

# Summary

Highlight Signal 採用 External Scheduler Architecture 作為背景工作的觸發機制。

V1 使用 Google Apps Script 作為 Scheduler Implementation，以 HTTPS 呼叫 Backend Cron Endpoint，將排程、商業邏輯與背景工作完全分離。

此決策建立清楚的責任邊界，使 Scheduler 可在未來平滑替換為 Cloud Scheduler、Enterprise Scheduler 或其他排程平台，而無須修改 Backend、Worker 或 Product Architecture。
