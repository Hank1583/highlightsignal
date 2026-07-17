# ADR-002 Workspace-centric Architecture

Document

02_ADR_002_Workspace_Centric_Architecture.md

Version: v1.0

Status: Accepted

Date: 2026-07-02

---

# Title

Adopt Workspace-centric Architecture as the Primary Context Model

---

# Status

Accepted

---

# Context

Highlight Signal 是一套 AI Decision Intelligence Platform。

系統包含：

* User
* Workspace
* Signal
* Evidence
* Recommendation
* Notification
* Widget

所有資料皆需要：

* 清楚歸屬
* 容易隔離
* 易於權限管理
* 支援多人協作

因此需要建立統一的 Context Model。

---

# Problem

若所有資料直接隸屬於 User：

```text
User

↓

Signal

↓

Recommendation
```

將產生：

* 無法多人共享
* 權限管理困難
* 難以支援團隊
* 難以擴充企業版本

另一種方式：

所有資料直接散落於各 Module。

則容易：

* Context 不一致
* Module 高度耦合
* Navigation 複雜

需要建立共同的 Context。

---

# Decision

Highlight Signal 採用：

Workspace

作為整個系統的 Primary Context。

所有 Business Data：

皆隸屬於：

Workspace。

架構如下：

```text
Workspace

├── Signal
├── Evidence
├── Recommendation
├── Notification
├── Widget
└── Settings
```

Workspace 成為：

所有 Module 的共同入口。

---

# Rationale

Workspace 能提供：

Context Isolation

所有資料皆具有明確歸屬。

Permission Boundary

權限可依 Workspace 控制。

Module Organization

所有 Module 保持一致結構。

Scalability

可支援：

* Personal Workspace
* Team Workspace
* Enterprise Workspace

而不需修改資料模型。

---

# Consequences

優點：

* Context 清楚
* Module 一致
* Navigation 簡單
* Permission 容易管理
* 支援多人協作
* 易於擴充企業版本

缺點：

* 每個 Module 都需帶入 Workspace Context
* API 與 Routing 結構較長
* 初期實作稍微增加複雜度

上述成本可接受。

---

# Alternatives Considered

## User-centric Model

架構：

```text
User

↓

All Resources
```

優點：

* 結構簡單
* 開發快速

缺點：

* 難以共享
* 不利團隊協作
* Enterprise 擴充困難

---

## Organization-centric Model

架構：

```text
Organization

↓

Resources
```

優點：

* 適合大型企業

缺點：

* 對 SaaS V1 過於複雜
* 個人使用者體驗較差

---

## Module-centric Model

架構：

```text
Signal

Evidence

Recommendation
```

彼此獨立。

優點：

* Module 簡單

缺點：

* 缺乏共同 Context
* Navigation 不一致
* Permission 分散

---

# Architectural Impact

Workspace 成為：

Architecture 的核心節點。

影響：

Frontend

* Routing
* Layout
* Navigation

Backend

* API
* Permission
* Service

Database

* Data Ownership
* Foreign Key

Infrastructure

* Deployment 不受影響

所有 Layer

皆以 Workspace 為中心。

---

# Future Evolution

未來可演進：

```text
Organization

↓

Workspace

↓

Module
```

或：

```text
Personal Workspace

Team Workspace

Enterprise Workspace
```

Workspace Interface

保持一致。

Application Architecture

無須修改。

---

# References

Architecture

* Workspace Framework
* Information Architecture

Frontend

* Routing Architecture
* Layout Framework

Backend

* Workspace Backend

Database

* Workspace Schema

---

# Summary

Highlight Signal 採用 Workspace-centric Architecture 作為整個系統的 Primary Context。

Workspace 提供一致的資料歸屬、權限邊界與導航結構，使 Signal、Evidence、Recommendation、Notification 與其他 Module 能在相同 Context 下協同運作。

此決策兼顧 V1 的簡潔性與未來 Enterprise 擴充能力，成為整個 Product Architecture、Frontend、Backend 與 Database 的共同基礎。
