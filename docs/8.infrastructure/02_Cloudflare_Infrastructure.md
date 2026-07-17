# 02_Cloudflare_Infrastructure

Version: v1.0

Status: Stable

---

# Purpose

Cloudflare 是 Highlight Signal V1 Infrastructure 的入口（Edge Layer）。

所有來自 Internet 的流量皆先進入 Cloudflare，再依照不同服務轉送至對應的 Backend。

Cloudflare 提供：

* DNS
* SSL/TLS
* CDN
* Reverse Proxy
* Edge Network
* Workers
* Security Protection

Cloudflare 不承載 Business Logic。

Business Logic 永遠位於 Backend。

---

# Design Principles

Cloudflare 在 Infrastructure 中遵循：

* Edge First
* Security by Default
* Stateless
* Global Availability
* Low Latency

Cloudflare 負責網路層。

Backend 負責商業邏輯。

Database 負責資料儲存。

---

# Cloudflare Responsibilities

Cloudflare 提供以下能力：

Network

* DNS
* Reverse Proxy
* SSL Termination

Performance

* CDN
* Static Asset Cache
* Edge Routing

Security

* HTTPS
* DDoS Protection
* WAF（Future）
* Bot Protection（Future）

Platform

* Cloudflare Workers
* Edge Functions

Cloudflare 不直接存放：

* User Data
* Business Data
* Queue Data
* Database

---

# Edge Architecture

```text
Internet

↓

Cloudflare Edge

├── DNS
├── SSL
├── CDN
├── Workers
└── Reverse Proxy

↓

Origin Services

├── Frontend
├── Backend API
└── Static Assets
```

Cloudflare 作為所有流量的入口。

Origin 永遠不直接暴露給使用者。

---

# DNS Management

Cloudflare 管理所有正式環境 DNS。

包含：

* Root Domain
* WWW
* API
* Product Subdomain

例如：

* highlightsignal.com
* [www.highlightsignal.com](http://www.highlightsignal.com)
* app.highlightsignal.com
* api.highlightsignal.com
* riskradar.highlightsignal.com

所有 DNS 皆集中管理。

---

# SSL/TLS

所有服務皆強制使用 HTTPS。

```
Client

↓

HTTPS

↓

Cloudflare SSL

↓

HTTPS

↓

Origin Server
```

禁止：

* HTTP API
* Mixed Content
* 未加密連線

SSL 憑證由 Cloudflare 管理。

---

# CDN

Cloudflare CDN 負責快取：

* JavaScript
* CSS
* Images
* Fonts
* Static Assets

不快取：

* API Response
* User Session
* Authentication
* Dynamic Business Data

避免資料一致性問題。

---

# Reverse Proxy

Cloudflare 作為 Reverse Proxy。

```
Client

↓

Cloudflare

↓

Origin
```

使用者無需知道：

* Shared Hosting IP
* Origin Server
* Backend Network

可降低直接攻擊 Origin 的風險。

---

# Cloudflare Workers

V1 Frontend 部署於：

Cloudflare Workers

透過 OpenNext 建立 Edge Runtime。

負責：

* Next.js SSR
* Routing
* Edge Rendering
* Static Delivery

Workers 不直接操作：

* MySQL
* Queue
* Worker Process

所有資料存取皆透過 Backend API。

---

# Frontend Routing

Cloudflare Workers：

```
Browser

↓

Cloudflare Worker

↓

Next.js

↓

Backend API
```

Frontend 永遠不直接存取 Database。

---

# API Routing

API Routing：

```
Browser

↓

Cloudflare

↓

PHP Backend

↓

MySQL
```

Cloudflare 不解析 API Business Logic。

僅負責：

* HTTPS
* Proxy
* Routing

---

# Static Asset Delivery

Cloudflare 快取：

* Logo
* Icons
* Images
* CSS
* JS Bundle

```
Browser

↓

Cloudflare Cache

↓

Origin（首次）

↓

Cloudflare Edge
```

降低 Origin 流量。

---

# Cache Strategy

Static Assets

Cache

Dynamic API

No Cache

Authentication

No Cache

Dashboard Data

No Cache

Scan Result

No Cache

HTML

依 Frontend Cache Policy 決定

避免：

舊資料被快取。

---

# Security

Cloudflare 提供第一層防護。

包括：

HTTPS

↓

TLS Encryption

↓

Reverse Proxy

↓

DDoS Protection

↓

Origin

未來可增加：

* WAF
* Rate Limiting
* Bot Management
* Geo Blocking

---

# Worker Security

Workers 不保存：

* Password
* JWT Secret
* Database Password
* API Secret

所有敏感資訊：

使用 Cloudflare Secrets 管理。

避免：

Hard Code Credential。

---

# Availability

Cloudflare 提供：

Global Edge Network

使用者將連線至：

最近的 Edge Node。

提升：

* Latency
* Availability
* Stability

---

# Failure Isolation

若：

Frontend 發生問題

Backend 仍可正常提供 API。

若：

Backend 發生問題

Cloudflare 仍可：

* 回傳錯誤頁面
* 提供靜態資源
* 維持 DNS

降低全面性故障。

---

# Monitoring

Cloudflare 可觀察：

* Request Count
* Bandwidth
* Cache Hit Ratio
* SSL Status
* Traffic
* Threat Events

應用程式層：

仍由 Backend Log 負責。

Cloudflare 不作為 Application Log Storage。

---

# Future Enhancements

未來可導入：

Security

* WAF
* Zero Trust
* Access Control
* API Shield

Performance

* Smart Routing
* Tiered Cache
* Cache Rules

Platform

* Durable Objects
* KV
* R2
* Queues

是否導入依產品需求決定。

---

# Infrastructure Position

Cloudflare 位於 Infrastructure 最外層。

```
Internet

↓

Cloudflare

↓

Frontend

↓

Backend API

↓

Database

↓

Worker
```

Cloudflare 不參與：

* 商業邏輯
* AI Recommendation
* Queue Processing
* Database Transaction

保持 Layer Separation。

---

# Summary

Cloudflare 為 Highlight Signal V1 提供全球 Edge Infrastructure。

主要負責：

* DNS
* SSL/TLS
* CDN
* Reverse Proxy
* Cloudflare Workers
* Edge Routing
* 基礎安全防護

Cloudflare 作為系統入口，將網路層與應用層明確分離，使 Frontend、Backend 與 Database 能各自獨立演進，同時為未來升級至 Cloud Native Infrastructure 保留完整擴充空間。
