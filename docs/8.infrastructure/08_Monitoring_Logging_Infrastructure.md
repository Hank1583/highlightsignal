# 08_Monitoring_Logging_Infrastructure

> **V12-04 note (2026-07-22)**: this document's "V1 Alert Strategy" and
> "Future Evolution" sections described automated alerting as something to
> "導入" (introduce) later. See `12_Observability_Runbook.md` for what is
> now real: an SLI inventory backed by a new signed `GET /api/v1/ops/dashboard`
> endpoint, alert thresholds, an incident runbook, and a real disposable-DB
> game day. Real alert DELIVERY (Slack/PagerDuty/email) still does not
> exist — honestly flagged there as an owner decision, not silently closed.

Version: v1.0

Status: Stable

---

# Purpose

Monitoring & Logging Infrastructure 定義 Highlight Signal V1 的系統監控與日誌架構。

目的包括：

* 系統健康監控
* 問題診斷
* 錯誤追蹤
* 維運支援
* 容量觀察
* 效能分析

Monitoring 與 Logging 屬於 Infrastructure。

不屬於 Business Logic。

---

# Design Philosophy

Monitoring 採用：

Observe

↓

Detect

↓

Analyze

↓

Improve

Logging 採用：

Record Once

↓

Trace Anywhere

↓

Troubleshoot Quickly

系統應具備可觀測性（Observability）。

---

# Infrastructure Position

Monitoring Layer 位於：

```text id="f7k2qm"
Cloudflare

↓

PHP Backend

↓

Database

↓

Worker

↓

Monitoring & Logging
```

所有 Infrastructure Component

皆應提供可觀測資訊。

---

# Responsibilities

Monitoring Infrastructure 負責：

* System Health
* Service Availability
* Performance Metrics
* Error Detection
* Resource Usage
* Runtime Status

Logging Infrastructure 負責：

* Application Log
* Error Log
* Worker Log
* Queue Log
* Deployment Log

不負責：

* Audit Trail
* Business History
* User Activity Analysis

---

# Monitoring Scope

監控範圍包括：

Network

* HTTPS
* DNS
* Response Time

Application

* API Status
* Error Rate
* Request Count

Database

* Connection
* Query Performance
* Storage

Worker

* Queue Processing
* Running Status
* Processing Time

Scheduler

* Trigger Status
* Execution Result

---

# Health Check

各元件皆應提供：

Health Check

例如：

```text id="q3jv9r"
Frontend

↓

Healthy

Backend

↓

Healthy

Database

↓

Healthy

Worker

↓

Healthy
```

可快速判斷：

Infrastructure 是否正常運作。

---

# Logging Categories

系統 Log 可分為：

Application Log

Error Log

Worker Log

Queue Log

Deployment Log

Security Log

不同 Log

應獨立管理。

---

# Application Logging

Application Log

記錄：

* API Request
* API Response
* Execution Time
* Service Status

不記錄：

* Password
* Secret
* Sensitive Data

---

# Error Logging

所有 Exception

應統一記錄。

包含：

* Error Message
* Stack Trace（Development）
* Timestamp
* Module
* Request ID（Future）

Production

避免直接回傳 Internal Error。

---

# Worker Logging

Worker Log

應記錄：

* Worker Start
* Worker Stop
* Job Claimed
* Job Completed
* Job Failed
* Retry

方便追蹤背景工作。

---

# Queue Monitoring

應持續觀察：

* Waiting Jobs
* Processing Jobs
* Failed Jobs
* Retry Count
* Queue Length

Queue 狀態可作為：

系統負載指標。

---

# Database Monitoring

Database

應監控：

* Active Connection
* Slow Query
* Storage Usage
* Backup Status

異常時應能快速定位問題。

---

# Cloudflare Monitoring

Cloudflare 提供：

* Traffic
* Cache Rate
* SSL Status
* Threat Events
* Edge Requests

Cloudflare 僅監控：

Network Layer。

---

# Scheduler Monitoring

Google Apps Script

應監控：

* Trigger Success
* Execution Time
* Execution Error

確認排程正常執行。

---

# Log Retention

不同 Log

可設定不同保存期限。

例如：

Application Log

30 Days

Error Log

90 Days

Deployment Log

180 Days

實際保存期限依營運需求調整。

---

# Log Rotation

Log 應定期輪替。

避免：

* Disk Full
* Single Large File
* Long-term Storage Growth

Rotation 應自動化。

---

# Alert Strategy

V1 Alert

可採：

Manual Monitoring

搭配：

* Error Notification
* Email Alert
* Health Check

Future：

可導入自動告警平台。

---

# Performance Metrics

建議監控：

API

* Response Time
* Throughput

Worker

* Average Processing Time
* Queue Delay

Database

* Query Latency

Infrastructure

* CPU
* Memory
* Storage

作為容量規劃依據。

---

# Security Logging

Infrastructure

應記錄：

* Authentication Failure
* Invalid Request
* Unauthorized Access
* Suspicious Activity

但不得記錄：

* Password
* Secret
* Credential

---

# Future Evolution

未來可導入：

Monitoring

* Prometheus
* Grafana
* Google Cloud Monitoring

Logging

* ELK Stack
* Loki
* Cloud Logging

Alert

* PagerDuty
* Slack Notification
* Opsgenie

Application Architecture

保持不變。

---

# Relationship with Other Documents

本文件描述：

Infrastructure Monitoring。

相關文件：

Cloudflare Infrastructure

* Edge Metrics

Database Infrastructure

* Database Health

Job Queue Infrastructure

* Queue Metrics

Backend

* Application Log

Audit Log

* Business Audit

各文件負責不同層級。

---

# Summary

Highlight Signal V1 建立完整的 Monitoring 與 Logging Infrastructure，以支援日常維運與故障排除。

監控範圍涵蓋：

* Cloudflare
* PHP Backend
* MySQL
* Job Queue
* Worker
* Google Apps Script

透過系統化的健康檢查、效能指標與日誌管理，提升系統可觀測性與維護效率，同時保留未來整合企業級 Monitoring、Logging 與 Alert 平台的擴充能力，而無須修改既有系統架構。
