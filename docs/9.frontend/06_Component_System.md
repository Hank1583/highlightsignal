# 06_Component_System

Version: v1.0

Status: Stable

---

# Purpose

Component System 定義 Highlight Signal Frontend 的 UI 元件架構。

Component 的目的包括：

* 建立可重複使用的 UI
* 降低模組耦合
* 提高一致性
* 提升維護效率
* 支援未來擴充

Component System 屬於：

Presentation Layer。

不包含：

Business Logic。

---

# Design Philosophy

Component 採用：

Small

↓

Reusable

↓

Composable

↓

Independent

每個 Component

應只負責一件事情。

---

# Design Principles

Component 遵循：

Single Responsibility

Composable

Reusable

Predictable

Replaceable

UI 元件

應與 Business Module 分離。

---

# Component Hierarchy

Highlight Signal 採用五層 Component 架構：

```text id="c8m2qp"
Application

↓

Page

↓

Module

↓

Feature Component

↓

Shared Component
```

每層皆具有不同責任。

---

# Application Layer

Application Layer

負責：

* Root Provider
* Global Context
* Theme
* Routing
* Layout

Application Layer

不包含：

Business UI。

---

# Page Layer

Page

代表：

完整頁面。

例如：

* Dashboard Page
* Signal Page
* Recommendation Page
* Settings Page

Page

負責：

組合各 Module。

---

# Module Layer

Module

代表：

一個完整功能區域。

例如：

* Signal Module
* Evidence Module
* Recommendation Module
* Notification Module

Module

管理：

自己的 UI 結構。

---

# Feature Component Layer

Feature Component

代表：

Module 中可重用的功能元件。

例如：

Signal Module：

* Signal List
* Signal Card
* Signal Summary
* Signal Filter

Recommendation Module：

* Recommendation Card
* Recommendation Summary
* Recommendation Timeline

Feature Component

可於同 Module 重複使用。

---

# Shared Component Layer

Shared Component

所有 Module

皆可使用。

例如：

* Button
* Card
* Table
* Badge
* Dialog
* Input
* Select
* Modal
* Avatar
* Loading
* Empty State

Shared Component

不得依賴：

任何 Business Module。

---

# Component Relationship

Component 組成方式：

```text id="v7q5hk"
Page

↓

Module

↓

Feature

↓

Shared Component
```

資料流：

由上而下。

---

# Component Composition

大型畫面：

由小型 Component

組成。

例如：

Dashboard

↓

Recommendation Widget

↓

Recommendation Card

↓

Badge

Button

Icon

Component 可自由組合。

---

# Component Communication

Component

應透過：

* Props
* Event
* Callback

進行互動。

避免：

跨層直接操作。

---

# Component Isolation

每個 Component

應：

* 可獨立測試
* 可獨立替換
* 可獨立開發

降低：

模組耦合。

---

# Business Separation

Business Logic

不得放入：

Shared Component。

例如：

Button

不應知道：

Signal

Recommendation

Workspace

Shared Component

只負責 UI。

---

# State Ownership

每個 Component

只管理：

自己的 Local State。

共享資料：

交由：

Module

或：

Page

管理。

避免：

State 分散。

---

# Styling

所有 Component

遵循統一：

Design System。

包含：

* Typography
* Color
* Spacing
* Border Radius
* Shadow
* Icon

保持一致視覺風格。

---

# Component Naming

命名規則：

Shared

Button

Card

Dialog

Module

SignalCard

RecommendationSummary

EvidenceTimeline

名稱應：

清楚表達用途。

---

# Accessibility

所有 Shared Component

應支援：

* Keyboard Navigation
* Focus State
* Screen Reader
* ARIA（Future）

提升可用性。

---

# Loading Component

Loading

統一使用：

Loading Component

或：

Skeleton Component。

避免：

各 Module

自行設計 Loading。

---

# Empty Component

無資料時：

統一使用：

Empty State Component。

包含：

* Illustration
* Description
* Suggested Action

提升一致性。

---

# Error Component

錯誤畫面：

統一使用：

Error Component。

包含：

* Error Message
* Retry
* Contact Support（Future）

避免：

每個 Module

自行實作。

---

# Responsive Components

Component

應支援：

Desktop

Tablet

Mobile

Layout

可調整。

Component API

保持一致。

---

# Component Directory

建議目錄：

```text id="r4m8xt"
components/

├── shared/
├── layout/
├── dashboard/
├── signal/
├── evidence/
├── recommendation/
├── notification/
└── settings/
```

依 Layer

與 Module

進行管理。

---

# Testing Strategy

Component

應具備：

* Visual Test
* Interaction Test
* Accessibility Test（Future）

Shared Component

優先測試。

---

# Future Evolution

未來可加入：

* Design Token
* Component Library
* Storybook
* Plugin Component
* Enterprise UI Kit

Application Architecture

保持一致。

---

# Relationship with Other Documents

本文件描述：

Frontend Component System。

相關文件：

Layout Framework

* Layout Structure

State Management

* Component State

Widget System

* Widget Composition

Theme Design System

* Visual Style

User Experience

* Interaction Design

各文件共同構成 Frontend 架構。

---

# Summary

Component System 定義 Highlight Signal Frontend 的 UI 元件分層與組成方式。

V1 採用 Application、Page、Module、Feature Component 與 Shared Component 五層架構，將 Business Module 與 Shared UI 完全分離。

透過可組合、可重用且低耦合的 Component Architecture，建立一致的使用體驗，提升開發效率與維護性，同時保留未來導入 Design System、Component Library 或 Plugin UI 的擴充能力，而不需改變既有 Frontend Architecture。
