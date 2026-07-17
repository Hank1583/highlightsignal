# 08_User_Experience

Version: v1.0

Status: Stable

## Governing design principle

> Every page should answer one question first: **What decision should the user make?** Everything else—scores, charts, trends, history, and methods—exists only to support that decision, never to compete with it.

Implementation rules:

- Decision Flow always precedes Overview Metadata and Supporting Detail.
- AI Summary states what is happening.
- Top Recommendation states what the user should do.
- Business Impact states what happens to the business if no action is taken.
- Evidence includes only the minimum evidence that directly supports the recommendation.
- History, trends, charts, scoring methods, and technical detail are collapsed by default.
- Action is a Next Step workflow, not a single CTA. It may offer Task Creation, Reanalysis, Sprint Planning, Weekly Report tracking, or an enterprise owner assignment.
- Human Review remains between AI Recommendation and Action.

## Dashboard first-screen hierarchy (implemented 2026-07-03)

`AI Summary → Top Recommendation → Evidence → Business Impact → Human Review → Action / Task Creation`

- Do not lead with KPI cards, charts, filters, or data-source status.
- Render metrics as compact Evidence Cards with context and source readiness.
- Keep the recommendation visually dominant and explicitly separate it from the human decision.
- Keep task creation unavailable until Human Review records an approval.
- Put onboarding, filters, charts, and alternate AI analysis behind progressive disclosure.

The same hierarchy applies to the overview pages for Website Analytics, Search Health, AI Readiness, and AI Visibility. Detail routes may focus on evidence exploration and do not need to repeat Human Review controls. Technical acronyms such as GA, SEO, AEO, and GEO remain secondary labels rather than primary navigation language.

---

# Purpose

> V1 Alignment Patch: Decision-first UX follows Signal → Evidence → Explanation and Business Impact → Recommendation → Human Review → Decision → Action. It does not imply autonomous decision-making.

User Experience 定義 Highlight Signal 的整體互動體驗（UX）設計原則。

UX 的目的不是讓介面更華麗。

而是協助使用者：

快速理解

↓

快速判斷

↓

快速決策

↓

快速採取行動

所有介面皆應支援 Decision First Experience。

---

# Design Philosophy

Highlight Signal 採用：

Decision First

而不是：

Information First

系統應回答：

現在發生了什麼？

↓

為什麼發生？

↓

應該怎麼做？

而不是：

提供大量資料讓使用者自行分析。

---

# UX Principles

所有互動遵循：

Simple

Clear

Consistent

Fast

Predictable

Actionable

降低學習成本。

提升決策效率。

---

# User Journey

典型操作流程：

```text id="ux7k3n"
Login

↓

Workspace

↓

Dashboard

↓

Signal

↓

Evidence

↓

Recommendation

↓

Action
```

每一步皆應自然銜接。

---

# Information Hierarchy

畫面資訊依重要程度排列：

Critical

↓

Important

↓

Supporting

↓

Detail

避免：

所有資訊具有相同權重。

---

# Decision Flow

每個主要畫面皆應回答：

What Happened

↓

Why

↓

Recommendation

↓

Action

保持一致的思考流程。

---

# Progressive Disclosure

預設：

只顯示必要資訊。

需要時：

逐步展開：

* Detail
* Evidence
* History
* Metadata

避免：

首次載入資訊過多。

---

# Loading Experience

所有 Loading

應提供明確回饋。

優先使用：

Skeleton

其次：

Loading Indicator

避免：

空白畫面。

---

# Empty State

沒有資料時，

應提供：

* Empty Illustration
* Empty Description
* Suggested Action

例如：

尚未建立 Workspace。

↓

建立第一個 Workspace

空狀態應引導下一步。

---

# Error Experience

發生錯誤時，

應提供：

* Error Description
* Retry
* Alternative Action

避免：

僅顯示：

Error 500

使用者應知道：

下一步如何處理。

---

# Success Feedback

操作成功後，

應立即提供回饋。

例如：

* Toast
* Success Message
* Status Update

讓使用者確認：

操作已完成。

---

# Confirmation

可能造成重大影響的操作，

應要求確認。

例如：

* Delete
* Reset
* Remove Member
* Cancel Scan

降低誤操作。

---

# Navigation Experience

Navigation

應符合：

One Direction

使用者不需反覆切換不同區域。

Workspace

應保持固定 Context。

---

# Consistency

相同操作：

保持一致。

例如：

Create

永遠位於相同位置。

Delete

永遠採用相同確認流程。

避免：

不同 Module

不同操作方式。

---

# Response Time

系統應盡可能：

立即回應。

若需要等待：

提供：

* Progress
* Loading
* Current Status

讓使用者知道：

系統仍在運作。

---

# Accessibility

UX

應考量：

* Keyboard Navigation
* Screen Reader
* Color Contrast
* Focus Indicator
* Readable Font Size

提升可用性。

---

# Mobile Experience

Mobile

保持：

與 Desktop

相同資訊架構。

調整：

* Layout
* Navigation
* Spacing

而非改變流程。

---

# Notification Experience

通知應：

Relevant

Timely

Actionable

避免：

大量無意義通知。

每則通知

皆應具有明確目的。

---

# Search Experience

Future

Search

應支援：

* Workspace Search
* Signal Search
* Recommendation Search
* Global Search

搜尋結果

應可直接採取行動。

---

# Personalization

Future

可支援：

* Favorite Workspace
* Dashboard Preference
* Widget Layout
* Theme
* Notification Preference

不改變核心 UX。

---

# Performance Experience

UX

不只是速度。

還包括：

* Smooth Navigation
* Stable Layout
* Predictable Interaction
* Minimal Waiting

避免：

Layout Shift

與

畫面跳動。

---

# Trust Experience

Highlight Signal

應建立：

可信任的使用體驗。

包括：

* 一致的資料
* 清楚的狀態
* 可追蹤的操作
* 明確的錯誤說明

使用者應知道：

系統正在做什麼。

---

# Future Evolution

未來可加入：

* AI Assistant
* Guided Workflow
* Smart Recommendation UI
* Adaptive Dashboard
* Personalized UX

Decision First

保持不變。

---

# Relationship with Other Documents

本文件描述：

User Experience。

相關文件：

Decision First Experience

* UX Philosophy

Layout Framework

* UI Structure

Widget System

* Information Presentation

State Management

* UI State

Theme Design System

* Visual Design

各文件共同構成 Frontend Experience。

---

# Summary

User Experience 定義 Highlight Signal 的互動設計原則。

V1 以 Decision First Experience 為核心，透過一致的導航、資訊層級、回饋機制、載入狀態、錯誤處理與行動引導，建立清楚、快速且可信任的使用體驗。

UX 不追求資訊數量，而是協助使用者在最短時間內理解現況、完成決策並採取行動，同時保留未來導入 AI Assistant、個人化介面與智慧工作流程的擴充能力。
