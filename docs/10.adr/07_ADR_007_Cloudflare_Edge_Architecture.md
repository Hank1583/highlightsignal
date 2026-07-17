# ADR-007 Cloudflare Edge Architecture

Document

07_ADR_007_Cloudflare_Edge_Architecture.md

Version: v1.0

Status: Accepted

Date: 2026-07-02

---

# Title

Adopt Cloudflare as the Primary Edge Infrastructure Platform

---

# Status

Accepted

---

# Context

Highlight Signal V1 採用：

Frontend

↓

Cloudflare Workers

Backend

↓

PHP Shared Hosting

Database

↓

MySQL

因此需要一個：

* 全球入口
* HTTPS
* DNS
* CDN
* Edge Runtime

同時維持：

低成本

高可用性

簡單部署。

---

# Problem

若 Frontend

直接部署於：

Shared Hosting

則：

* 全球存取效能較差
* SSL 管理較繁瑣
* 無 Edge Computing
* 無 CDN

若直接採用：

Cloud Platform

則：

Infrastructure

成本提高。

需要找到：

最佳平衡方案。

---

# Decision

Highlight Signal 採用：

Cloudflare

作為：

Primary Edge Infrastructure。

負責：

* DNS
* HTTPS
* CDN
* Reverse Proxy
* Edge Runtime
* Frontend Deployment

Backend

仍維持：

PHP Shared Hosting。

---

# Architecture

Edge Layer：

```text id="cf2a8m"
Browser

↓

Cloudflare

├── DNS
├── SSL
├── CDN
├── Workers
└── Reverse Proxy

↓

PHP Backend

↓

MySQL
```

Cloudflare

成為：

唯一 Internet Entry Point。

---

# Rationale

Cloudflare 提供：

Global Edge Network

全球節點。

Automatic HTTPS

SSL 管理容易。

CDN

提升靜態資源速度。

Workers

可直接部署 Frontend。

Reverse Proxy

保護 Origin。

Deployment Simple

與既有架構高度相容。

---

# Consequences

優點：

* 全球 Edge Network
* SSL 自動管理
* CDN 加速
* Frontend 部署簡單
* 保護 Origin
* Infrastructure 成本低

缺點：

* 增加一層 Proxy
* 部分功能依賴 Cloudflare
* Workers Runtime 與 Node.js 存在差異

上述限制可接受。

---

# Alternatives Considered

## Direct Hosting

Browser

↓

Shared Hosting

優點：

* 架構最簡單

缺點：

* 無 CDN
* 無 Edge
* 無 DDoS Protection
* 全球效能較差

---

## Google Cloud

優點：

* 整合完整
* Cloud Native

缺點：

* 成本較高
* Infrastructure 複雜
* 超出 V1 需求

---

## AWS

優點：

* 功能完整
* 全球部署能力佳

缺點：

* 維護成本高
* 學習曲線較高
* V1 屬於過度設計

---

## Self-managed CDN

優點：

* 自主控制

缺點：

* 維護困難
* 成本高
* 無明顯優勢

---

# Architectural Impact

Cloudflare

位於：

Architecture

最外層。

影響：

Frontend

* Deployment
* Routing

Infrastructure

* DNS
* HTTPS
* CDN

Backend

* Reverse Proxy

Application

不受影響。

---

# Security Impact

Cloudflare

提供：

* HTTPS
* SSL
* Reverse Proxy
* DDoS Protection

Future：

可加入：

* WAF
* Zero Trust
* API Shield

Application Security

仍由 Backend

負責。

---

# Deployment Impact

Frontend：

部署於：

Cloudflare Workers。

Backend：

部署於：

PHP Shared Hosting。

Frontend

與

Backend

可獨立更新。

Deployment

保持低耦合。

---

# Scalability

Cloudflare

可支援：

* 全球 Edge
* 更多 Domain
* 更多 Product
* 更多 Workspace

Infrastructure

無需重新設計。

---

# Evolution Strategy

未來：

Backend

可逐步升級：

Cloud Run

Container

Kubernetes

Cloudflare

仍作為：

Edge Layer。

Architecture

保持一致。

---

# Future Evolution

V1

Cloudflare Workers

↓

V2

Cloudflare + Cloud Run

↓

V3

Cloud Native Platform

↓

Enterprise

Global Multi-region

Cloudflare

仍維持：

Internet Entry Point。

---

# References

Infrastructure

* Cloudflare Infrastructure
* Deployment Infrastructure

Frontend

* Frontend Overview

Architecture

* Infrastructure Layer

ADR

* ADR-003 PHP Backend Architecture

---

# Summary

Highlight Signal 採用 Cloudflare 作為 Primary Edge Infrastructure，提供 DNS、HTTPS、CDN、Reverse Proxy 與 Frontend Deployment 能力。

此決策使 Frontend、Backend 與 Infrastructure 能保持低耦合，在維持低成本與簡單部署的同時，提供全球 Edge Network 與穩定的網路層能力。

未來即使 Backend 遷移至 Cloud Run、Container 或其他雲端平台，Cloudflare 仍可持續擔任系統的 Edge Layer，而無須調整整體 Product Architecture。
