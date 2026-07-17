# Widget Framework

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

Widget Framework 定義 Highlight AI 產品中 Widget 的設計標準。

Widget 是 Evidence 的呈現層。

Widget 不是 Dashboard 的固定圖表。

Widget 是 AI 根據 Decision、Recommendation 與 Evidence 動態選擇的 UI Component。

本文件定義：

- Widget 是什麼
- Widget 如何與 Evidence 連動
- Widget 如何被 AI 選擇
- Widget 如何支援 Dynamic Dashboard
- Widget 如何跨 Module 與跨產品使用

---

# Philosophy

傳統 Dashboard：

固定 Widget

↓

使用者自己找重點

↓

自己判斷

Highlight AI：

Decision

↓

Recommendation

↓

Evidence

↓

AI Selected Widgets

↓

User Understanding

Widget 的目的不是展示所有資料。

Widget 的目的是幫助使用者理解 AI 為什麼這樣判斷。

---

# Core Idea

Widget 是 Evidence 的視覺化容器。

Evidence 是內容。

Widget 是呈現方式。

例如：

Evidence：Organic Traffic Trend

Widget：Line Chart

Evidence：Keyword Ranking Drop

Widget：Ranking Table

Evidence：SSL Expiring

Widget：Status Card

Evidence：Security Finding

Widget：Risk Finding Card

Widget 不應獨立存在。

Widget 應服務 Decision 與 Evidence。

---

# Widget Is Not Dashboard

Widget 不等於 Dashboard。

Dashboard 是固定頁面。

Widget 是可被 AI 動態組合的 UI 單位。

錯誤：

每次都顯示 8 個固定圖表。

正確：

AI 根據今日 Decision，自動選出最相關的 2~4 個 Widget。

---

# Widget Is Not Data Source

Widget 不應綁死特定資料來源。

錯誤：

GA Line Chart Widget

Facebook Table Widget

Search Console Widget

正確：

Trend Widget

Comparison Widget

Ranking Widget

Status Widget

Timeline Widget

同一個 Widget 可呈現不同來源的 Evidence。

---

# Widget Layer

Highlight AI 的資訊層級：

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

Raw Data

Widget 位於 Evidence 與使用者理解之間。

Widget 將 Evidence 轉換成可閱讀、可理解、可行動的 UI。

---

# Widget Selection

Widget 應由 Adaptive Evidence Engine 選擇。

選擇依據包含：

- Decision Type
- Recommendation Type
- Evidence Type
- Module
- User Role
- Device
- Available Data
- Evidence Score
- Confidence
- Priority

AI 不應只是選資料。

AI 應選擇最適合呈現該 Evidence 的 Widget。

---

# Dynamic Dashboard

Dynamic Dashboard 是由 AI 動態組合 Widget 的機制。

使用者不需要自己問問題。

AI 會根據今日 Signal 與 Decision，自動組成最適合的 Evidence View。

流程：

Signal

↓

Decision

↓

Recommendation

↓

Evidence Selection

↓

Widget Selection

↓

Dynamic Dashboard

Dynamic Dashboard 不代表無限客製化。

它代表 AI 根據當下重點，自動選擇最有用的畫面。

---

# Widget Registry

所有 Widget 都應註冊在 Widget Registry。

Widget Registry 定義：

- Widget ID
- Widget Name
- Widget Type
- Supported Evidence Types
- Supported Modules
- Required Data Shape
- Display Size
- Device Support
- Interaction Type
- Permission Requirement
- Fallback Widget

Widget Registry 讓 AI 可以安全選擇 Widget。

---

# Widget Contract

每個 Widget 都應符合 Widget Contract。

Widget Contract 包含：

1. Title
2. Purpose
3. Supported Evidence Types
4. Input Data Shape
5. Display Rules
6. Empty State
7. Loading State
8. Error State
9. Interaction
10. Raw Data Link

沒有 Contract 的 Widget 不應進入正式產品。

---

# Widget Types

第一階段可定義以下 Widget Types：

- Summary Card
- Signal Card
- Recommendation Card
- Evidence Preview Card
- Line Chart
- Bar Chart
- Table
- Ranking Table
- Comparison Card
- Timeline
- Status Card
- Risk Card
- Checklist
- Progress Card
- Report Card

未來可擴充：

- Heatmap
- Funnel Chart
- Cohort Chart
- Map
- AI Explanation Block
- Before / After Comparison
- Simulation Widget

---

# Summary Card

用途：顯示一段 AI 摘要。

適用：

- Workspace Home
- Module Home
- Report Summary

內容包含：

- AI Summary
- Overall Status
- Key Signal Count
- Main Recommendation

Summary Card 不應放太多數字。

---

# Signal Card

用途：顯示單一重要 Signal。

內容包含：

- Signal Title
- Priority
- Severity
- Status
- Short Explanation
- Related Recommendation
- Evidence Preview

Signal Card 通常出現在 Today's Signals。

---

# Recommendation Card

用途：顯示 AI 建議的下一步行動。

內容包含：

- Recommendation Title
- Priority
- Difficulty
- Estimated Time
- Expected Impact
- Confidence
- CTA

Recommendation Card 應讓使用者知道下一步該做什麼。

---

# Evidence Preview Card

用途：顯示精簡 Evidence。

適用：

- Workspace Home
- LINE / Email Link Landing
- Signal Detail Preview

內容包含：

- Evidence Title
- Key Metric
- Change
- Time Range
- Confidence

Evidence Preview Card 應短小且可點擊展開。

---

# Line Chart

用途：呈現時間趨勢。

適用 Evidence：

- Traffic Trend
- CTR Trend
- Conversion Trend
- CPA Trend
- Ranking Trend

Line Chart 應用於理解趨勢，不應過度堆疊太多指標。

---

# Table

用途：呈現結構化資料。

適用 Evidence：

- Landing Page Performance
- Campaign Table
- Keyword Table
- Security Findings

Table 應支援排序、篩選、Raw Data Link。

---

# Ranking Table

用途：呈現排序變化。

適用 Evidence：

- Keyword Ranking
- Top Landing Pages
- Top Posts
- Top Campaigns

Ranking Table 應特別標示上升、下降與異常變化。

---

# Status Card

用途：呈現單一狀態。

適用 Evidence：

- SSL Status
- Data Source Connection
- Website Health
- Worker Status
- Scan Status

Status Card 應快速表達狀態是否正常。

---

# Risk Card

用途：呈現風險事件。

適用 Evidence：

- Security Finding
- Critical Vulnerability
- Secret Exposure
- Cloud Misconfiguration

Risk Card 應包含 Severity、Impact、Recommendation 與 Evidence。

---

# Checklist

用途：呈現可執行任務。

適用：

- Recommendation Actions
- Onboarding
- Security Fix Steps
- SEO Tasks

Checklist 應能追蹤完成狀態。

---

# Timeline

用途：呈現事件順序。

適用 Evidence：

- Signal History
- Action History
- Incident Timeline
- Recommendation Lifecycle

Timeline 對 RiskRadar 與長期追蹤特別重要。

---

# Widget Size

Widget 應支援不同尺寸。

例如：

Small

適合 Summary / Status。

Medium

適合 Signal / Recommendation / Preview。

Large

適合 Chart / Table / Timeline。

Widget Size 應由內容需求決定，而不是由固定版面決定。

---

# Widget Placement

Widget Placement 應由 AI 與 UI Layout 共同決定。

常見區域：

Workspace Home

Module Home

Signal Detail

Recommendation Detail

Report

Workspace Home 只應顯示最重要 Widget。

Module Page 可顯示更多 Evidence Widgets。

Raw Data Page 才顯示完整表格。

---

# Widget Priority

Widget 也應有 Priority。

Widget Priority 由以下因素決定：

- Evidence Score
- Related Decision Priority
- Recommendation Priority
- User Role
- Data Freshness
- Business Impact

高 Priority Widget 應優先顯示。

低 Priority Widget 可折疊或延後顯示。

---

# Widget Fallback

每個 Widget 都應定義 Fallback。

例如：

Line Chart 無資料時：

顯示 Empty State + 資料不足原因。

Table 資料太少時：

顯示 Summary Card。

Ranking Table 無排名變化時：

顯示 Healthy State。

Widget 不應因資料缺失造成頁面崩壞。

---

# Empty State

Empty State 應提供可行動資訊。

錯誤：

No Data。

正確：

目前尚未連接 Search Console，因此無法產生 Search Evidence。

請連接資料來源。

Empty State 應協助使用者完成下一步。

---

# Widget Interaction

Widget 可支援互動。

例如：

- Expand
- Filter
- Sort
- Drill Down
- View Raw Data
- Mark As Done
- Assign Action
- Open Recommendation

互動應服務 Decision Flow，而不是增加操作複雜度。

---

# Widget And Evidence

每個 Widget 必須能回溯 Evidence。

Widget 顯示的任何數字，都應能回答：

這個數字來自哪個 Evidence？

這個 Evidence 來自哪個 Raw Data？

這個 Evidence 支持哪個 Decision？

Widget 不應成為孤立 UI。

---

# Widget And Module

Module 不應自己任意定義 Widget。

Module 應使用共用 Widget Registry。

例如：

Website Module 使用 Line Chart、Table、Signal Card。

Search Module 使用 Ranking Table、Line Chart、Recommendation Card。

Security Module 使用 Risk Card、Status Card、Timeline。

Widget 是平台共用元件。

Module 只提供 Evidence 與 Data Shape。

---

# Widget And Notification

Notification 可引用 Widget。

例如：

LINE 通知只顯示文字與 Link。

點擊後進入 Workspace，可看到對應 Signal Card、Evidence Preview Card、Recommendation Card。

Email 可嵌入簡化版 Summary Card 或 Evidence Preview。

通知本身不應承載完整 Widget。

---

# Widget And Report

Report 可使用 Widget 的靜態版本。

例如：

- Summary Card
- Line Chart
- Ranking Table
- Risk Card
- Recommendation Checklist

PDF Report 應使用 Export-friendly Widget。

Interactive Widget 不一定適合匯出。

---

# Widget Rendering Flow

標準渲染流程：

Decision

↓

Evidence Selection

↓

Widget Selection

↓

Data Binding

↓

Layout Composition

↓

Render

↓

User Interaction

Widget Rendering 不應由前端硬寫固定頁面完成。

應逐步支援由 AI / Config / Registry 共同決定。

---

# Widget Registry Example

範例：

Widget ID：line_chart_trend

Widget Name：Trend Line Chart

Supported Evidence：Traffic Trend, CTR Trend, CPA Trend

Required Data Shape：time_series

Supported Modules：Website, Search, Advertising

Fallback：Summary Card

Interaction：Hover, Expand, View Raw Data

---

# Engineering Principles

系統設計應支援：

- Widget Registry
- Widget Contract
- Evidence Mapping
- Data Shape Validation
- Fallback Widget
- Dynamic Layout
- Permission-Aware Rendering
- Device-Aware Rendering
- Export-Friendly Rendering

Frontend 不應為每個 Module 寫完全不同的 UI。

Frontend 應依 Widget Registry 渲染共用元件。

---

# Product Principles

Widget 必須遵守：

- Evidence First
- Decision First
- Dynamic Composition
- Low Cognitive Load
- Consistent Experience
- Traceable Data
- Progressive Disclosure

Widget 的目標不是讓畫面看起來很豐富。

Widget 的目標是讓使用者更快理解重點。

---

# Cross Product Widgets

同一套 Widget Framework 可套用於不同產品。

Highlight Signal：

- Signal Card
- Recommendation Card
- Trend Chart
- Ranking Table

RiskRadar：

- Risk Card
- Finding Table
- Timeline
- Status Card

BrandHue：

- Color Palette Card
- Contrast Comparison
- Before / After Widget
- Brand Fit Score

不同產品可擴充專屬 Widget，但仍應遵守 Widget Contract。

---

# Future

Widget Framework 未來可加入：

- AI Layout Engine
- Widget Recommendation
- User Personalized Layout
- Widget Feedback Loop
- Widget Performance Analytics
- Export Layout Engine
- Embeddable Widgets
- Client-facing Report Widgets

未來 AI 可學習：

哪些 Widget 最容易讓使用者理解？

哪些 Widget 會促成 Action？

哪些 Widget 應該少顯示？

---

# Summary

Widget 是 Highlight AI 的 Evidence Presentation Layer。

Widget 不等於 Dashboard。

Widget 不等於資料來源。

Widget 是 AI 根據 Decision 與 Evidence 動態選擇的 UI 單位。

Highlight AI 的畫面流程：

Decision

↓

Recommendation

↓

Evidence

↓

Widget

↓

User Action

最好的 Widget 不是顯示最多資料。

最好的 Widget 是讓使用者最快理解為什麼這件事重要，以及下一步該做什麼。

---

# Related Documents

01 AI Core Framework
02 Signal Framework
03 Workspace Framework
04 Module Framework
05 Evidence Framework
06 Notification Framework
08 Data Flow Framework（Future）
09 Permission Framework（Future）
10 Domain Model（Future）

