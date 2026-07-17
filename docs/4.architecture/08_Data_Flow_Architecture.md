# Data Flow Framework

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

Data Flow Framework 定義 Highlight AI 產品中資料如何從外部來源流入系統，並依序形成 Raw Observation / Metric、Signal、Evidence、Explanation、Business Impact、Recommendation、Human Review、Decision、Action、Execution Result、Business Outcome 與 Evaluation / Feedback。

Notification 由 Domain Event 觸發，Audit Log 記錄重要 Mutation；兩者皆為橫切能力，不是線性資料流程的最後一步。

本文件回答：

資料從哪裡來？

如何被處理？

如何產生 Signal？

如何進入 AI Core Engines？

如何被呈現在 Workspace？

如何追蹤使用者 Action 與 Result？

Data Flow Framework 是後續 Database、API、Backend、Frontend 設計的重要基礎。

---

# Philosophy

傳統資料平台：

Data Source

↓

ETL

↓

Database

↓

Dashboard

Highlight AI：

Data Source

↓

Data Ingestion

↓

Normalized Data

↓

Signals

↓

Decision

↓

Recommendation

↓

Evidence

↓

Notification / Workspace

↓

Action

↓

Result

Highlight AI 的資料流不是為了產生更多 Dashboard。

資料流的最終目標是產生更好的 Decision 與 Action。

---

# Core Idea

Raw Data 本身沒有價值。

Raw Data 必須經過：

- Collection
- Normalization
- Contextualization
- Signal Detection
- AI Evaluation
- Evidence Selection
- Action Tracking

才能成為可用的 Business Intelligence。

Data Flow 的核心原則：

Data must become Signal.

Signal must support Decision.

Decision must lead to Recommendation.

Recommendation must be backed by Evidence.

Action must produce Result.

---

# High Level Flow

標準資料流：

Workspace

↓

Data Sources

↓

Connectors

↓

Ingestion Jobs

↓

Raw Data Store

↓

Normalized Data Store

↓

Signal Detection

↓

AI Core Engines

↓

Evidence Selection

↓

Widget Rendering

↓

Notification

↓

User Action

↓

Result Evaluation

---

# Workspace As Root

所有 Data Flow 都以 Workspace 為根節點。

Workspace 決定：

- 使用者
- 資料來源
- 權限
- AI Context
- Module
- Signal
- Recommendation
- Evidence
- Reports

任何資料進入系統時，都必須屬於某一個 Workspace。

沒有 Workspace Context 的資料，不應進入 AI Core Engines。

---

# Data Sources

Data Sources 是外部或內部資料來源。

例如：

Website：

- Google Analytics
- Cloudflare Analytics
- Website Health

Search：

- Search Console
- SEO Scan
- GEO / AEO Result

Social：

- Facebook
- Instagram
- Threads
- TikTok（Future）

Advertising：

- Google Ads
- Meta Ads
- LINE Ads（Future）

Security：

- RiskRadar
- SSL
- Secret Scan
- Docker Scan
- CSPM

Future：

- CRM
- ERP
- POS
- Email Marketing
- Customer Service

---

# Connectors

Connector 負責與 Data Source 連線。

Connector 任務包含：

- Authentication
- Authorization
- Token Refresh
- API Request
- Rate Limit Handling
- Error Handling
- Data Fetching
- Connection Status

Connector 不應產生 Decision。

Connector 只負責可靠取得資料。

---

# Ingestion Jobs

Ingestion Job 負責定期或手動抓取資料。

Job 可由以下方式觸發：

- Scheduled Job
- Manual Sync
- Webhook
- User Action
- System Event
- Retry Queue

Job 應記錄：

- Workspace ID
- Module
- Data Source
- Status
- Start Time
- End Time
- Error
- Retry Count
- Data Range

---

# Raw Data Store

Raw Data Store 保存原始資料。

Raw Data 目的：

- Traceability
- Reprocessing
- Debugging
- Audit
- Export

Raw Data 不一定直接給一般使用者看。

但 AI 判斷必須能追溯回 Raw Data。

---

# Normalized Data Store

Normalized Data Store 將不同來源資料轉成平台共同格式。

例如：

Google Analytics Sessions

Cloudflare Page Views

Social Reach

Ads Clicks

都可以轉換為標準 Metric 或 Event。

Normalization 的目的：

- 統一欄位
- 統一時間
- 統一 Workspace Scope
- 統一 Module Context
- 支援跨平台分析

---

# Data Normalization Principles

Normalization 應遵守：

- Preserve Raw Data
- Normalize Common Fields
- Keep Source Reference
- Keep Time Range
- Keep Workspace Context
- Keep Module Context
- Avoid Over-aggregation

不要為了方便而失去可追溯性。

---

# Metric Layer

Metric Layer 是 Normalized Data 的分析層。

Metric 可包含：

- Sessions
- Users
- CTR
- Conversion Rate
- CPA
- ROAS
- Engagement Rate
- Ranking
- Security Score
- Health Score

Metric 不等於 Signal。

Metric 是 Signal Detection 的材料。

---

# Signal Detection

Signal Detection 將 Metric 與 Context 轉換為 Signal。

例如：

Metric：Organic Sessions -18%

Context：連續 7 天下降，且 SEO 是本季目標。

Signal：Organic Traffic Drop

Signal Detection 可由：

- Rule
- Threshold
- Trend Detection
- Anomaly Detection
- AI Analysis
- Historical Comparison
- Business Goal Matching

共同完成。

---

# Signal Evaluation

產生 Signal 後，系統應評估：

- Severity
- Priority
- Confidence
- Business Impact
- Urgency
- Related Module
- Related Evidence
- Related Goal

不是所有 Signal 都應通知使用者。

Signal 必須進一步被 AI Decision Engine 評估。

---

# AI Core Flow

Signal 進入 AI Core Engines。

流程：

Signals

↓

AI Decision Engine

↓

AI Recommendation Engine

↓

Adaptive Evidence Engine

↓

Notification Engine

↓

Workspace

AI Core Flow 的目標是從大量 Signal 中選出少數重要 Decision。

---

# Decision Generation

Decision Generation 負責回答：

今天最重要的是什麼？

Decision 來源：

- Signals
- Workspace Context
- Business Goals
- User Role
- Historical Patterns
- Module Priority
- Evidence Confidence

Decision 不應只根據單一數字。

Decision 應基於整體 Business Context。

---

# Recommendation Generation

Recommendation Generation 負責回答：

下一步該做什麼？

Recommendation 應基於：

- Decision
- Signal
- Evidence
- Module
- Difficulty
- Expected Impact
- User Capability
- Business Goal

Recommendation 必須可執行、可排序、可追蹤。

---

# Evidence Selection

Evidence Selection 負責選出支持 Decision 與 Recommendation 的資料。

Evidence 來源：

- Normalized Data
- Metrics
- Raw Data Reference
- Scan Result
- Historical Data
- Report

Evidence Selection 由 Adaptive Evidence Engine 執行。

Evidence 必須可追溯。

---

# Widget Rendering

Widget Rendering 負責將 Evidence 呈現給使用者。

流程：

Evidence

↓

Widget Selection

↓

Data Binding

↓

Layout Composition

↓

Workspace Render

Widget 不應直接讀 Raw Data 後自己判斷。

Widget 應呈現 AI 已選擇的 Evidence。

---

# Notification Flow

Notification Flow 負責將重要 Decision 推送給使用者。

流程：

Decision

↓

Recommendation

↓

Evidence Preview

↓

Notification Rule

↓

Channel Adapter

↓

User

Notification 不應由 Raw Data 直接觸發。

Notification 應由 Decision 與 Priority 觸發。

---

# Action Flow

Action Flow 負責追蹤使用者是否執行 Recommendation。

流程：

Recommendation

↓

User Action

↓

Action Status

↓

Result Tracking

↓

AI Learning

Action Status 可包含：

- New
- In Progress
- Completed
- Skipped
- Snoozed
- Failed

---

# Result Evaluation

Result Evaluation 負責判斷 Action 是否有效。

例如：

Recommendation：更新首頁 Meta Title

Action：User Completed

Result：CTR +3.8%

AI Evaluation：Recommendation Effective

Result Evaluation 是 AI Learning Loop 的基礎。

---

# Feedback Loop

完整 Feedback Loop：

Data

↓

Signal

↓

Decision

↓

Recommendation

↓

Action

↓

Result

↓

Learning

↓

Better Future Decision

Highlight AI 不只是分析當下。

它應逐步學習哪些 Recommendation 有效。

---

# Data Freshness

Data Flow 必須管理資料新鮮度。

每筆資料應記錄：

- Source Time
- Ingested Time
- Processed Time
- Last Updated Time
- Refresh Frequency

AI Decision 不應依賴過期資料。

過期資料應降低 Confidence。

---

# Data Quality

Data Quality 會影響 AI 判斷。

Data Quality 指標可包含：

- Completeness
- Freshness
- Consistency
- Accuracy
- Source Reliability
- Sample Size
- Error Rate

Data Quality 低時，AI 應降低 Confidence 或提示資料不足。

---

# Error Handling

Data Flow 必須處理錯誤。

常見錯誤：

- Token Expired
- API Limit
- Missing Permission
- Data Source Unavailable
- Worker Failed
- Invalid Response
- Partial Data

錯誤應產生 System Signal。

例如：

Google Analytics 連線失效。

這本身就是一個需要處理的 Signal。

---

# Retry Strategy

Ingestion Job 應支援 Retry。

Retry 應記錄：

- Retry Count
- Last Error
- Next Retry Time
- Final Failure Reason

不要無限重試。

若多次失敗，應產生 Data Source Notice 或 System Signal。

---

# Audit Trail

重要資料流應保留 Audit Trail。

例如：

- Data Source Connected
- Job Started
- Job Failed
- Signal Generated
- Decision Generated
- Recommendation Generated
- Notification Sent
- Action Completed

Audit Trail 對 Enterprise、Security、Debug 都很重要。

---

# Security Principles

Data Flow 必須遵守安全原則。

包含：

- Workspace Isolation
- Least Privilege
- Token Encryption
- Secret Management
- Permission Check
- Audit Log
- Data Retention Policy

任何跨 Workspace 資料流都必須禁止，除非明確設計為 Cross Workspace Insight。

---

# Privacy Principles

Data Flow 應避免不必要保存敏感資料。

原則：

- Collect Only Needed Data
- Minimize PII
- Mask Sensitive Fields
- Encrypt Credentials
- Separate Raw Data And AI Summary
- Respect Data Retention

AI Summary 不應洩漏不必要的敏感資訊。

---

# Module Data Flow

每個 Module 都應遵守標準資料流。

Module

↓

Data Sources

↓

Connector

↓

Raw Data

↓

Normalized Data

↓

Module Signals

↓

AI Core Engines

↓

Module Evidence

↓

Workspace

Module 不應繞過 AI Core 直接產生混亂的 UI。

---

# Website Data Flow

Website Module 範例：

Google Analytics

Cloudflare

Website Health

↓

Connector

↓

Raw Website Data

↓

Normalized Website Metrics

↓

Traffic / Conversion / Health Signals

↓

Decision

↓

Recommendation

↓

Evidence Widgets

---

# Search Data Flow

Search Module 範例：

Search Console

SEO Scan

GEO / AEO Result

↓

Connector

↓

Raw Search Data

↓

Normalized Search Metrics

↓

Ranking / CTR / Visibility Signals

↓

Decision

↓

Recommendation

↓

Evidence Widgets

---

# Social Data Flow

Social Module 範例：

Facebook

Instagram

Threads

TikTok（Future）

↓

Connector

↓

Raw Social Data

↓

Normalized Social Metrics

↓

Engagement / Reach / Traffic Signals

↓

Decision

↓

Recommendation

↓

Evidence Widgets

---

# Security Data Flow

Security Module 範例：

RiskRadar

SSL

Secret Scan

Docker Scan

CSPM

↓

Scan Worker

↓

Raw Finding

↓

Normalized Risk Finding

↓

Security Signals

↓

Decision

↓

Recommendation

↓

Risk Evidence

---

# Batch vs Real-Time

資料流可分為：

Batch Flow：

定期抓取，適合 GA、Search、Weekly Report。

Near Real-Time Flow：

較即時，適合 Security Alert、Website Down、Critical Issue。

Manual Flow：

使用者手動觸發，例如重新掃描網站。

不同 Flow 應使用不同 Queue 與優先級。

---

# Engineering Principles

系統設計應支援：

- Workspace Scoped Data Flow
- Connector Layer
- Job Queue
- Raw Data Store
- Normalized Data Store
- Signal Detection Pipeline
- AI Core Pipeline
- Evidence Selection
- Notification Queue
- Action Tracking
- Result Evaluation
- Audit Trail

Data Flow 應可追蹤、可重跑、可除錯。

---

# Product Principles

Data Flow 必須服務產品體驗。

產品首頁不應呈現資料流細節。

但資料流必須支持：

- Today's Signals
- Workspace Home
- Module Summary
- Recommendations
- Evidence
- Notifications
- Reports

Data Flow 的終點不是 Dashboard。

Data Flow 的終點是 Decision 與 Action。

---

# Future

Data Flow Framework 未來可加入：

- Event Streaming
- Cross Workspace Benchmark
- AI Memory Store
- Feature Store
- Vector Store
- Data Lineage Explorer
- Data Replay
- Real-Time Signal Detection
- Multi-tenant Data Pipeline

未來可讓 AI 回答：

這個 Decision 是從哪些資料一路推導出來的？

這個 Recommendation 是否真的改善了結果？

哪個資料來源最常產生有效 Signal？

---

# Summary

Data Flow 是 Highlight AI 的血液循環。

資料不是為了產生 Dashboard。

資料是為了產生：

Signal

Decision

Recommendation

Evidence

Action

Result

完整 Data Flow：

Data Source

↓

Connector

↓

Raw Data

↓

Normalized Data

↓

Signal

↓

Decision

↓

Recommendation

↓

Evidence

↓

Widget / Notification

↓

Action

↓

Result

Highlight AI 的資料流應讓企業從大量數據中，看見真正重要的商業訊號。

---

# Related Documents

01 AI Core Framework
02 Signal Framework
03 Workspace Framework
04 Module Framework
05 Evidence Framework
06 Notification Framework
07 Widget Framework
09 Permission Framework（Future）
10 Domain Model（Future）

