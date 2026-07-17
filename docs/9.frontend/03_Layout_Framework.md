# 03_Layout_Framework

Version: v1.0

Status: Stable

---

# Purpose

Layout Framework 定義 Highlight Signal Frontend 的整體畫面結構（Layout Structure）。

Layout 的目的不是呈現資料。

而是建立一致的：

Navigation

↓

Workspace Context

↓

Module Structure

↓

Content Area

使所有頁面擁有相同的操作體驗。

---

# Design Philosophy

Layout 採用：

Workspace First

↓

Content Second

使用者永遠知道：

* 目前在哪一個 Workspace
* 目前位於哪一個 Module
* 下一步可以做什麼

Layout 應協助決策。

而不是增加資訊負擔。

---

# Design Principles

Layout 遵循：

Consistent

所有 Module 使用相同 Layout。

Predictable

相同功能位於相同位置。

Responsive

適用 Desktop、Tablet、Mobile。

Scalable

可加入新的 Module。

Independent

Layout 不包含 Business Logic。

---

# Layout Architecture

Frontend Layout：

```text id="g8k2pw"
Application

↓

Root Layout

↓

Workspace Layout

↓

Module Layout

↓

Content

↓

Component
```

每一層皆具有單一責任。

---

# Root Layout

Root Layout

負責：

* Application Shell
* Theme
* Global Provider
* Authentication Context
* Global Notification
* Global Dialog

Root Layout

不包含：

Business Module。

---

# Application Shell

Application Shell

提供：

* Navigation Container
* Layout Structure
* Global Loading
* Error Boundary

Application 啟動後，

Shell 保持持續存在。

避免：

頻繁重新建立 UI。

---

# Workspace Layout

Workspace Layout

為系統主要 Layout。

包含：

* Workspace Header
* Sidebar
* Content Area
* Breadcrumb
* Workspace Switcher

所有 Module

皆共用此 Layout。

---

# Workspace Structure

```text id="v6p9ka"
Workspace

├── Header
├── Sidebar
├── Content
└── Footer（Future）
```

Workspace 為主要操作環境。

---

# Header

Header

負責：

* Workspace Name
* User Profile
* Notification
* Search（Future）
* Workspace Switcher

Header

保持固定位置。

---

# Sidebar

Sidebar

負責：

Module Navigation。

例如：

* Dashboard
* Signals
* Evidence
* Recommendations
* Notifications
* Settings

Sidebar

應保持一致。

避免：

不同 Module 擁有不同 Navigation。

---

# Content Area

Content Area

負責：

目前 Module 的主要內容。

例如：

Dashboard

↓

Widget

Signal

↓

Signal List

Recommendation

↓

Recommendation Detail

Layout

不限制內容形式。

---

# Breadcrumb

Breadcrumb

顯示：

目前位置。

例如：

```text id="m2x7qt"
Workspace

↓

Signals

↓

Signal Detail
```

降低使用者迷失方向。

---

# Module Layout

每個 Module

可擁有自己的 Secondary Layout。

例如：

Signal

* Filter
* Toolbar
* List

Recommendation

* Summary
* Evidence
* Action

Module Layout

保持一致操作方式。

---

# Dashboard Layout

Dashboard

採用：

Widget-based Layout。

例如：

```text id="p3w8lr"
Header

↓

Summary Widget

↓

Signal Widget

↓

Recommendation Widget

↓

Notification Widget
```

Dashboard

不應成為資訊堆積區。

---

# Detail Layout

Detail Page

採用：

Master

↓

Detail

模式。

例如：

Signal

↓

Evidence

↓

Recommendation

保持閱讀流程一致。

---

# Dialog Layer

Global Dialog

提供：

* Confirm
* Alert
* Form Dialog
* Action Dialog

Dialog

不依附於特定 Module。

---

# Notification Layer

Notification Layer

提供：

* Toast
* Success Message
* Warning
* Error

所有 Module

共用相同通知方式。

---

# Loading Layout

Loading

採用：

Skeleton

優先於：

Spinner。

讓使用者維持版面感知。

---

# Empty State

當沒有資料時：

提供：

* Empty Illustration
* Empty Message
* Suggested Action

避免：

空白頁。

---

# Error Layout

Error State

應提供：

* Error Message
* Retry
* Contact Support（Future）

避免：

僅顯示 HTTP Error。

---

# Responsive Layout

Desktop

採用：

Sidebar + Content

Tablet

Sidebar

可收合。

Mobile

採用：

Drawer Navigation

保持相同資訊架構。

---

# Theme Support

Layout

應支援：

* Light Theme
* Dark Theme（Future）

不影響：

Module Layout。

---

# Accessibility

Layout

應支援：

* Keyboard Navigation
* Screen Reader
* High Contrast（Future）
* Focus Indicator

提升整體可用性。

---

# Future Evolution

未來可加入：

* Multi Workspace Layout
* Organization Layout
* Split View
* Plugin Layout
* Custom Dashboard Layout

保持：

Root Layout

與

Workspace Layout

不變。

---

# Relationship with Other Documents

本文件描述：

Layout Framework。

相關文件：

Frontend Overview

* Frontend Layer

Routing Architecture

* Page Navigation

Component System

* UI Components

Widget System

* Dashboard Widgets

User Experience

* Interaction Design

各文件共同構成 Frontend 架構。

---

# Summary

Layout Framework 定義 Highlight Signal Frontend 的整體畫面骨架。

V1 採用 Workspace-centric Layout，由 Root Layout、Workspace Layout、Module Layout 與 Content Area 組成，建立一致的導航、版面與操作流程。

Layout 專注於提供穩定的使用者介面結構，不承擔 Business Logic，使各 Module 能在相同的 UI Framework 下獨立演進，同時保留未來擴充更多 Workspace、Organization 與 Plugin Layout 的能力。
