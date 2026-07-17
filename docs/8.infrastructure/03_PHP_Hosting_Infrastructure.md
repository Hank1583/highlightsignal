# 03_PHP_Hosting_Infrastructure

Version: v1.0

Status: Stable

---

# Purpose

> Runtime Alignment Patch: The current shared-hosting transition runtime is PHP 7.0.26. New V1 backend code must remain syntax-compatible with PHP 7.0.26 until hosting is upgraded. PHP 8.1+ remains the required future security and maintainability upgrade; PHP 8.x references in this document describe that evolution target, not the current host.

PHP Hosting Infrastructure 定義 Highlight Signal Backend 在 V1 的實際部署方式。

Backend 負責：

* REST API
* Authentication
* Business Logic
* Database Access
* Queue Management
* Notification
* System Integration

目前採用：

> PHP + Shared Hosting

此架構已完成正式部署並支援 Production 運行。

---

# Design Philosophy

Backend 採用：

Simple

↓

Stable

↓

Low Cost

↓

Easy Maintenance

V1 不追求：

* Microservices
* Kubernetes
* Container Platform

而是優先：

快速交付產品。

---

# Backend Responsibilities

PHP Backend 提供：

Application Layer

包含：

* REST API
* Authentication
* Authorization
* Business Rules
* Database CRUD
* Queue Management
* Notification Trigger
* Audit Logging

Backend 不負責：

* UI Rendering
* Edge Routing
* CDN
* SSL
* DNS

上述功能由 Cloudflare 負責。

---

# Infrastructure Position

PHP Backend 位於：

```text
Internet

↓

Cloudflare

↓

PHP Backend

↓

MySQL
```

Backend 為所有資料操作的唯一入口。

所有 Client 均不得直接存取 Database。

---

# Hosting Environment

目前部署於：

Shared Hosting

提供：

* PHP Runtime
* Apache / LiteSpeed Web Server
* HTTPS
* File Storage
* FTP Deployment

此環境已足以支援：

* SaaS MVP
* Internal Platform
* Early Production

---

# Runtime Environment

目前 Backend 執行環境：

Language

* PHP

Web Server

* Apache 或 Hosting Provider 提供

Database Driver

* MySQL

Communication

* HTTPS REST API

Deployment

* FTP

Background Process

* Local PHP Worker

---

# Deployment Architecture

```text
Developer

↓

Git Repository

↓

Build / Package

↓

FTP Upload

↓

Shared Hosting

↓

Production
```

Backend 可獨立部署。

Frontend 不需同步更新。

---

# Directory Structure

V1 Backend 採用模組化目錄。

```text
backend/

├── api/
├── config/
├── modules/
├── services/
├── repositories/
├── workers/
├── cron/
├── middleware/
├── storage/
├── logs/
└── vendor/
```

各目錄皆具有單一責任。

避免不同模組彼此依賴。

---

# Configuration

系統設定集中管理。

包含：

* Database
* API Keys
* Mail
* Environment
* Queue
* Security

Business Logic 不應包含：

* Database Password
* Secret Key
* SMTP Password

所有設定集中於 Configuration Layer。

---

# API Execution Flow

每個 API Request：

```text
Client

↓

Cloudflare

↓

PHP Router

↓

Middleware

↓

Controller

↓

Service

↓

Repository

↓

MySQL

↓

Response
```

Business Logic 集中於 Service Layer。

Database 操作集中於 Repository Layer。

---

# Stateless API

所有 API 設計皆遵循：

Stateless

每一次 Request：

* 可獨立執行
* 不依賴 Previous Request
* 可重新部署
* 可水平擴充

避免：

Server Memory State。

---

# Background Processing

所有耗時工作：

例如：

* Website Scan
* Secret Scan
* AI Analysis
* Report Generation

皆不於 API Request 中執行。

流程如下：

```text
API

↓

Insert Queue

↓

Response

↓

Worker Processing
```

降低：

* Request Timeout
* Long Running Request

提升：

API Response Speed。

---

# Cron Endpoint

Backend 提供：

Cron Endpoint

供：

Google Apps Script

定期呼叫。

```text
Google Apps Script

↓

HTTPS

↓

Cron Endpoint

↓

Queue Trigger

↓

Worker
```

Backend 不依賴：

Hosting Provider Cron。

---

# File Storage

Backend 可管理：

* Temporary Files
* Scan Results
* Report Files
* Log Files

V1 使用：

Local Storage

未來可演進：

* Cloud Storage
* Object Storage
* CDN Storage

而不影響 Business Logic。

---

# Logging

Backend 提供：

Application Log

包含：

* API Request
* Error
* Queue
* Worker
* Exception

Log 與 Business Data 分離。

避免：

資料混合管理。

---

# Error Handling

所有 Exception：

集中處理。

API 回傳：

* HTTP Status Code
* Error Code
* Error Message

避免：

PHP Internal Error

直接暴露給 Client。

---

# Security

Backend 提供：

Authentication

Authorization

Input Validation

Output Sanitization

SQL Injection Protection

Session Management

Audit Log

敏感資訊不得：

* Hard Code
* 回傳 Client
* 寫入 Public Directory

---

# Deployment Strategy

部署遵循：

Replace Deployment

流程：

```text
Upload

↓

Replace Files

↓

Configuration Check

↓

Health Check

↓

Production
```

Database Migration

與

Application Deployment

可分離執行。

---

# Availability

Backend 設計為：

Stateless Service

因此：

重新部署

↓

重新啟動 PHP

↓

不影響 Database。

所有重要資料：

永久保存於 MySQL。

---

# Scalability

V1 採用：

Vertical Scaling

可升級：

* CPU
* Memory
* Hosting Plan

未來可演進：

```text
Shared Hosting

↓

VPS

↓

Cloud Run

↓

Container

↓

Cloud Native
```

Backend API 保持一致。

Client 無須修改。

---

# Future Evolution

未來可逐步導入：

Runtime

* PHP 8.x
* PHP-FPM

Deployment

* CI/CD
* Git Deployment

Platform

* Docker
* Cloud Run
* Kubernetes（Future）

Worker

* Python Worker
* AI Worker
* Distributed Worker

Infrastructure 可持續升級。

Application Architecture 不需改變。

---

# Relationship with Other Documents

本文件描述：

Infrastructure

相關文件：

* Backend Architecture：定義程式架構
* Database：定義資料模型
* API：定義介面規格
* Queue Infrastructure：定義背景工作執行方式

彼此各自負責不同層級。

---

# Summary

Highlight Signal V1 Backend 採用 PHP Shared Hosting 作為核心執行環境。

Backend 提供：

* REST API
* Business Logic
* Queue Management
* Authentication
* Database Access
* Notification
* System Integration

透過 Stateless API、Database Queue 與模組化架構，在維持低成本與易維護的前提下，支援正式 Production 環境，並保留未來平滑演進至 VPS、Cloud Run 或 Container Platform 的能力，而無須調整既有 Product Architecture。
