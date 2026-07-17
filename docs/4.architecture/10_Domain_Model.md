# Domain Model

Version: v1.0
Status: Draft
Owner: Hank
Last Update: 2026-07

---

# Highlight Signal

Highlight Your Signal.

Don't start with dashboards.
Start with decisions.

The best AI doesn't tell you everything.
It tells you what matters most.

---

# Purpose

> V1 Alignment Patch: Insight is analysis content rather than an independent persisted Entity. Decision and Action remain within the Recommendation Domain; Task and Execution Result belong to Execution; Business Outcome, Evaluation, and Feedback belong to Learning. Execution Result and Business Outcome are separate records.

Domain Model 定義 Highlight AI 產品的核心領域物件與物件關係。

本文件是 Architecture 階段的收束文件。

它把前面 Framework 中出現的核心概念整理成共同模型。

Domain Model 不是 Database Schema。

Domain Model 不是 API Spec。

Domain Model 是產品、AI、資料庫、API、Frontend、Backend 共同理解的 Business Object Map。

---

# Core Idea

Highlight AI 的核心不是 Dashboard。

Highlight AI 的核心是：

Workspace

↓

Module

↓

Signal

↓

Decision

↓

Recommendation

↓

Evidence

↓

Action

↓

Result

這些物件構成 Highlight AI 的核心語言。

---

# Domain Object Flow

標準物件流：

Workspace

↓

Data Source

↓

Module

↓

Raw Data

↓

Metric

↓

Signal

↓

Decision

↓

Recommendation

↓

Evidence

↓

Widget

↓

Notification

↓

Action

↓

Result

↓

Learning

---

# Root Object

Workspace 是系統 Root Object。

所有資料、設定、成員、模組、AI 判斷與報告都屬於 Workspace。

Workspace 是：

- Data Boundary
- Permission Boundary
- AI Context Boundary
- Billing Boundary
- Reporting Boundary

沒有 Workspace，就沒有有效的 Signal、Decision 或 Recommendation。

---

# Primary Domain Objects

Highlight AI 的主要 Domain Objects：

1. Workspace
2. User
3. Member
4. Role
5. Module
6. Data Source
7. Connector
8. Raw Data
9. Metric
10. Signal
11. Decision
12. Recommendation
13. Evidence
14. Widget
15. Notification
16. Action
17. Result
18. Report
19. AI Memory
20. Audit Log

---

# Workspace

Workspace 代表一個獨立的 Business Context。

Workspace 可是：

- 一家公司
- 一個品牌
- 一個客戶
- 一個部門
- 一個專案

Workspace 擁有：

- Members
- Roles
- Modules
- Data Sources
- Signals
- Decisions
- Recommendations
- Evidence
- Reports
- Settings
- AI Memory

Workspace 是所有資料的最高層級。

---

# User

User 是登入系統的人。

User 不直接擁有資料。

User 透過 Workspace Membership 取得資料存取權。

一個 User 可屬於多個 Workspace。

同一個 User 在不同 Workspace 可有不同 Role。

---

# Member

Member 是 User 在某個 Workspace 中的身份。

Member 連接：

User

+

Workspace

+

Role

Member 決定使用者在該 Workspace 中能做什麼。

---

# Role

Role 定義 Member 的權限集合。

預設 Role：

- Owner
- Admin
- Manager
- Member
- Viewer
- Billing
- External Viewer

Role 不只是 UI 權限。

Role 也影響：

- Signal Visibility
- Evidence Visibility
- Recommendation Action
- Notification Routing
- AI Execution Permission

---

# Module

Module 是 Workspace 中的 Business Capability。

Module 不等於資料來源。

Module 代表一個業務領域。

例如：

- Website
- Search
- Social
- Advertising
- Security
- Reports
- Settings

Module 產生：

- Signals
- Recommendations
- Evidence
- Reports

---

# Data Source

Data Source 是外部或內部資料來源。

例如：

- Google Analytics
- Search Console
- Facebook
- Instagram
- Threads
- Google Ads
- RiskRadar
- Cloudflare

Data Source 屬於 Workspace。

Data Source 通常被某個 Module 使用。

---

# Connector

Connector 是系統與 Data Source 連線的技術物件。

Connector 負責：

- Authentication
- Token Refresh
- API Fetch
- Rate Limit Handling
- Connection Status
- Error Handling

Connector 不產生 Business Decision。

Connector 只負責可靠取得資料。

---

# Raw Data

Raw Data 是從 Data Source 取得的原始資料。

Raw Data 用於：

- Traceability
- Reprocessing
- Debugging
- Audit
- Export

Raw Data 不等於 Evidence。

Raw Data 是 Evidence 的來源。

---

# Metric

Metric 是經過標準化與計算後的指標。

例如：

- Sessions
- Users
- CTR
- Conversion Rate
- CPA
- ROAS
- Ranking
- Engagement Rate
- Security Score

Metric 不等於 Signal。

Metric 是產生 Signal 的材料。

---

# Signal

Signal 是 AI 判定值得關注的事件、變化或狀態。

Signal 來自 Metric、Raw Data、Context 與 AI 分析。

Signal 回答：

發生了什麼？

Signal 包含：

- Title
- Category
- Module
- Severity
- Priority
- Confidence
- Business Impact
- Status
- Related Evidence

Signal 是 AI Workflow 的起點。

---

# Decision

Decision 是 AI 從多個 Signal 中判斷出的重要營運重點。

Decision 回答：

今天最重要的是什麼？

Decision 不只是 Signal 排序。

Decision 需要考慮：

- Business Goal
- Workspace Context
- Urgency
- Business Impact
- Confidence
- Historical Pattern
- User Role

Decision 是 Decision First Experience 的核心。

---

# Recommendation

Recommendation 是 AI 對 Decision 提出的下一步行動建議。

Recommendation 回答：

下一步該做什麼？

Recommendation 應包含：

- Title
- Reason
- Priority
- Difficulty
- Estimated Time
- Expected Impact
- Confidence
- Related Signal
- Related Evidence
- Action Status

Recommendation 必須可執行、可追蹤、可評估。

---

# Evidence

Evidence 是支持 Decision 與 Recommendation 的資料證據。

Evidence 回答：

為什麼這樣判斷？

Evidence 來自：

- Metric
- Raw Data
- Scan Result
- Trend
- Timeline
- Report

Evidence 必須可追溯至 Raw Data。

Evidence 是 AI Trust 的基礎。

---

# Widget

Widget 是 Evidence 的呈現方式。

Widget 不等於 Dashboard。

Widget 是 AI 選擇的 UI Component。

例如：

- Signal Card
- Recommendation Card
- Line Chart
- Table
- Ranking Table
- Status Card
- Risk Card
- Timeline

Widget 讓使用者更快理解 Evidence。

---

# Notification

Notification 是 Decision 與 Recommendation 的傳遞方式。

Notification 回答：

什麼事情需要主動提醒使用者？

Notification 可透過：

- LINE
- Email
- Workspace Inbox
- Slack（Future）

Notification 不應直接由 Raw Data 觸發。

Notification 應由 Decision 與 Priority 觸發。

---

# Action

Action 是使用者或系統對 Recommendation 採取的行動。

Action 可是：

- Mark As Done
- Assign To Team
- Update Content
- Fix Security Issue
- Export Report
- Approve AI Execution

Action 必須有狀態。

例如：

- New
- In Progress
- Completed
- Skipped
- Snoozed
- Failed

Action 是 Recommendation 是否被採用的證據。

---

# Result

Result 是 Action 後產生的結果。

Result 回答：

這個行動是否有效？

例如：

- CTR 提升
- CPA 下降
- Risk 降低
- Traffic 回升
- Conversion 增加

Result 是 AI Learning Loop 的基礎。

---

# Report

Report 是一段時間內的 Decision、Recommendation、Evidence 與 Result 整理。

Report 不應只是 Dashboard 匯出。

Report 應包含：

- Summary
- Key Signals
- Key Decisions
- Recommendations
- Evidence
- Action Status
- Result Evaluation
- Next Focus

Report 可用於 Weekly、Monthly、Client、Enterprise 場景。

---

# AI Memory

AI Memory 是 Workspace 層級的歷史記憶。

AI Memory 可包含：

- Historical Signals
- Historical Decisions
- Completed Actions
- Effective Recommendations
- Business Goals
- User Preferences
- Module Patterns

AI Memory 不等於對話記憶。

AI Memory 是 Workspace 的長期學習基礎。

---

# Audit Log

Audit Log 記錄重要操作與系統事件。

例如：

- Data Source Connected
- Role Changed
- Signal Generated
- Recommendation Dismissed
- Report Exported
- Action Completed
- AI Execution Approved

Audit Log 支援安全、除錯與企業治理。

---

# Object Relationships

核心關係：

Workspace has many Members.

Workspace has many Modules.

Workspace has many Data Sources.

Module uses many Data Sources.

Data Source produces Raw Data.

Raw Data becomes Metrics.

Metrics generate Signals.

Signals create Decisions.

Decisions generate Recommendations.

Recommendations are supported by Evidence.

Evidence is rendered by Widgets.

Recommendations lead to Actions.

Actions produce Results.

Results update AI Memory.

---

# Primary Relationship Map

Workspace

├── Members

├── Roles

├── Modules

│   ├── Data Sources

│   ├── Metrics

│   ├── Signals

│   ├── Recommendations

│   └── Evidence

├── Decisions

├── Notifications

├── Reports

├── Actions

├── Results

├── AI Memory

└── Audit Logs

---

# AI Object Flow

AI Core 操作的主要物件流：

Signal

↓

Decision

↓

Recommendation

↓

Evidence

↓

Action

↓

Result

↓

Learning

這條流程是 Highlight AI 的主幹。

---

# Data Object Flow

資料層物件流：

Data Source

↓

Connector

↓

Raw Data

↓

Metric

↓

Signal

Data Object Flow 服務 AI Object Flow。

資料不是終點。

Signal 才是資料進入 AI 的入口。

---

# UI Object Flow

UI 層物件流：

Decision

↓

Recommendation

↓

Evidence

↓

Widget

↓

Workspace View

Frontend 不應直接從 Raw Data 組畫面。

Frontend 應以 Decision、Recommendation、Evidence、Widget 為核心呈現。

---

# Notification Object Flow

通知層物件流：

Decision

↓

Recommendation

↓

Evidence Preview

↓

Notification

↓

User Action

Notification 應服務 Action，而不是服務資訊轟炸。

---

# Permission Object Flow

權限層物件流：

User

↓

Member

↓

Workspace

↓

Role

↓

Permission

↓

Resource Access

所有資料存取都必須經過 Workspace 與 Role。

---

# Domain Model Principles

Domain Model 應遵守：

1. Workspace First
2. Module As Business Capability
3. Signal As Core AI Object
4. Decision Before Dashboard
5. Recommendation Must Be Actionable
6. Evidence Must Be Traceable
7. Action Must Be Trackable
8. Result Must Feed Learning
9. Permission Must Be Workspace Scoped
10. AI Must Respect Domain Boundaries

---

# Not Database Yet

Domain Model 不是資料表。

例如：

Signal 可能拆成多個 Table。

Evidence 可能需要 Registry、Mapping、Raw Reference。

Recommendation 可能需要 Action Tracking。

Workspace 可能需要 Member、Role、Setting。

Database 設計應以 Domain Model 為基礎，但不必一對一對應。

---

# Not API Yet

Domain Model 也不是 API Spec。

API 可依使用情境回傳不同 View Model。

例如：

Workspace Home API：

回傳 Today’s Signals、Top Recommendations、Evidence Preview。

Signal Detail API：

回傳 Signal、Decision、Recommendation、Evidence Detail、Raw Data Reference。

Report API：

回傳 Summary、Module Results、Action Progress。

API 應以 Domain Model 為核心，而非直接暴露 Database Schema。

---

# Engineering Implications

後續工程設計應圍繞 Domain Model。

Database 應保存：

- Workspace
- Member
- Role
- Module
- Data Source
- Signal
- Decision
- Recommendation
- Evidence
- Action
- Result
- Report
- Audit Log

API 應提供：

- Workspace View
- Module View
- Signal View
- Recommendation View
- Evidence View
- Action View
- Report View

Frontend 應呈現：

- Workspace Home
- Today's Signals
- Module Home
- Recommendation Detail
- Evidence Detail
- Report

---

# Product Implications

產品設計不應再以 Dashboard 為核心。

產品設計應圍繞：

- Workspace
- Today's Signals
- Recommendation
- Evidence
- Action
- Result

使用者每天登入後，應先看到：

今天最重要的是什麼。

下一步該做什麼。

為什麼。

做完後效果如何。

---

# Cross Product Domain Model

同一套 Domain Model 可套用不同產品。

Highlight Signal：

Business Workspace

Business Signals

Growth Recommendations

Business Evidence

RiskRadar：

Security Workspace

Security Signals

Security Recommendations

Security Evidence

BrandHue：

Brand Workspace

Color Signals

Brand Recommendations

Visual Evidence

產品不同，Domain Object 一致。

這是 Highlight AI Framework 可複用的關鍵。

---

# Future

Domain Model 未來可擴充：

- Organization
- Team
- Project
- Client
- Goal
- Campaign
- Experiment
- Benchmark
- AI Agent
- Execution Plan
- Approval
- Knowledge Base

但第一階段應先保持核心模型穩定。

不要過早複雜化。

---

# Summary

Domain Model 是 Highlight AI 的共同語言。

它定義所有產品、AI、工程與 UI 都應理解的核心物件。

核心流程：

Workspace

↓

Module

↓

Signal

↓

Decision

↓

Recommendation

↓

Evidence

↓

Action

↓

Result

Highlight AI 的真正價值，不是建立更多 Dashboard。

而是建立一套能從資料中產生 Decision，並追蹤 Action 與 Result 的 AI Business System。

---

# Related Documents

01 AI Core Framework
02 Signal Framework
03 Workspace Framework
04 Module Framework
05 Evidence Framework
06 Notification Framework
07 Widget Framework
08 Data Flow Framework
09 Permission Framework

