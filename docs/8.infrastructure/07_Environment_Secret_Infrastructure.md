# 07_Environment_Secret_Infrastructure

Version: v1.0

Status: Stable

---

# Purpose

Environment & Secret Infrastructure 定義 Highlight Signal V1 的系統設定與機密資訊管理方式。

目的包括：

* 統一管理環境設定
* 保護敏感資訊
* 降低憑證外洩風險
* 支援不同部署環境
* 提供未來雲端化的擴充能力

Application 不應依賴 Hard Code Configuration。

---

# Design Philosophy

Configuration 採用：

Centralized

↓

Environment Based

↓

Least Exposure

↓

Replaceable

所有機密資訊皆應與 Business Logic 分離。

---

# Infrastructure Position

Configuration Layer 位於：

```text id="m4d8qx"
Application

↓

Configuration

↓

Environment

↓

Infrastructure
```

Application 僅讀取設定。

不管理設定。

---

# Responsibilities

Configuration Infrastructure 負責：

* Environment Variables
* Database Configuration
* API Configuration
* Secret Management
* Service Endpoint
* Runtime Parameters

不負責：

* Business Rules
* User Settings
* Product Configuration

---

# Configuration Categories

系統設定可分為：

Infrastructure

* Database
* Mail
* Queue
* Domain
* API Endpoint

Security

* Secret Key
* API Token
* Encryption Key

Application

* Debug Mode
* Timeout
* Upload Limit

不同類型設定應獨立管理。

---

# Environment Separation

各部署環境應擁有獨立設定。

例如：

Development

Testing

Staging

Production

不同環境不得共用：

* Database
* API Token
* Secret Key

避免交叉影響。

---

# Secret Management

機密資訊包括：

* Database Password
* JWT Secret
* API Key
* SMTP Password
* Cloud Service Token
* Third-party Credentials

所有 Secret：

不得寫入程式碼。

---

# Storage Strategy

V1 採用：

Server-side Configuration

所有機密資訊：

儲存於 Server Environment 或受保護的 Configuration File。

Public Directory

不得包含：

* Password
* Secret
* Private Key

---

# Application Access

Application 存取方式：

```text id="s9hk4v"
Application

↓

Configuration Layer

↓

Environment

↓

Secret
```

Business Logic

不得直接管理 Secret。

---

# Frontend Separation

Frontend 不保存：

* Database Password
* JWT Secret
* SMTP Password
* Queue Secret

Frontend 僅能使用：

Public Configuration。

例如：

* API Base URL
* Public Feature Flag
* UI Configuration

---

# Backend Separation

Backend 可存取：

Infrastructure Secret。

例如：

* Database Account
* Mail Server
* Internal API Token

所有存取應集中管理。

避免：

Secret 散落於不同模組。

---

# Cloudflare Secrets

Cloudflare Workers 使用：

Cloudflare Secrets

管理：

* API Endpoint Token
* Worker Secret
* Integration Token

避免：

將 Secret 放入 Git Repository。

---

# Google Apps Script

Google Apps Script 僅保存：

* Cron Endpoint
* Trigger Token

不得保存：

* Database Account
* Business Data
* Internal Credential

---

# Logging Policy

Log 不得記錄：

* Password
* Secret
* API Key
* Token
* Credential

必要時：

僅記錄部分資訊。

例如：

```text id="t2bn6x"
API Key

↓

********ABCD
```

避免敏感資訊洩漏。

---

# Source Control

Git Repository

不得包含：

* Production Secret
* Password
* Private Key
* Service Account Key
* Certificate

Repository 僅保留：

Configuration Template。

---

# Secret Rotation

所有重要 Secret

應支援定期更新。

例如：

Database Password

↓

Rotate

↓

Update Configuration

↓

Restart Service

Application 不需修改。

---

# Access Control

Secret 應遵循：

Least Privilege Principle

不同元件：

僅能存取自身所需資訊。

例如：

Frontend

不可存取 Database Password。

Worker

不可存取 Frontend Secret。

---

# Backup

Configuration Backup

應與：

Business Database

分離。

Backup 不得公開。

避免：

Configuration 洩漏。

---

# Monitoring

應持續檢查：

* Missing Configuration
* Invalid Secret
* Expired Token
* Configuration Error

Application 啟動時應驗證必要設定是否完整。

---

# Future Evolution

未來可導入：

Secret Management Platform

例如：

* Google Secret Manager
* Cloudflare Secrets
* HashiCorp Vault
* AWS Secrets Manager

Application Interface 保持一致。

僅替換 Secret Provider。

---

# Relationship with Other Documents

本文件描述：

Configuration 與 Secret Infrastructure。

相關文件：

PHP Hosting Infrastructure

* Runtime Configuration

Cloudflare Infrastructure

* Worker Secrets

Google Apps Script Infrastructure

* Trigger Authentication

Security Infrastructure

* Access Control
* Authentication

各文件負責不同層級。

---

# Summary

Highlight Signal V1 採用集中式 Configuration 與 Secret Management。

所有敏感資訊皆與 Application Code 分離，並依部署環境獨立管理。

目前以 Server-side Configuration、Cloudflare Secrets 與 Google Apps Script Configuration 為核心，兼顧低成本、易維護與安全性，同時保留未來整合 Secret Manager 或企業級機密管理平台的擴充能力，而無須調整既有應用程式架構。
