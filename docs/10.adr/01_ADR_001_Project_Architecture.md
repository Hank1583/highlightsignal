# ADR-001 Project Architecture

Document

01_ADR_001_Project_Architecture.md

Version: v1.0

Status: Accepted

Date: 2026-07-02

---

# Title

Adopt Modular Monolith Architecture as the Core Product Architecture

---

# Status

Accepted

---

# Context

Highlight Signal 是一套 AI-driven Decision Intelligence Platform。

產品包含：

* Workspace
* Signal
* Evidence
* Recommendation
* Notification
* Widget
* User
* Audit Log

未來仍將持續新增 Module。

Architecture 必須：

* 易於維護
* 易於開發
* 成本低
* 可逐步擴充

同時符合：

單人開發

↓

小型團隊

↓

企業團隊

不同階段。

---

# Problem

若一開始採用：

Microservices

將增加：

* Infrastructure Complexity
* Deployment Complexity
* Testing Cost
* Development Cost

而：

Traditional Monolith

又容易：

高度耦合。

需要找到兩者之間的平衡。

---

# Decision

Highlight Signal 採用：

Modular Monolith

作為 Core Architecture。

每個 Module：

具有：

* Domain Boundary
* API Boundary
* Data Boundary
* Service Boundary

但：

仍部署於同一 Backend。

---

# Rationale

採用 Modular Monolith 的原因：

降低：

* Infrastructure Cost
* Deployment Cost
* Communication Overhead

同時保留：

* Module Independence
* Clear Architecture
* Future Scalability

適合作為 SaaS V1。

---

# Consequences

優點：

* 架構清楚
* 容易維護
* 容易除錯
* 成本低
* 易於新人理解
* 可逐步拆分

缺點：

* Backend 仍為單一部署單位
* Module 間需維持 Architecture Discipline
* 超大型團隊時可能需要拆分服務

目前缺點可接受。

---

# Alternatives Considered

Traditional Monolith

優點：

* 最簡單

缺點：

* 容易高度耦合

---

Microservices

優點：

* 高度獨立
* 易於水平擴充

缺點：

* 成本高
* 維護複雜
* 不適合 V1

---

Serverless-only

優點：

* 部署容易

缺點：

* Business Boundary 不明確
* 不利大型產品演進

---

# Future Evolution

當：

* Team Growth
* Traffic Growth
* Module Growth

達到一定規模時，

可逐步將：

Signal

Recommendation

Notification

等 Module

拆分為獨立 Service。

Architecture

無需重新設計。

---

# References

Architecture

* Core Framework
* Module Framework
* Backend Overview
* Infrastructure Overview

---

# Summary

Highlight Signal 採用 Modular Monolith 作為產品核心架構。

此決策在開發效率、維護成本、系統清晰度與未來擴充能力之間取得平衡，符合產品目前的規模與發展策略，並保留未來逐步演進為分散式架構的可能性，而不需重建整個系統。
