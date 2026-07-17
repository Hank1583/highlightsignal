# ADR-006 Decision-first User Experience

Document

06_ADR_006_Decision_First_User_Experience.md

Version: v1.0

Status: Accepted

Date: 2026-07-02

---

# Title

Adopt Decision-first User Experience as the Primary Product Design Philosophy

---

# Status

Accepted

---

# Context

傳統 Dashboard 型產品通常以：

* Charts
* Metrics
* Reports
* Tables

作為首頁。

使用者需要：

自行閱讀資料

↓

自行分析

↓

自行判斷

↓

自行決策

當產品資料量增加時，

Dashboard 往往變成資訊展示中心，而不是決策工具。

Highlight Signal 的目標不是提供更多資訊，

而是協助使用者更快完成決策。

---

# Problem

Information-first Dashboard

容易造成：

* Information Overload
* Dashboard Fatigue
* Important Signal 被淹沒
* Decision Delay

使用者知道：

發生了很多事情。

卻不知道：

現在最重要的是什麼。

---

# Decision

Alignment Patch v1.2: Decision-first does not mean autonomous decision-making. Evidence supports Explanation and Business Impact; Recommendation is reviewed by a human; Human Review creates a formal Decision before an Action is authorized. This patch supersedes shorter flow diagrams in this ADR.

Highlight Signal 採用：

Decision-first User Experience。

所有主要畫面：

皆圍繞：

Signal

↓

Evidence

↓

Recommendation

↓

Action

建立一致的決策流程。

---

# Decision Flow

所有主要操作：

遵循：

```text id="df6t2p"
Signal

↓

Evidence

↓

Recommendation

↓

Action
```

系統優先回答：

* 發生了什麼？
* 為什麼重要？
* 建議怎麼做？
* 下一步是什麼？

而不是：

顯示所有資料。

---

# Rationale

Decision-first

可提供：

Reduced Cognitive Load

降低思考成本。

Action-oriented

直接導向下一步。

Consistency

所有 Module

皆遵循相同流程。

Scalability

新增 Module

仍可使用相同 Decision Model。

符合：

AI Decision Intelligence Platform

定位。

---

# Consequences

優點：

* 降低資訊負擔
* 提高決策效率
* 使用流程一致
* 更符合 AI 輔助產品定位
* Dashboard 更聚焦

缺點：

* Dashboard 呈現資訊較少
* 需建立良好的 Recommendation 品質
* 初期需教育使用者操作模式

上述皆可接受。

---

# Alternatives Considered

## Dashboard-first

首頁：

大量 KPI

↓

Chart

↓

Table

↓

Report

優點：

* 傳統 BI 模式
* 使用者熟悉

缺點：

* Decision Support 較弱
* Information Overload
* 難以聚焦真正重要事項

---

## Report-first

流程：

Report

↓

Analysis

↓

Decision

優點：

* 適合稽核

缺點：

* 即時性不足
* 操作流程較長

---

## Search-first

流程：

Search

↓

Result

↓

Action

優點：

* 查詢效率高

缺點：

* 使用者必須知道要找什麼
* 無法主動提醒重要事件

---

# Architectural Impact

Decision-first

影響：

Product

* Product Philosophy

Architecture

* Recommendation Framework

Frontend

* Dashboard
* Widget
* UX

Backend

* Recommendation Engine

AI

* Decision Support

整個系統：

皆圍繞 Decision。

---

# Dashboard Impact

Dashboard

定位改變：

不是：

Information Center

而是：

Decision Center

Dashboard

優先顯示：

* Critical Signal
* Recommendation
* Pending Action
* Important Notification

非所有統計資料。

---

# Widget Impact

Widget

應優先呈現：

Decision Information。

例如：

Recommendation Widget

優先於：

Statistics Widget。

Signal Widget

優先於：

Trend Chart。

---

# User Experience Impact

UX

遵循：

```text id="ux5v8n"
Understand

↓

Evaluate

↓

Decide

↓

Act
```

所有 Module

保持一致體驗。

---

# Future Evolution

未來：

AI

可逐步加入：

* AI Summary
* AI Recommendation
* AI Priority
* AI Workflow

Decision-first

保持核心理念。

---

# Evolution Strategy

即使：

Dashboard

Recommendation

Widget

UX

持續演進，

Decision Flow

保持不變。

Architecture

無須重新設計。

---

# References

Handbook

* Decision First Experience
* AI Recommendation Engine

Architecture

* Recommendation Framework
* Widget Framework

Frontend

* User Experience
* Widget System
* Layout Framework

---

# Summary

Highlight Signal 採用 Decision-first User Experience 作為核心產品設計哲學。

此決策將產品重心由資訊展示轉向決策支援，使 Signal、Evidence、Explanation、Business Impact、Recommendation、Human Review、Decision 與 Action 成為所有 Module 的共同流程。

Dashboard、Widget、Frontend 與 AI Recommendation Engine 均圍繞相同的 Decision Flow 設計，使 Highlight Signal 不只是 Dashboard 系統，而是一套真正協助使用者理解、判斷並採取行動的 AI Decision Intelligence Platform。
