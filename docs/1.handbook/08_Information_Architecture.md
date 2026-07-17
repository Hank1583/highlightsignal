# Information Architecture

Version: v1.0
Last Update: 2026-07

## Frontend IA alignment (2026-07-03)

Primary product navigation uses decision and business language. GA, SEO, AEO, and GEO are Evidence Sources rather than standalone product identities.

```text
Decision Center
→ Recommendations / Human Review
→ Action
→ Evidence Sources
   → Website Analytics (GA)
   → Search Health (SEO)
   → AI Readiness (AEO)
   → AI Visibility (GEO)
→ Supporting Detail / Raw Data
```

Module overview pages follow the shared Decision-first contract: AI Summary → Top Recommendation → Business Impact → Evidence → Human Review → Action. Charts, scores, history, tables, and technical panels are supporting evidence and must not lead the overview.

Overview metadata follows Action. Supporting Detail is collapsed by default. A completed Human Review may lead to one explicit Next Step such as creating a task, reanalyzing, adding work to a sprint, or tracking it in a weekly report.

---

# Purpose

Information Architecture (IA)

定義 Highlight Signal 的資訊架構。

本文件不定義：

- UI Design
- Color
- Layout
- Icon

而是定義：

- 資訊層級
- Navigation
- Module Structure
- User Flow

Information Architecture 應保持穩定，

即使 UI 改版，

IA 也不應輕易改變。

---

# Information Hierarchy

Highlight Signal 採用五層資訊架構。

Workspace

↓

Workspace Home

↓

Modules

↓

Evidence

↓

Raw Data

每一層都有不同責任。

---

# Level 1
## Workspace

Workspace 是使用者登入後的工作空間。

Workspace 不等於 Dashboard。

Workspace 是：

企業每天工作的地方。

包含：

- Today's Signals
- Website
- Search
- Social
- Advertising
- Security
- Reports
- Settings

---

# Level 2
## Workspace Home

Workspace Home 是登入後首頁。

Workspace Home 不展示大量 Dashboard。

Workspace Home 的目的是：

回答：

今天發生什麼？

今天先做什麼？

Workspace Home 永遠以 AI 為核心。

---

Workspace Home 包含：

Today's Signals

AI Summary

Top 3 Actions

Business Pulse

Evidence Preview

Recent Changes

Notifications

Workspace Home 是：

Decision Layer。

---

# Today's Signals

Today's Signals 是 Workspace Home 最重要的區塊。

Today's Signals 回答：

今天有哪些重要商業訊號？

AI 將訊號分類：

Action Required

Watch

Opportunity

Healthy

使用者應先閱讀 Today's Signals。

而不是 Dashboard。

---

# AI Summary

Today's Signals 下方。

AI Summary 回答：

發生什麼？

為什麼？

影響是什麼？

今天建議什麼？

AI Summary 不應只是摘要。

而是：

Decision Summary。

---

# Top 3 Actions

Highlight Signal 永遠提供：

最多三項建議。

避免資訊過載。

AI 必須完成：

Priority Ranking。

使用者只需要完成：

Decision。

---

# Business Pulse

Business Pulse

提供企業目前整體狀況。

Business Pulse

不是 Dashboard。

而是：

Business Layer 的健康概況。

例如：

Exposure

Traffic

Engagement

Lead

Conversion

Retention

Business Pulse 回答：

整體是否健康？

---

# Evidence Preview

Workspace Home

不直接展示完整 Dashboard。

僅顯示：

目前最重要的 Evidence。

若需要深入，

再進入 Module。

---

# Recent Changes

Recent Changes

記錄：

最近七天的重要變化。

例如：

Traffic

SEO

Ads

Security

Business

讓使用者快速了解：

最近有哪些趨勢。

---

# Notifications

Workspace Home

整合：

Daily Brief

Weekly Report

Security Alert

System Notice

所有通知。

---

# Level 3
## Modules

Workspace 採用模組化設計。

目前包含：

Website

Search

Social

Advertising

Security

未來：

CRM

POS

ERP

Finance

Customer Service

新增 Module

不得影響整體 IA。

---

# Module Structure

所有 Module

必須遵守一致架構。

Module

↓

AI Summary

↓

Signals

↓

Evidence

↓

Raw Data

所有 Module

都採相同設計。

降低學習成本。

---

# Website Module

包含：

Website AI Summary

Website Signals

Evidence

Landing Pages

Performance

Raw Analytics

---

# Search Module

包含：

Search AI Summary

Search Signals

SEO

GEO

AEO

Keyword

Evidence

---

# Social Module

包含：

Social AI Summary

Facebook

Instagram

Threads

Engagement

Evidence

---

# Advertising Module

包含：

Ads AI Summary

Google Ads

Meta Ads

Campaign

ROAS

Evidence

---

# Security Module

包含：

RiskRadar Summary

Security Signals

Website Health

SSL

Secret Scan

Docker Scan

Evidence

---

# Level 4
## Evidence

Evidence

是所有 Module

共同遵守的一層。

Evidence

不是固定 Dashboard。

Evidence

由 Adaptive Evidence Engine

動態產生。

Evidence

回答：

AI 為什麼做出這個判斷？

---

# Level 5
## Raw Data

Raw Data

提供：

完整 Dashboard。

完整 Table。

完整報表。

Highlight Signal

永遠不隱藏資料。

AI 的所有判斷，

都應能追溯到 Raw Data。

---

# Navigation

Workspace Navigation

建議：

Home

Website

Search

Social

Advertising

Security

Reports

Notifications

Settings

Business 不需要獨立 Module。

Business

由 Workspace Home

整合呈現。

---

# Navigation Principle

Navigation

採：

Business Thinking。

不是：

Technology Thinking。

例如：

Website

而不是：

Google Analytics。

Search

而不是：

Search Console。

Social

而不是：

Facebook API。

使用者不需要理解技術。

---

# Progressive Disclosure

Highlight Signal

採用 Progressive Disclosure。

Workspace Home

↓

Module

↓

Evidence

↓

Raw Data

資訊越來越深入。

一般使用者

不需要閱讀 Raw Data。

---

# Design Principles

Information Architecture

必須符合：

Decision First

AI First

Business First

Evidence First

Simple Navigation

Consistent Modules

Progressive Disclosure

---

# Summary

Highlight Signal

不是 Dashboard Collection。

Highlight Signal

是一個 AI Business Workspace。

Workspace

↓

Workspace Home

↓

Today's Signals

↓

Modules

↓

Evidence

↓

Raw Data

使用者每天先做決策。

需要時，

再查看證據。
