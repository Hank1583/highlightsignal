# 04_Database_Infrastructure

Version: v1.0

Status: Stable

---

# Purpose

> V1 Alignment Patch: The V1 database engine is MySQL in production and local integration environments. PostgreSQL and SQLite are not V1 baselines.

Database Infrastructure 定義 Highlight Signal V1 的資料儲存架構。

Database 為整個系統唯一的 Persistent Storage。

負責：

* Business Data
* User Data
* System Data
* Queue Data
* Audit Data

Database 不包含：

* Business Logic
* API Logic
* Worker Logic

所有資料操作皆透過 Backend API 完成。

---

# Design Philosophy

Database 採用：

Single Source of Truth

所有正式資料皆以 Database 為唯一來源。

避免：

* Multiple Data Sources
* Duplicate Storage
* Local State

確保資料一致性。

---

# Current Infrastructure

V1 採用：

MySQL

作為：

Primary Relational Database

主要原因：

* 成熟穩定
* Shared Hosting 支援
* 維護成本低
* 易於備份
* 與 PHP 整合成熟

符合 SaaS MVP 的需求。

---

# Infrastructure Position

Database 位於：

```text id="w3dk8m"
Client

↓

Cloudflare

↓

PHP Backend

↓

MySQL
```

Client 永遠不可直接存取 Database。

所有資料存取皆經由 Backend。

---

# Database Responsibilities

Database 負責儲存：

Core Data

* Workspace
* User
* Account
* Signal
* Evidence
* Recommendation

System Data

* Notification
* Audit Log
* Queue
* Configuration

Operational Data

* Worker Status
* Processing State
* Job History

Database 不負責：

* API Validation
* Business Rules
* Authentication

---

# Storage Model

Database 採用：

Relational Model

資料以：

Table

↓

Primary Key

↓

Foreign Key

建立關聯。

確保：

* Data Integrity
* Referential Integrity
* Consistency

---

# Data Ownership

每個 Module 擁有自己的資料表。

例如：

User Module

↓

User Tables

Signal Module

↓

Signal Tables

Evidence Module

↓

Evidence Tables

Module 不直接修改其他 Module 的資料。

避免高度耦合。

---

# Database Access Flow

所有 Database 存取：

```text id="au4z2n"
Client

↓

Backend API

↓

Repository

↓

MySQL
```

禁止：

Frontend

↓

Database

直接連線。

---

# Transaction Management

所有重要資料操作：

使用 Database Transaction。

例如：

* User Registration
* Queue Creation
* Recommendation Generation
* Notification Creation

避免：

Partial Update

造成資料不一致。

---

# Queue Storage

V1 Queue 採用：

Database Queue

```text id="nq0m7e"
API

↓

Insert Job

↓

Queue Table

↓

Worker

↓

Completed
```

Queue 與 Business Data 共用 MySQL。

降低：

Infrastructure Complexity。

---

# Data Consistency

Database 為：

Strong Consistency

所有資料更新：

成功 Commit

↓

立即可讀取

避免：

Eventually Consistent

增加系統複雜度。

---

# Backup Strategy

Database 應定期備份。

至少包含：

* Schema
* Business Data
* Queue Data
* Configuration

Backup 與正式資料分離保存。

避免：

單點故障。

---

# Recovery

Database Recovery：

```text id="k8zq5d"
Backup

↓

Restore

↓

Verification

↓

Production
```

Recovery 應優先恢復：

1.

User Data

2.

Business Data

3.

Queue

4.

Audit Log

---

# Security

Database 不直接暴露 Internet。

所有存取：

經由 Backend。

安全措施包括：

* Database Account
* Least Privilege
* Parameterized Query
* Access Control
* Backup Protection

禁止：

Public Database Access。

---

# Performance

V1 採用：

單一 MySQL Instance。

透過：

* Primary Key
* Index
* Query Optimization

提升：

* Read Performance
* Write Performance

目前不使用：

* Read Replica
* Sharding
* Distributed Database

---

# Availability

Database 為：

Persistent Layer

即使：

* API Restart
* Worker Restart
* Frontend Redeploy

Database 資料仍持續存在。

確保：

System Recovery。

---

# Monitoring

應持續監控：

* Connection Count
* Query Time
* Slow Query
* Disk Usage
* Database Size
* Backup Status

Application Monitoring

仍由 Backend 負責。

---

# Scalability

V1 支援：

Vertical Scaling

例如：

* CPU
* RAM
* Storage

未來可演進：

```text id="e5j7vt"
Single MySQL

↓

High Performance MySQL

↓

Managed Database

↓

Read Replica

↓

Cloud SQL
```

Application 不需修改。

---

# Future Evolution

未來可導入：

Infrastructure

* Cloud SQL
* Amazon RDS
* Managed MySQL

Performance

* Read Replica
* Connection Pool
* Query Cache

Availability

* Automatic Backup
* Multi-Zone
* Failover

仍維持：

Relational Database

作為核心。

---

# Relationship with Other Documents

Database Infrastructure

描述：

資料庫部署與運維。

相關文件：

Database

* Schema
* Table Design
* ER Model

Backend

* Repository
* Transaction
* CRUD

Queue Infrastructure

* Job Queue
* Worker

各文件彼此互補。

---

# Summary

Highlight Signal V1 採用 MySQL 作為唯一的 Persistent Storage。

Database 負責：

* Business Data
* User Data
* Queue Data
* Audit Data
* System Configuration

透過 Backend API 統一存取，提供資料一致性、可靠性與低維護成本，並支援未來平滑升級至 Cloud SQL、Managed Database 或高可用性架構，而無須調整既有應用程式設計。
