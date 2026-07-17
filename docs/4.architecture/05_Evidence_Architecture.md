# Evidence Framework

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

> V1 Alignment Patch: Evidence is traceable fact. Explanation is interpretation, and Business Impact is contextual assessment. Metric remains within the Evidence Domain and does not become an independent V1 Module.

Evidence Framework 定義 Highlight AI 產品中 Evidence 的共同標準。

Evidence 是支持 AI Decision 與 AI Recommendation 的證據層。

Evidence 的目的不是展示更多資料。

Evidence 的目的是讓使用者理解：

AI 為什麼這樣判斷？

AI 為什麼提出這個建議？

使用者是否可以信任這個判斷？

Evidence 是 Decision First Experience 中，連接 AI 判斷與 Raw Data 的橋梁。

---

# Philosophy

傳統 Dashboard：

Data

↓

Dashboard

↓

User Analysis

↓

Decision

Highlight AI：

Signal

↓

Decision

↓

Recommendation

↓

Evidence

↓

Action

Evidence 不應該讓使用者重新分析所有資料。

Evidence 應該幫助使用者快速確認：AI 的判斷是否合理。

---

# Core Idea

Evidence 是可被檢視、可被追溯、可被解釋的資料證據。

AI 可以提出 Decision。

AI 可以提出 Recommendation。

但每一個重要判斷，都必須能連回 Evidence。

沒有 Evidence 的 AI 判斷，不應進入 Today's Signals。

---

# Evidence Hierarchy

Highlight AI 採用以下資訊層級：

Decision

↓

Recommendation

↓

Evidence

↓

Raw Data

Evidence 位於 Recommendation 與 Raw Data 之間。

Evidence 不是原始資料。

Evidence 是被 AI 選出來、最能支持判斷的資料片段。

---

# Evidence Is Not Dashboard

Evidence 不等於 Dashboard。

Dashboard 常常是固定、全面、資料導向。

Evidence 是動態、精選、決策導向。

錯誤：

顯示所有 GA 圖表。

正確：

只顯示能解釋 Organic Traffic Drop 的 Landing Page Trend、CTR Trend、Keyword Ranking。

---

# Evidence Is Not Raw Data

Raw Data 是完整資料。

Evidence 是被挑選過的關鍵資料。

Raw Data 回答：

完整資料是什麼？

Evidence 回答：

哪些資料能支持這個判斷？

Raw Data 應保留。

但 Workspace Home 不應直接呈現 Raw Data。

---

# Evidence Types

Evidence 可以有多種型態。

包含：

- Chart
- Table
- Trend
- Timeline
- Comparison
- Ranking
- Screenshot
- Scan Result
- Report Summary
- Raw Data Reference
- AI Explanation

未來可擴充：

- Heatmap
- Video
- Voice Summary
- PDF Report
- Benchmark
- Simulation

---

# Evidence Sources

Evidence 可來自不同資料來源。

例如：

Website Evidence：

- GA Sessions
- Landing Page
- Conversion
- Page Speed
- Website Health

Search Evidence：

- Search Console
- Keyword Ranking
- CTR
- Impression
- GEO / AEO Result

Social Evidence：

- Facebook Reach
- Instagram Engagement
- Threads Traffic
- Post Performance

Advertising Evidence：

- Google Ads
- Meta Ads
- Campaign CPA
- ROAS
- Conversion

Security Evidence：

- RiskRadar Finding
- SSL Status
- Secret Scan Result
- Docker Scan Result
- CSPM Finding

---

# Evidence Selection

Evidence 不應全部顯示。

Evidence 必須由 Adaptive Evidence Engine 選擇。

選擇依據包含：

- Related Signal
- Related Decision
- Related Recommendation
- Business Impact
- Confidence
- Urgency
- User Context
- Historical Pattern
- Module Context

AEE 的工作不是產生更多圖表。

AEE 的工作是挑出最有說服力的證據。

---

# Evidence Mapping

每一種 Signal 都應建立 Evidence Mapping。

Evidence Mapping 定義：

這個 Signal 發生時，應該優先查看哪些 Evidence？

例如：

Signal：Organic Traffic Drop

Evidence：

- Landing Page Trend
- Search CTR
- Keyword Ranking
- Index Coverage
- Website Health

Signal：CPA Increase

Evidence：

- Campaign CPA
- ROAS
- Conversion Rate
- Landing Page Performance
- Budget Change

Signal：SSL Expiring

Evidence：

- SSL Certificate Status
- Expiration Date
- RiskRadar Finding
- Website Health

---

# Evidence Score

每一份 Evidence 都應具有 Evidence Score。

Evidence Score 用於排序與顯示優先順序。

Evidence Score 可由以下因素組成：

- Relevance
- Confidence
- Business Impact
- Freshness
- Clarity
- Actionability
- Source Reliability

Evidence Score 越高，越應優先顯示。

---

# Evidence Priority

Evidence 應分層顯示。

建議：

Primary Evidence

最重要證據，直接支持 Decision。

Secondary Evidence

補充證據，幫助理解背景。

Raw Reference

可追溯的完整資料來源。

Workspace Home 只應顯示 Primary Evidence Preview。

Module Page 可顯示 Primary + Secondary Evidence。

Raw Data Page 顯示完整資料。

---

# Evidence Registry

所有 Evidence Type 都應註冊在 Evidence Registry。

Evidence Registry 定義：

- Evidence ID
- Evidence Name
- Evidence Type
- Related Module
- Supported Signals
- Required Data Source
- Display Format
- Refresh Frequency
- Confidence Rule
- Permission Requirement

Evidence Registry 讓系統可以動態組合 Evidence。

---

# Evidence Contract

每一份 Evidence 都應符合 Evidence Contract。

Evidence Contract 包含：

1. Title
2. Type
3. Description
4. Related Signal
5. Related Decision
6. Related Recommendation
7. Source
8. Time Range
9. Confidence
10. Evidence Score
11. Raw Data Reference

若無法追溯 Raw Data，則不應成為正式 Evidence。

---

# Evidence And Decision

Decision 必須有 Evidence。

例如：

Decision：首頁 SEO 需要優先處理。

Evidence：

- 首頁 CTR 連續下降
- 主要關鍵字排名下降
- Organic Traffic 下降
- 競品內容增加

AI 不應只說：SEO 變差。

AI 必須指出：根據哪些 Evidence，判斷 SEO 需要處理。

---

# Evidence And Recommendation

Recommendation 必須有 Evidence。

例如：

Recommendation：更新首頁 Meta Title。

Evidence：

- CTR 下降
- Ranking 未大幅下降
- Impression 穩定
- 表示曝光仍在，但點擊率變差

這代表問題可能不是搜尋排名，而是標題吸引力不足。

Evidence 幫助 Recommendation 更具可信度。

---

# Evidence And Trust

Evidence 是 AI Trust 的基礎。

使用者信任 AI，不是因為 AI 說得像專家。

而是因為 AI 能說明：

為什麼？

根據什麼？

如果我想看更多，能不能追到 Raw Data？

因此，Evidence 是 Explainability 的核心。

---

# Evidence Display Rules

Evidence 顯示應遵守：

- 少量優先
- 高相關優先
- 高信心優先
- 可行動優先
- 可追溯
- 可展開

不要在第一層展示所有 Evidence。

使用 Progressive Disclosure：

Evidence Preview

↓

Evidence Detail

↓

Raw Data

---

# Evidence Preview

Evidence Preview 出現在 Workspace Home。

目的：

讓使用者快速知道 AI 判斷有根據。

Evidence Preview 不應過長。

每個 Signal 建議顯示 1~3 個 Evidence Preview。

例如：

Organic Traffic Drop

Evidence Preview：

- Organic Sessions -18%
- CTR -12%
- Top Landing Page -25%

---

# Evidence Detail

Evidence Detail 出現在 Module Page 或 Signal Detail Page。

內容可包含：

- Chart
- Table
- AI Explanation
- Timeline
- Related Evidence
- Raw Data Link

Evidence Detail 應回答：

這個證據代表什麼？

它如何支持 Decision？

它是否支持 Recommendation？

---

# Evidence Lifecycle

Evidence 生命週期：

Generated

↓

Selected

↓

Displayed

↓

Reviewed

↓

Linked To Action

↓

Archived

Evidence 不一定永久顯示。

但重要 Evidence 應保留在歷史紀錄中，用於追蹤 AI 判斷品質。

---

# Evidence Freshness

Evidence 必須有時間概念。

每份 Evidence 應記錄：

- Generated Time
- Data Time Range
- Last Updated Time
- Refresh Frequency

過期 Evidence 不應支援高信心 Decision。

例如：

三個月前的 SEO Data 不應用來判斷今天的 SEO Risk。

---

# Evidence Confidence

Evidence 應具備 Confidence。

Confidence 受到以下因素影響：

- Data Completeness
- Source Reliability
- Freshness
- Sample Size
- Historical Consistency
- Measurement Quality

若 Evidence Confidence 不足，AI 應標示不確定。

---

# Evidence Relationships

Evidence 可以互相關聯。

例如：

Organic Traffic Drop

相關 Evidence：

- Landing Page Trend
- Search CTR
- Keyword Ranking
- Website Health
- Recent Content Change

這些 Evidence 可形成 Evidence Graph。

Evidence Graph 可幫助 AI 更好地解釋原因。

---

# Evidence Graph

Evidence Graph 連接：

Signal

Decision

Recommendation

Evidence

Raw Data

Action

Result

未來系統應能回答：

這個 Recommendation 是根據哪些 Evidence？

這些 Evidence 來自哪些 Raw Data？

Action 後這些 Evidence 是否改善？

---

# Evidence And Widget

Widget 是 Evidence 的呈現方式。

Evidence 是內容。

Widget 是 UI Component。

例如：

Evidence：Landing Page Trend

Widget：Line Chart

Evidence：Keyword Ranking

Widget：Table

Evidence：SSL Expiring

Widget：Status Card

Widget Framework 將定義如何呈現 Evidence。

Evidence Framework 只定義 Evidence 本身。

---

# Evidence And Reports

Evidence 可進入 Report。

但 Report 不應只是 Evidence 集合。

Report 應整理成：

- Summary
- Key Signals
- Key Decisions
- Recommendations
- Evidence
- Action Status
- Result

Evidence 是 Report 的基礎材料。

---

# Cross Product Evidence

同一套 Evidence Framework 可套用至不同產品。

Highlight Signal：

- Business Evidence
- Marketing Evidence
- Website Evidence
- Search Evidence

RiskRadar：

- Security Finding
- Scan Result
- Risk Evidence
- Log Evidence

BrandHue：

- Color Contrast
- Hue Spread
- Brand Fit
- Palette Comparison

所有產品皆遵守：

Decision 必須能被 Evidence 支持。

---

# Engineering Principles

系統設計應支援：

- Evidence Storage
- Evidence Mapping
- Evidence Score
- Evidence Registry
- Evidence Relationship
- Raw Data Reference
- Evidence Lifecycle

Database 不應只存 Dashboard Data。

Database 應能保存 AI 選出的 Evidence。

API 應能回傳：

- Evidence Preview
- Evidence Detail
- Related Signal
- Related Recommendation
- Raw Data Reference

Frontend 應支援 Progressive Disclosure。

---

# Product Principles

Evidence 必須遵守：

- Evidence supports Decision.
- Evidence supports Recommendation.
- Evidence is not Dashboard.
- Evidence is not Raw Data.
- Evidence must be traceable.
- Evidence must be prioritized.
- Evidence must build trust.

Evidence 的目標不是讓使用者看到更多。

Evidence 的目標是讓使用者更快相信正確的判斷。

---

# Future

Evidence Framework 未來可加入：

- Evidence Graph Database
- Evidence Replay
- Evidence Quality Score
- Evidence Benchmark
- Evidence A/B Testing
- Evidence Learning Loop
- Evidence Auto Explanation
- Evidence Export

未來 AI 可學習：

哪些 Evidence 最容易讓使用者理解？

哪些 Evidence 最能支持有效 Recommendation？

哪些 Evidence 其實不重要？

---

# Summary

Evidence 是 Highlight AI 的信任層。

AI 不只要告訴使用者：

今天重要的是什麼。

AI 還要能說明：

為什麼這件事重要。

根據什麼資料。

下一步為什麼合理。

Evidence 讓 Highlight AI 從黑盒建議，變成可解釋、可追溯、可驗證的 Decision Intelligence Platform。

---

# Related Documents

01 AI Core Framework
02 Signal Framework
03 Workspace Framework
04 Module Framework
06 Notification Framework（Future）
07 Widget Framework（Future）
08 Data Flow Framework（Future）
09 Permission Framework（Future）
10 Domain Model（Future）

