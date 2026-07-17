# 00 Framework Overview

Version: v1.0

Status: Stable

Layer: 3.framework

---

# Purpose

Framework 定義 Highlight Signal 的整體運作模式。

Concepts 告訴我們有哪些核心概念。

Framework 則定義這些概念如何互相合作，形成完整的 Decision Intelligence Platform。

Framework 並不新增新的產品功能。

它建立的是產品運作規則（Operating Model）。

---

# Why Framework

Concept 定義的是：

「這是什麼？」

例如：

* Workspace
* Signal
* Evidence
* Insight
* Recommendation
* Decision

Framework 定義的是：

「它們如何一起運作？」

因此：

Concept 是產品詞彙。

Framework 是產品流程。

Architecture 則是 Framework 的技術實現。

---

# Documentation Hierarchy

Highlight Signal Documentation 採用以下層次。

Handbook

↓

Concepts

↓

Framework

↓

Architecture

↓

Database

↓

API

↓

Backend

↓

Frontend

↓

ADR

每一層都有不同責任。

Handbook 定義產品理念。

Concepts 定義核心概念。

Framework 定義產品運作方式。

Architecture 定義技術設計。

Database、API、Backend 與 Frontend 則將 Framework 落實為可執行的系統。

---

# Framework Philosophy

Highlight Signal 不以功能為核心。

而是以 Decision Intelligence 為核心。

所有 Framework 都必須回答同一個問題：

如何協助使用者做出更好的 Decision？

如果一個功能無法改善 Decision Quality、Decision Speed 或 Decision Confidence，它就不應成為 Framework 的一部分。

---

# Framework Layers

Highlight Signal 採用 Layered Framework。

## Integration Layer

負責整合外部世界。

例如：

* Google Analytics
* Google Search Console
* Google Ads
* Cloud Platform
* Security Scanner
* API
* Webhook
* File Import

Integration Layer 的目的是將不同來源的資料轉換為統一格式。

---

## Context Layer

建立 AI 理解目前情境所需的上下文。

包括：

* Workspace
* Goal
* User
* Role
* Business Context

所有 Intelligence 都必須建立於 Context。

---

## Intelligence Layer

將資料轉換為可理解的 Intelligence。

主要包含：

* Signal
* Evidence
* Insight

AI 在此完成觀察、分析與理解。

---

## Decision Layer

將 Intelligence 轉換為可執行的決策。

包括：

* Recommendation
* Decision

Highlight Signal 採用 Human-AI Collaboration，而不是 AI Replacement。

---

## Execution Layer

將 Decision 轉換為實際行動。

包括：

* Task
* Workflow
* Automation
* Agent Action

Decision 只有真正執行後，才能產生價值。

---

## Learning Layer

持續累積企業知識。

包括：

* Knowledge
* Learning
* Organizational Experience

Learning Layer 讓系統隨著使用而持續成長。

---

## Governance Layer

確保整個系統可被管理、追蹤與治理。

包括：

* Permission
* Policy
* Audit Trail
* Compliance
* Human Approval

Governance 並不是限制 AI，而是建立可信任的 AI。

---

# Decision Intelligence Cycle

Highlight Signal 的核心循環如下：

Observe

↓

Understand

↓

Recommend

↓

Decide

↓

Execute

↓

Learn

↓

Observe Again

每一次循環，都會讓企業累積更多經驗。

Framework 的目的，就是維持這個循環持續運作。

---

# Relationship with Concepts

Framework 並不取代 Concepts。

Framework 建立於 Concepts 之上。

例如：

Workspace 提供 Context。

Signal 描述事件。

Evidence 建立可信度。

Insight 建立理解。

Recommendation 提供建議。

Decision 完成人機協作。

Knowledge 保存企業經驗。

AI Assistant 提供智慧互動。

Framework 將這些 Concept 串連成一個完整系統。

---

# Relationship with Architecture

Architecture 是 Framework 的實作方式。

例如：

Framework 定義：

Workspace 是 Context Layer 的核心。

Architecture 則定義：

* Workspace Service
* Workspace Repository
* Workspace Event
* Workspace API

因此：

Framework 定義規則。

Architecture 定義實作。

---

# Design Principles

所有 Framework 都必須遵循以下原則。

* Decision First
* Context Aware
* Evidence Driven
* Explainable AI
* Human Governance
* Continuous Learning
* Extensible Design

任何新增功能，都應符合這些原則。

---

# Framework Documents

Framework 目前包含：

* 00 Framework Overview
* 01 Product Framework
* 02 Decision Framework
* 03 Intelligence Framework
* 04 Execution Framework
* 05 Learning Framework
* 06 Governance Framework
* 07 Communication Framework
* 08 Integration Framework
* 09 AI Framework
* 10 Continuous Intelligence Framework

每一份文件描述一個系統層級，而非單一功能。

---

# Framework Freeze

Framework 是產品的運作規格。

一旦進入 Architecture、Database 與 Backend 開發階段，Framework 將凍結為對應版本。

例如：

* Framework v1.0
* Architecture v1.0
* Database v1.0

新的想法將進入下一個版本，而不是直接修改已凍結的 Framework。

這能確保開發期間擁有穩定且一致的規格。

---

# Summary

Framework 是 Highlight Signal 的 Operating Model。

它描述產品如何運作，而不是產品有哪些功能。

Framework 將 Concepts 組織成完整的 Decision Intelligence System，並作為後續 Architecture、Database、API 與程式開發的共同依據。

Framework 是 Highlight Signal 從產品理念走向工程實作的重要橋樑，也是整個 Documentation System 的核心。
