# Module Framework

Version: v1.0
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

Module Framework 定義 Highlight AI 產品中的 Module 設計標準。

Module 是 Workspace 內的業務能力單位。

Module 不等於第三方平台。

Module 不等於單一 API。

Module 是一組可以獨立連接資料、產生 Signal、提供 Recommendation、呈現 Evidence 的 Business Capability。

本文件適用於：

- Highlight Signal
- RiskRadar
- BrandHue
- Future AI Products

所有新 Module 都應遵守本 Framework。

---

# Philosophy

傳統 SaaS 常以工具或資料來源作為產品結構。

例如：

- Google Analytics
- Search Console
- Facebook
- Google Ads
- Cloudflare

Highlight AI 不採用這種方式。

Highlight AI 使用 Business Domain 作為 Module。

例如：

- Website
- Search
- Social
- Advertising
- Security

使用者不需要理解資料來源。

使用者只需要理解：這個 Module 幫我解決什麼商業問題？

---

# Core Idea

Module 是平台的 Building Block。

Workspace 由多個 Module 組成。

每個 Module 都提供一種 Business Capability。

Module 的任務不是顯示 Dashboard。

Module 的任務是將特定業務領域的資料轉換成 Signal 與 Evidence，形成 Explanation、Business Impact 與 Recommendation，並支援 Human Review 後建立正式 Decision 與 Action。

---

# Module Hierarchy

Workspace

↓

Workspace Home

↓

Modules

↓

Module Signals

↓

Module Recommendations

↓

Module Evidence

↓

Raw Data

Module 是 Workspace 與 Data Sources 之間的重要抽象層。

---

# What Is A Module

Module 是一個可獨立擴充的業務能力單位。

一個 Module 應該具備：

- Clear Business Purpose
- Data Source Connection
- Signal Generation
- AI Summary
- Recommendation Support
- Evidence Support
- Raw Data Access
- Permission Boundary
- Report Integration

若一個功能無法產生獨立 Signal，通常不應成為 Module。

---

# Module Is Not Data Source

Module 不應以資料來源命名。

錯誤：

- Google Analytics Module
- Facebook Module
- Search Console Module
- Google Ads Module

正確：

- Website Module
- Social Module
- Search Module
- Advertising Module

同一個 Module 可以整合多個資料來源。

例如：

Website Module 可包含：

- Google Analytics
- Cloudflare Analytics
- Website Health
- Landing Page

Social Module 可包含：

- Facebook
- Instagram
- Threads
- TikTok（Future）

---

# Module Contract

所有 Module 都必須符合 Module Contract。

Module Contract 包含：

1. Business Purpose
2. Data Sources
3. Signal Types
4. Recommendation Types
5. Evidence Types
6. Raw Data Views
7. Permission Rules
8. Reporting Output
9. AI Context
10. Lifecycle

若新 Module 無法符合此 Contract，應重新評估是否需要建立。

---

# Module Standard Structure

所有 Module 應遵守一致結構。

Module

↓

AI Summary

↓

Signals

↓

Recommendations

↓

Evidence

↓

Raw Data

這種一致性可以降低使用者學習成本，也可以讓 Frontend、API、AI Engine 共同使用標準模式。

---

# Module AI Summary

每個 Module 都應提供 AI Summary。

AI Summary 回答：

- 這個領域目前狀況如何？
- 有哪些重要變化？
- 哪些 Signal 需要注意？
- 有哪些建議行動？

AI Summary 不應只是重述數字。

AI Summary 應轉換成 Business Insight。

---

# Module Signals

每個 Module 都應能產生 Module Signals。

例如：

Website Module：

- Traffic Drop
- Landing Page Drop
- Conversion Change
- Page Speed Issue

Search Module：

- Ranking Drop
- CTR Drop
- Impression Growth
- AI Visibility Change

Social Module：

- Engagement Drop
- Reach Spike
- Follower Growth
- High Engagement Low Traffic

Advertising Module：

- CPA Increase
- ROAS Drop
- Budget Anomaly
- Campaign Opportunity

Security Module：

- SSL Expiring
- Critical Risk
- Secret Exposure
- Website Health Issue

---

# Module Recommendations

每個 Module 都應能產生 Recommendation。

Recommendation 必須具備：

- Specific Action
- Priority
- Difficulty
- Estimated Time
- Expected Impact
- Confidence
- Related Signals
- Evidence

Module 不應產生抽象建議。

錯誤：改善 SEO。

正確：更新首頁 Meta Title，因為首頁 CTR 連續下降。

---

# Module Evidence

每個 Module 都應提供 Evidence。

Evidence 是支持 AI 判斷的資料。

Evidence 可以是：

- Chart
- Table
- Timeline
- Trend
- Screenshot
- Scan Result
- Report
- Raw Data Reference

Evidence 不應固定顯示所有資料。

Evidence 應由 Adaptive Evidence Engine 根據當下 Decision 與 Recommendation 動態挑選。

---

# Module Raw Data

Module 必須保留 Raw Data Access。

Highlight AI 不應隱藏資料。

AI 判斷必須能追溯到 Raw Data。

Raw Data 可包含：

- Full Table
- API Result
- Historical Records
- Raw Metrics
- Exportable Report

Raw Data 不是使用者每天第一眼看到的內容。

Raw Data 是深入研究時使用。

---

# Default Modules

Highlight Signal 第一階段定義以下 Module：

1. Website
2. Search
3. Social
4. Advertising
5. Security
6. Reports
7. Settings

其中 Reports 與 Settings 屬於 Support Module。

主要 AI 分析 Module 為：

- Website
- Search
- Social
- Advertising
- Security

---

# Website Module

Purpose：回答網站整體表現。

Business Questions：

- 有多少人來網站？
- 哪些頁面有效？
- 有沒有帶來詢問或轉換？
- 哪些頁面需要改善？

Data Sources：

- Google Analytics
- Cloudflare Analytics
- Website Health
- Landing Page Data

Signal Examples：

- Traffic Drop
- Conversion Drop
- Landing Page Opportunity
- Page Speed Issue

---

# Search Module

Purpose：回答搜尋與 AI 搜尋曝光狀況。

Business Questions：

- Google 找得到我嗎？
- AI 搜尋找得到我嗎？
- 哪些關鍵字正在變好或變差？
- 哪些內容值得優化？

Data Sources：

- Search Console
- SEO
- GEO
- AEO
- Website Scan

Signal Examples：

- Ranking Drop
- Impression Growth
- CTR Drop
- AI Visibility Opportunity

---

# Social Module

Purpose：回答社群內容與互動是否有效。

Business Questions：

- 哪個社群平台表現最好？
- 哪些內容有效？
- 社群是否帶動網站流量？
- 哪些內容值得延伸？

Data Sources：

- Facebook
- Instagram
- Threads
- TikTok（Future）
- YouTube（Future）

Signal Examples：

- Engagement Spike
- Reach Drop
- High Engagement Low Traffic
- Social Traffic Growth

---

# Advertising Module

Purpose：回答廣告投入是否有效。

Business Questions：

- 廣告有沒有帶來成果？
- 哪些 Campaign 成本過高？
- 哪些 Campaign 值得放大？
- 廣告與網站轉換是否一致？

Data Sources：

- Google Ads
- Meta Ads
- LINE Ads（Future）
- GA Conversion

Signal Examples：

- CPA Increase
- ROAS Drop
- Budget Anomaly
- Conversion Opportunity

---

# Security Module

Purpose：回答網站與系統是否安全。

Business Questions：

- 網站是否有風險？
- 是否有立即需要處理的安全問題？
- 哪些風險會影響營運？
- 是否需要通知技術人員？

Data Sources：

- RiskRadar
- SSL
- Website Scan
- Secret Scan
- Docker Scan
- CSPM

Signal Examples：

- SSL Expiring
- Critical Risk
- Secret Exposure
- Website Health Drop

---

# Support Modules

Support Modules 不一定產生大量 Business Signals。

但它們支援 Workspace 運作。

Reports Module：

- Weekly Report
- Monthly Report
- Client Report
- Export

Settings Module：

- Workspace Settings
- Data Source Settings
- Team Settings
- Billing Settings

Notifications Module（可獨立或整合）：

- Daily Brief
- Alert
- Weekly Summary

---

# Module vs Feature

新增功能前必須判斷：

這是新 Module，還是既有 Module 的 Feature？

Feature 是屬於現有 Module 的能力。

例如：

- Website Performance 是 Website Feature
- Keyword Ranking 是 Search Feature
- Instagram Insights 是 Social Feature
- Campaign Table 是 Advertising Feature
- SSL Check 是 Security Feature

Module 代表新的 Business Domain。

例如：

- CRM
- POS
- Finance
- Customer Service
- Inventory

若只是新資料來源，通常不是新 Module。

---

# Module Lifecycle

Module 生命週期：

Planned

↓

Connected

↓

Collecting Data

↓

Generating Signals

↓

Active

↓

Optimizing

↓

Deprecated

Module 應能顯示目前狀態。

例如：

- 尚未連接
- 授權失效
- 資料不足
- 正常運作
- 需要設定

---

# Module Permissions

Module 應支援權限控制。

例如：

- Owner 可管理所有 Module
- Admin 可連接資料來源
- Manager 可查看 Recommendation
- Viewer 只能查看報告

Permission Framework 將另行定義。

---

# Module Reporting

每個 Module 都應能輸出報告內容。

例如：

- Website Report
- Search Report
- Social Report
- Advertising Report
- Security Report

Workspace Report 應整合各 Module 的重點。

不是把所有資料合併，而是整理成決策導向的 Business Report。

---

# Cross Product Modules

不同產品可使用相同 Module Framework。

Highlight Signal：

- Website
- Search
- Social
- Advertising
- Security

RiskRadar：

- Website Security
- Cloud Security
- Secret Scan
- Docker Scan
- CSPM

BrandHue：

- Brand Color
- Visual Analysis
- Palette Generation
- UI Theme

未來產品只需定義自己的 Module，仍可共用 AI Core Framework。

---

# Engineering Principles

所有 Module 應遵守：

- Standard Module Contract
- Standard API Shape
- Standard Signal Output
- Standard Recommendation Output
- Standard Evidence Output
- Standard Lifecycle

Backend、Frontend、AI Engine 都不應為單一 Module 寫特殊邏輯。

若必須寫特殊邏輯，應確認是否需要擴充 Framework。

---

# Product Principles

Module 必須遵守：

- Business Domain First
- Data Source Second
- Decision First
- Evidence First
- Consistent User Experience
- Extensible Architecture

Module 不應增加使用者學習成本。

每個 Module 都應讓使用者快速理解：

這個領域目前是否健康？

今天有什麼重要 Signal？

下一步應該做什麼？

---

# Future Modules

未來可擴充：

- CRM Module
- POS Module
- Finance Module
- Inventory Module
- Customer Service Module
- Email Marketing Module
- AI Search Module
- Competitor Module
- Market Signal Module

新增 Module 時，應先完成 Module Contract，再進入開發。

---

# Summary

Module 是 Highlight AI Platform 的積木。

Module 不是資料來源。

Module 是 Business Capability。

Workspace

↓

Modules

↓

Signals

↓

Decisions

↓

Recommendations

↓

Evidence

↓

Actions

Highlight AI 透過 Module 擴充平台能力，並保持一致的 Decision First 體驗。

---

# Related Documents

01 AI Core Framework
02 Signal Framework
03 Workspace Framework
05 Evidence Framework（Future）
06 Notification Framework（Future）
07 Widget Framework（Future）
08 Data Flow Framework（Future）
09 Permission Framework（Future）
10 Domain Model（Future）

