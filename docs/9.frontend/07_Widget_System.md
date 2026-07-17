# 07_Widget_System

Version: v1.0

Status: Stable

---

# Purpose

> V1 Alignment Patch: Widget is a presentation model only. It may render Signal, Evidence, Explanation, Business Impact, Recommendation, Decision, Task status, Execution Result, or Business Outcome, but it never owns those business records.

Widget System 定義 Highlight Signal Frontend 的 Widget Architecture。

Widget 是資訊展示的最小業務單元（Business Presentation Unit）。

每個 Widget 負責呈現一項特定資訊或功能，使 Dashboard、Workspace 與各 Module 能透過組合 Widget 建立完整的使用體驗。

Widget 屬於：

Presentation Layer。

不包含：

* Business Logic
* Database Access
* AI Decision Engine

---

# Design Philosophy

Widget 採用：

Independent

↓

Reusable

↓

Composable

↓

Context-aware

每個 Widget

應能獨立存在。

亦可自由組合。

---

# Design Principles

Widget 應遵循：

Single Responsibility

Reusable

Configurable

Responsive

Replaceable

每個 Widget

只負責一項資訊呈現。

---

# Widget Architecture

Frontend Widget：

```text id="wk8n3p"
Dashboard

↓

Widget

↓

Feature Component

↓

Shared Component
```

Widget 作為：

Page

與

Component

之間的中介層。

---

# Widget Position

Widget 位於：

```text id="m5v7ra"
Workspace

↓

Dashboard

↓

Widget

↓

Component
```

Widget

屬於 Workspace Context。

---

# Widget Responsibilities

Widget 負責：

* Data Presentation
* User Interaction
* Module Entry
* Summary Information
* Quick Action

Widget 不負責：

* Business Calculation
* Permission Decision
* Database Query

上述皆由 Backend 提供。

---

# Widget Categories

Highlight Signal Widget

可分為：

Summary Widget

Signal Widget

Evidence Widget

Recommendation Widget

Notification Widget

Statistic Widget

Action Widget

Future Widget

每種類型皆可獨立演進。

---

# Summary Widget

Summary Widget

負責：

Workspace 概況。

例如：

* Total Signals
* Active Recommendations
* Pending Actions
* Health Score（Future）

作為 Dashboard 首要資訊。

---

# Signal Widget

Signal Widget

呈現：

重要 Signal。

例如：

* High Priority Signal
* New Signal
* Trending Signal

使用者可快速進入：

Signal Module。

---

# Evidence Widget

Evidence Widget

呈現：

最新 Evidence。

例如：

* Latest Evidence
* Updated Evidence
* Evidence Summary

提供：

Decision Context。

---

# Recommendation Widget

Recommendation Widget

呈現：

AI Recommendation。

例如：

* Latest Recommendation
* High Priority Recommendation
* Recommended Action

Recommendation

為 Dashboard 核心。

---

# Notification Widget

Notification Widget

呈現：

重要通知。

例如：

* System Notification
* Workspace Notification
* Alert
* Reminder

避免使用者遺漏重要事件。

---

# Statistic Widget

Statistic Widget

呈現：

統計資訊。

例如：

* Scan Count
* Evidence Count
* Success Rate
* Trend

統計僅作為：

Decision Support。

---

# Action Widget

Action Widget

提供：

快速操作。

例如：

* Start Scan
* Create Workspace
* Review Recommendation
* View Report

減少操作步驟。

---

# Widget Composition

Dashboard

由多個 Widget

組成。

例如：

```text id="u6z4hk"
Dashboard

├── Summary Widget
├── Signal Widget
├── Recommendation Widget
├── Notification Widget
└── Action Widget
```

Widget

可自由增減。

---

# Widget Lifecycle

每個 Widget：

```text id="r8q2md"
Initialize

↓

Load Data

↓

Render

↓

Refresh

↓

Destroy
```

Widget

彼此互不影響。

---

# Data Loading

每個 Widget

獨立取得資料。

```text id="t4m9xy"
Widget

↓

API

↓

Backend

↓

Response

↓

Render
```

避免：

Widget 間直接共享資料。

---

# Widget Refresh

Widget

可個別更新。

例如：

Notification Widget

更新時：

不影響：

Recommendation Widget。

降低：

重新渲染範圍。

---

# Widget State

每個 Widget

管理：

自己的 UI State。

例如：

* Loading
* Error
* Empty
* Expanded

Business State

仍由：

Module

管理。

---

# Widget Configuration

Widget

可具有：

* Size
* Title
* Display Mode
* Refresh Interval（Future）

Configuration

不影響 Business Logic。

---

# Responsive Layout

Desktop

可同時顯示多個 Widget。

Tablet

調整排列。

Mobile

採單欄排列。

保持：

相同資訊內容。

---

# Widget Communication

Widget

不得直接操作：

其他 Widget。

若需同步：

應透過：

Page

或：

Module

協調。

降低耦合。

---

# Widget Registry

系統維護：

Widget Registry。

負責：

* Widget Registration
* Widget Discovery
* Widget Loading

Future

可支援：

Plugin Widget。

---

# Widget Loading

每個 Widget

應提供：

* Skeleton
* Error State
* Empty State

避免：

整個 Dashboard

因單一 Widget 失敗而無法使用。

---

# Future Evolution

未來可加入：

* Custom Widget
* User-defined Dashboard
* Widget Marketplace
* Plugin Widget
* Enterprise Widget

Widget Architecture

保持一致。

---

# Relationship with Other Documents

本文件描述：

Frontend Widget System。

相關文件：

Widget Framework

* Widget Concept

Layout Framework

* Dashboard Layout

Component System

* Widget Composition

API Integration

* Widget Data Loading

User Experience

* Widget Interaction

各文件共同構成 Widget Architecture。

---

# Summary

Widget System 定義 Highlight Signal Frontend 的 Widget Architecture。

V1 將 Widget 作為 Workspace 與 Dashboard 的核心展示單元，透過 Summary、Signal、Evidence、Recommendation、Notification、Statistic 與 Action 等 Widget，建立可組合、可重用且可獨立更新的資訊呈現模式。

Widget 專注於資料展示與使用者互動，不承擔商業邏輯，使 Dashboard 能依需求自由組合，並保留未來導入自訂 Widget、Plugin Widget 與個人化 Dashboard 的擴充能力，而不需改變整體 Frontend Architecture。
