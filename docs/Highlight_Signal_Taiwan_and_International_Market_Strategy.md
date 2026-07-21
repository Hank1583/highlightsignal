# Highlight Signal｜台灣與國際市場策略

Version: v1.0
Status: Strategy and Architecture Input
Target: Product、Architecture、Codex
Last Updated: 2026-07-21

---

# 1. 文件目的

本文件用來定義 Highlight Signal 是否應支援國際客戶，以及台灣與國際市場的：

* 產品定位
* 目標客群
* 競爭環境
* 定價策略
* 收益模型
* 市場驗證順序
* 國際化架構需求
* 實作優先級

本文件不是要求立即全面進入國際市場。

核心策略是：

> 產品架構從一開始保留國際化能力，商業驗證先從台灣開始，同時進行小規模英文市場測試。

---

# 2. 核心結論

Highlight Signal 可以鎖定國外客戶。

產品本身使用：

* GA4
* Google Search Console
* SEO
* GEO
* AEO
* AI Analysis
* Recommendation
* Decision Workflow

這些需求並不限於台灣市場。

Highlight Signal 的核心流程具有國際共通性：

```text
Data Source
→ Metric
→ Signal
→ Evidence
→ AI Explanation
→ Recommendation
→ Human Review
→ Decision
→ Action
→ Result
```

因此，國際化不需要重做核心 Domain。

需要調整的主要是：

* 語言
* 時區
* 幣別
* 日期格式
* 報表內容
* AI Prompt
* 付款
* 法律文件
* Email
* 市場定位

---

# 3. 市場進入原則

不採用以下二選一策略：

```text
只做台灣
或
只做國外
```

建議採用：

```text
產品架構：
從現在開始支援國際化

第一階段：
以台灣客戶驗證產品價值與操作流程

同步實驗：
使用英文 Landing Page 測試國際顧問與小型代理商

第二階段：
根據轉換率、客單價與客服成本決定主要市場
```

台灣與國外不是互斥市場。

它們在 Highlight Signal 的商業策略中扮演不同角色：

```text
台灣：
低成本驗證、建立案例、累積第一批客戶

國外：
提高客單價、擴大市場、發展代理商方案
```

---

# 4. Highlight Signal 核心定位

Highlight Signal 不應定位成：

* 另一套 Dashboard
* 單純 GA4 報表
* SEO 排名工具
* AI 聊天查詢工具
* 網站弱點掃描工具
* Looker Studio 替代品

核心定位應是：

> AI Decision Intelligence Platform

它協助使用者回答：

1. 最近發生了什麼變化？
2. 哪些變化值得注意？
3. 有哪些證據支持？
4. 為什麼這件事重要？
5. 現在應該優先做什麼？
6. 人員最後做了什麼決策？
7. 執行後是否產生成效？

---

# 5. 台灣市場分析

## 5.1 市場特性

台灣市場具有以下特性：

* SaaS 付費習慣較保守
* 中小企業對 GA4 與 GSC 的熟悉程度有限
* 客戶可能期待中文教學與人工協助
* LINE、Email 與真人支援仍然重要
* 低價工具與免費工具是主要替代方案
* 顧問公司與行銷公司可能是重要合作對象
* 本地化與中文 AI 分析具有優勢

台灣客戶不一定會將 Highlight Signal 與另一套完全相同的 SaaS 比較。

更可能比較的是：

* 免費 GA4
* Google Search Console
* Looker Studio
* Excel 月報
* SEO 公司提供的報告
* 行銷人員人工整理
* 直接使用 ChatGPT 解釋數據
* 顧問服務

因此，Highlight Signal 在台灣不能只強調「資料整合」。

需要強調：

> 每週主動告訴企業哪些事情值得注意，以及下一步應該做什麼。

---

## 5.2 台灣主要相鄰產品

台灣市場目前較常見的是相鄰產品，而不是完全相同的 Decision Intelligence Platform。

主要類型包括：

### SEO 工具

功能可能包含：

* 網站 SEO 健檢
* 關鍵字研究
* 排名追蹤
* 競業分析
* SEO 文案規劃

部分本地 SEO SaaS 的入門價格約為：

```text
NT$800～1,500／月
```

這會與 Highlight Signal 的 SEO、GEO、AEO 模組形成部分競爭。

但 SEO 工具主要協助使用者操作 SEO。

Highlight Signal 則應協助使用者：

* 發現變化
* 判斷影響
* 排定優先級
* 建立 Recommendation
* 記錄 Decision
* 追蹤 Result

---

### GEO／AI Visibility 平台

部分台灣 MarTech 公司已經提供：

* AI 搜尋能見度
* GEO 分析
* 競品追蹤
* 顧問建議
* 品牌內容優化

這類產品通常偏向：

* 中大型品牌
* 客製導入
* 顧問服務
* 企業級定價

Highlight Signal 初期可以避開大型企業市場。

優先鎖定：

* 沒有數據團隊的中小企業
* 小型品牌
* 獨立行銷顧問
* 小型代理商
* 同時管理數個網站的人員

---

### 行銷自動化與 CRM

台灣也有成熟的：

* LINE 行銷
* CRM
* CDP
* 顧客旅程
* 行銷自動化

這些產品主要負責：

* 顧客互動
* 名單經營
* 分眾
* 訊息推送
* 轉換流程

它們不是 Highlight Signal 的直接競品。

未來反而可能成為資料來源或整合對象。

---

## 5.3 台灣市場機會

Highlight Signal 在台灣的主要機會是：

### 中文決策語言

將技術數據轉換成企業可以理解的中文。

例如：

```text
原始數據：

Organic sessions decreased by 18.4%.
```

轉換為：

```text
自然搜尋流量近 30 天下降約 18%。

主要下降集中在三個產品頁面，
建議先確認頁面內容、索引狀態與搜尋排名變化。
```

---

### 降低顧問成本

台灣 SEO、數據分析與行銷顧問服務的月費，通常遠高於一般 SaaS 月費。

Highlight Signal 不需要完全取代顧問。

產品可以定位成：

> 用較低成本，完成基礎數據整理、異常發現、報告與優先級判斷。

---

### 服務較少被照顧的中小企業

大型 MarTech 平台通常：

* 導入時間長
* 價格不透明
* 功能複雜
* 需要專業行銷團隊操作

Highlight Signal 可以提供：

* 簡單登入
* Google 授權
* 自動分析
* 中文建議
* Email 週報
* 不需要聘請專職數據人員

---

# 6. 國際市場分析

## 6.1 市場特性

國際市場具有以下特性：

* SaaS 付費習慣成熟
* 可接受價格通常較高
* 行銷代理商市場較大
* Self-service 接受度較高
* 國際信用卡訂閱普遍
* 英文文件與產品體驗要求較高
* 成熟競品數量非常多
* 品牌信任建立較困難

國際市場不是比較容易。

它的特性是：

> 競爭更激烈，但市場上限與客單價也更高。

---

## 6.2 國際主要相鄰產品

以下價格為 2026 年 7 月前後的市場研究資料。

實際實作定價或競品比較前，必須重新查證官方最新價格。

---

### AgencyAnalytics

主要功能：

* 多客戶 Dashboard
* 自動化報表
* 白標
* AI Insights
* 異常偵測
* 多資料來源整合
* 客戶 Portal

市場定位：

> 行銷代理商報表與客戶管理平台

價格模式約為：

```text
US$20／Client／Month
```

Highlight Signal 不應直接複製 AgencyAnalytics。

差異應放在：

* Signal Priority
* Evidence
* Recommendation
* Human Review
* Decision History
* Result Evaluation

---

### Databox

主要功能：

* 多來源 Dashboard
* AI Analyst
* Performance Summary
* Anomaly Detection
* Forecast
* Goals
* Agency Account

代理商方案約落在：

```text
US$79～799／月
```

Databox 證明國際市場願意為：

* 多來源分析
* 自動報告
* AI 洞察
* 多客戶管理

持續付費。

Highlight Signal 必須避免只成為較小型的 Databox。

---

### DashThis

主要功能：

* 自動化行銷報告
* Dashboard
* AI Summary
* Opportunities
* Wins
* Issues
* 白標報告

價格約落在：

```text
US$44～429／月
```

DashThis 主要解決：

> 如何更快產生客戶報表。

Highlight Signal 應進一步解決：

> 報表完成後，客戶最應該採取哪個行動。

---

### Semrush

主要功能：

* SEO
* Keyword Research
* Site Audit
* Competitor Analysis
* AI Search Visibility
* Content
* Backlink
* Rank Tracking

價格約落在：

```text
US$117～456／月
```

企業版可能更高。

Highlight Signal 不應試圖取代 Semrush 的搜尋資料庫。

合理定位是：

```text
Semrush、GA4、GSC 等工具
提供資料

Highlight Signal
將資料轉換成 Signal、Recommendation 與 Decision
```

---

### Ahrefs

主要功能：

* Keyword Data
* Backlink
* Competitor Research
* Rank Tracking
* Site Audit

價格約落在：

```text
US$129～1,499+／月
```

Ahrefs 是資料與研究工具。

Highlight Signal 應定位成決策層，而不是建立另一個大型 SEO Database。

---

### Google Analytics AI 功能

Google 已逐步增加：

* 自然語言查詢
* AI Advisor
* 自動洞察
* 圖表
* 異常解釋
* 報表導覽

這代表 Highlight Signal 不能只提供：

* 用自然語言詢問 GA4
* AI 摘要
* 流量變化說明

這些能力可能持續被 Google 免費提供。

Highlight Signal 必須建立在 Google 單一產品之外。

主要差異包括：

* GA4 與 GSC 跨資料來源
* 主動發現 Signal
* Evidence 組合
* Recommendation
* Human Review
* Decision
* Action
* Result Tracking
* 多客戶管理
* 跨週期追蹤
* 可稽核的決策紀錄

---

# 7. 國際市場目標客群

初期不建議直接面向：

> 全球所有中小企業。

範圍太廣，教育成本與獲客成本都會過高。

國際市場第一優先客群建議為：

> 擁有 3～20 個客戶的獨立行銷顧問與小型代理商。

---

## 7.1 理想客戶

### Freelance Marketer

特徵：

* 同時管理多個客戶
* 每週或每月需要整理數據
* 使用 GA4、GSC、SEO 工具
* 沒有工程或數據團隊
* 希望節省報告時間

---

### SEO Consultant

特徵：

* 管理多個網站
* 需要向客戶解釋流量與搜尋變化
* 已使用 Ahrefs、Semrush 或其他 SEO 工具
* 需要將資料轉換成建議

---

### Small Marketing Agency

特徵：

* 約 2～20 人
* 管理多個品牌
* 需要白標報告
* 需要客戶 Portal
* 每月花大量時間製作報告
* 需要跨客戶查看異常

---

### Fractional CMO

特徵：

* 同時服務數家公司
* 關注的是決策，不是單一指標
* 需要快速理解每間公司的狀態
* 需要留下 Recommendation 與 Decision 記錄

---

## 7.2 不建議初期優先鎖定

* 大型跨國企業
* Fortune 500
* 大型媒體代理商
* 沒有 GA4 或 GSC 的傳統企業
* 需要大量客製開發的客戶
* 需要即時真人客服的客戶
* 需要複雜 Data Warehouse 整合的客戶

這些客戶通常需要：

* SOC 2
* SSO
* SLA
* Data Warehouse
* Enterprise Support
* 法務審查
* 大量整合
* 專人導入

不符合一人公司初期模式。

---

# 8. 台灣目標客群

台灣第一階段建議鎖定：

## 8.1 小型品牌與電商

特徵：

* 已有品牌官網
* 已使用 GA4
* 有搜尋流量需求
* 沒有專職數據分析師
* 不知道報表中什麼最重要

---

## 8.2 中小企業官網

特徵：

* 網站已經上線
* 有產品或服務
* 偶爾查看 GA4
* 沒有固定分析流程
* 需要中文說明

---

## 8.3 獨立行銷顧問

特徵：

* 同時服務數個客戶
* 每月需要整理報表
* 熟悉 GA4 與 GSC
* 願意測試新工具
* 可能帶入多個 Workspace

---

## 8.4 小型行銷公司

特徵：

* 客戶數約 5～30
* 需要定期報告
* 不想建立內部數據系統
* 希望提高顧問服務效率

相較於單一中小企業，行銷顧問與小型代理商可能是更高價值的客戶。

因為一個付費帳號可能帶入多個網站。

---

# 9. 雙市場產品定位

## 9.1 台灣定位

建議中文定位：

> AI 成效診斷與每週決策建議平台

或：

> 幫你從網站數據中找出最值得注意的變化，以及下一步該做什麼。

台灣行銷內容應避免過度使用：

* Decision Intelligence
* Signal Framework
* Evidence Architecture
* Human-in-the-loop

這些是內部產品架構語言。

對外應使用：

* 發現重要變化
* 解釋原因
* 改善建議
* 每週報告
* 決策紀錄
* 成效追蹤

---

## 9.2 國際定位

建議英文定位：

> Decision-first analytics for lean marketing teams.

或：

> Turn GA4 and Search Console into weekly client decisions.

或：

> From marketing data to clear recommendations and tracked decisions.

不建議使用：

> AI Marketing Dashboard

因為市場上已經有大量相似產品。

---

# 10. 定價策略

## 10.1 台灣定價

目前初步規劃：

| Plan       | Monthly Price |
| ---------- | ------------: |
| Starter    |        NT$990 |
| Pro        |      NT$1,990 |
| VIP        |      NT$2,490 |
| Enterprise |        Custom |

這個價格可以作為市場驗證版本。

但 Pro 與 VIP 的差距只有 NT$500。

必須讓 VIP 的價值明顯大於 Pro。

---

## 10.2 台灣方案建議

### Starter｜NT$990

適合：

* 單一網站
* 小型品牌
* 初次使用者

建議限制：

* 1 個 Workspace
* 1 個 GA4 Property
* 1 個 GSC Property
* 基礎週報
* 基礎 Signal
* 有限 AI 分析次數
* Email 支援

---

### Pro｜NT$1,990

適合：

* 穩定經營網站的企業
* 行銷人員
* 獨立顧問

建議內容：

* 3 個 Workspace 或網站
* 完整 Signal
* Evidence
* Recommendation
* Decision History
* 進階週報
* 報告匯出
* 更多 AI 額度

---

### VIP｜NT$2,490

定位應作為主要成交方案。

建議內容：

* 5 個以上 Workspace
* GEO／AEO
* Result Evaluation
* 完整 Decision Workflow
* 優先 Email 支援
* 進階報告
* 自訂品牌報告
* 較長 Retention
* 更多團隊成員

VIP 必須讓使用者感覺：

> 只多 NT$500，但取得完整產品價值。

---

### Enterprise

提供：

* 客製 Workspace
* 更多使用者
* 客製資料來源
* 客製報告
* SLA
* 導入服務
* 官方 LINE 支援
* 合約與發票
* 客製權限

---

# 11. 國際定價建議

國際版不應只是將台幣價格直接換算成美元。

應依照國際 SaaS 市場重新定價。

建議初版：

| Plan       | Monthly Price | Target                 |
| ---------- | ------------: | ---------------------- |
| Solo       |         US$29 | Freelancer／Single Site |
| Pro        |         US$59 | Consultant／Small Team  |
| Agency     |        US$149 | Small Agency           |
| Enterprise |        Custom | Larger Agency／Company  |

---

## 11.1 Solo｜US$29

建議內容：

* 1 Workspace
* GA4
* GSC
* Weekly Decision Summary
* Basic Signals
* AI Recommendations
* Email Support

---

## 11.2 Pro｜US$59

建議內容：

* 3～5 Workspaces
* Advanced Signals
* Evidence
* Decision History
* Result Tracking
* Report Export
* Team Access

---

## 11.3 Agency｜US$149

建議內容：

* 10～20 Client Workspaces
* White-label Report
* Client Portal
* Multi-client Overview
* Agency Weekly Summary
* Cross-client Alert
* Team Permission
* Priority Email Support

代理商方案可能成為國際市場的主要收入來源。

---

# 12. 第一個 NT$1,000,000 營收試算

以下試算採用：

```text
US$1 = NT$32
```

此匯率只用於策略試算。

實際財務模型應使用可調整的匯率參數。

---

## 12.1 只做台灣 Pro

```text
42 位客戶
× NT$1,990
× 12 個月
= NT$1,002,960
```

考慮：

* 免費試用
* 優惠
* 客戶流失
* 非完整年度訂閱

實際目標應設為：

```text
50～60 位活躍付費客戶
```

---

## 12.2 只做國際 Pro

```text
45 位客戶
× US$59
× 12 個月
× NT$32
= NT$1,019,520
```

考慮流失後，實際目標約為：

```text
55～65 位活躍國際客戶
```

---

## 12.3 台灣與國際混合

```text
25 位台灣 Pro
＋
20 位國際 Pro
```

試算：

```text
25 × NT$1,990 × 12
＋
20 × US$59 × 12 × NT$32
= 約 NT$1,050,000
```

這是較平衡的營收組合。

---

## 12.4 代理商導向

```text
10 位國際 Agency
＋
20 位台灣 Pro
```

試算：

```text
10 × US$149 × 12 × NT$32
＋
20 × NT$1,990 × 12
= 約 NT$1,050,000
```

此模式只需要約 30 個付費帳號。

但 10 位 Agency 客戶可能代表：

* 100 個以上 Workspace
* 更高的系統負載
* 更完整的權限需求
* 白標與 Portal
* 較高的支援期待

客戶數較少，不代表工程與營運一定比較簡單。

---

# 13. 收益與成本評估

Highlight Signal 目前採用：

* PHP
* Shared Hosting
* Cloudflare
* MySQL
* MySQL Queue
* GAS Scheduler
* AI API
* Email

初期基礎設施成本可以維持相對低。

主要變動成本包括：

* AI Token
* 資料同步
* Database Storage
* Email
* Payment Fee
* 免費診斷使用量
* 客服時間
* 行銷獲客成本

---

## 13.1 第一個 NT$1,000,000 的概略成本

粗略估算：

| Cost Category                         | Revenue Ratio |
| ------------------------------------- | ------------: |
| Payment Processing                    |         3%～5% |
| AI／Hosting／Storage／Email              |        8%～15% |
| Marketing／Acquisition                 |       10%～25% |
| Software／Legal／Operations             |        5%～10% |
| Remaining Before Owner Salary and Tax |       45%～70% |

因此，第一個 NT$1,000,000 營收可能剩餘：

```text
約 NT$450,000～700,000
```

此數字不是保證。

最大變數通常不是伺服器費用。

而是：

* Customer Acquisition Cost
* 客戶流失率
* 客服工時
* 是否需要大量人工分析
* 免費 Trial 成本
* AI 使用量

---

## 13.2 一人公司的主要營運限制

Highlight Signal 不應依賴：

* 每位客戶都要人工導入
* 每週人工修改報告
* 即時客服
* 大量 LINE 支援
* 無限制客製功能
* 每個客戶單獨調整 Prompt
* 手動修正每一份 AI Recommendation

否則營收增加時，工作量也會同比增加。

產品目標應是：

```text
客戶自行註冊
→ 自行連接資料
→ 自動產生分析
→ AI 客服
→ Email 非即時支援
```

只有 Enterprise 提供更高程度的人工服務。

---

# 14. 國際化架構需求

核心 Domain 不需要因國際市場重做。

但以下欄位與能力應盡早加入。

---

## 14.1 Workspace Locale Settings

建議 Workspace 具有：

```text
locale
timezone
report_language
currency
date_format
number_format
week_start_day
```

範例：

```json
{
  "locale": "zh-TW",
  "timezone": "Asia/Taipei",
  "report_language": "zh-TW",
  "currency": "TWD",
  "date_format": "YYYY/MM/DD",
  "number_format": "zh-TW",
  "week_start_day": "monday"
}
```

國際客戶範例：

```json
{
  "locale": "en-US",
  "timezone": "America/New_York",
  "report_language": "en-US",
  "currency": "USD",
  "date_format": "MM/DD/YYYY",
  "number_format": "en-US",
  "week_start_day": "monday"
}
```

---

## 14.2 Frontend i18n

所有 UI 文字應放入語言資源。

不應在 React Component 中直接寫死中文。

建議支援：

```text
zh-TW
en-US
```

初期不需要支援更多語言。

應包含：

* Navigation
* Button
* Form
* Error Message
* Empty State
* Notification
* Dashboard Label
* Recommendation Status
* Human Review
* Decision
* Trial
* Billing

---

## 14.3 AI Prompt Internationalization

AI Prompt 不應只有一套中文 Prompt。

建議分為：

```text
Prompt Definition
＋
Workspace Language
＋
Industry Context
＋
Output Schema
```

範例：

```text
prompts/
├── zh-TW/
│   ├── signal_analysis
│   ├── evidence_summary
│   ├── recommendation
│   └── weekly_report
└── en-US/
    ├── signal_analysis
    ├── evidence_summary
    ├── recommendation
    └── weekly_report
```

英文 Prompt 不應只是中文逐字翻譯。

必須符合英文商業報告語氣。

---

## 14.4 Report Internationalization

報告需要支援：

* 報表標題
* 日期範圍
* 數值格式
* 百分比格式
* 幣別格式
* 時區
* AI Summary
* Recommendation
* CTA
* Footer
* 法律聲明

同一個 Workspace 的報表語言應保持一致。

---

## 14.5 Notification Internationalization

Email Template 應支援：

```text
zh-TW
en-US
```

至少包括：

* Welcome
* Email Verification
* Data Source Connected
* Diagnosis Completed
* Weekly Report
* Signal Alert
* Trial Started
* Trial Expiring
* Payment Success
* Payment Failed
* Subscription Cancelled

---

## 14.6 Timezone

所有 Database 時間建議使用 UTC 儲存。

顯示與排程時依 Workspace Timezone 轉換。

需要確認：

* Weekly Report 發送時間
* Daily Job
* Trial Expiration
* Billing Date
* Data Period
* GA4 Date Range
* GSC Date Range

不要直接假設所有 Workspace 都使用 Asia/Taipei。

---

## 14.7 Currency

至少支援：

```text
TWD
USD
```

價格不可只存在 Frontend。

Plan 與 Price 應由 Billing Domain 管理。

概念模型：

```text
Plan
├── Starter
├── Pro
├── VIP
└── Agency

Price
├── TWD Monthly
├── TWD Annual
├── USD Monthly
└── USD Annual
```

不同市場可以使用不同方案與價格。

---

## 14.8 Payment

台灣與國際市場可能使用不同金流。

台灣可能使用：

* 本地信用卡
* 發票
* 年繳轉帳
* 台灣第三方支付

國際市場可能使用：

* Stripe
* International Credit Card
* USD Subscription
* Tax Information
* Invoice／Receipt

Billing Domain 不應將單一金流商寫死在核心邏輯中。

建議使用：

```text
PaymentProvider
├── TaiwanPaymentAdapter
└── InternationalPaymentAdapter
```

---

## 14.9 Legal and Privacy

國際化至少需要準備：

* Terms of Service
* Privacy Policy
* Cookie Policy
* Data Processing Information
* Account Deletion
* Workspace Deletion
* Data Export
* Data Retention
* OAuth Data Usage
* AI Data Usage Disclosure

初期不一定需要完成所有企業級認證。

但資料刪除與隱私流程必須清楚。

---

# 15. 國際化非目標

第一版國際化不需要：

* 支援十種語言
* 全球稅務自動化
* 全球所有幣別
* 多區域部署
* Data Residency
* SOC 2
* ISO 27001
* Enterprise SSO
* 多國法人
* 全球電話客服
* 24 小時支援

第一版只需要：

```text
繁體中文
英文

TWD
USD

Asia/Taipei
＋
標準 IANA Timezone 支援
```

---

# 16. 市場驗證計畫

## Phase 1：台灣產品驗證

目標：

```text
5～10 位付費客戶
```

驗證：

* 使用者是否願意連接 GA4
* 使用者是否願意連接 GSC
* Signal 是否有價值
* Recommendation 是否會被採用
* Weekly Report 是否會被閱讀
* 使用者是否願意續約
* 客服需求是否過高
* 定價是否可接受

主要客群：

* 中小企業
* 小型品牌
* 行銷顧問
* 小型代理商

---

## Phase 2：英文基礎建設

完成：

* 英文 UI
* 英文 Email
* 英文 Report
* 英文 Prompt
* USD Pricing
* 國際 Landing Page
* Privacy／Terms
* 國際付款

這一階段不要求大量國際行銷。

---

## Phase 3：國際小規模測試

目標：

```text
100～300 位英文 Landing Page 訪客
10～20 位 Trial
3～5 位付費客戶
```

主要客群：

* Freelance Marketer
* SEO Consultant
* Small Agency
* Fractional CMO

主要渠道：

* LinkedIn
* Product Community
* Indie Hacker Community
* SEO Community
* Direct Outreach
* Small Agency Outreach

---

## Phase 4：比較市場效率

比較：

| Metric                      | Taiwan | International |
| --------------------------- | -----: | ------------: |
| Visitor to Signup           |        |               |
| Signup to Connect GA4       |        |               |
| GA4 to Trial                |        |               |
| Trial to Paid               |        |               |
| Average Revenue Per Account |        |               |
| Churn                       |        |               |
| Support Hours per Account   |        |               |
| AI Cost per Account         |        |               |
| Customer Acquisition Cost   |        |               |
| Payback Period              |        |               |

不只比較客戶數。

真正應比較：

```text
每投入一小時與一元成本，
哪個市場可以產生更多可持續收益。
```

---

# 17. Codex 架構評估要求

請 Codex 檢查目前程式碼是否已支援以下需求。

---

## 17.1 Locale

檢查：

* UI 是否有 i18n
* API 是否回傳硬編碼中文
* Enum Label 是否與 Domain Value 分離
* Validation Message 是否可翻譯
* Report 是否寫死中文

---

## 17.2 Timezone

檢查：

* Database 儲存時區
* Workspace 是否有 Timezone
* Queue 排程是否假設台灣時間
* Weekly Report 是否依 Server Time
* Trial Expiration 是否可能跨時區錯誤

---

## 17.3 Report Language

檢查：

* AI Prompt 是否可依語言切換
* Recommendation 是否有固定中文句型
* Email Template 是否支援多語言
* PDF／HTML Report 是否支援英文

---

## 17.4 Currency and Billing

檢查：

* Price 是否直接寫死 TWD
* Subscription 是否可使用 USD
* Payment Provider 是否可替換
* Plan 與 Price 是否分離
* Invoice 是否只支援台灣格式

---

## 17.5 Domain Naming

核心 Domain 欄位與 Enum 建議使用穩定英文識別值。

例如：

```text
status = approved
```

不要儲存：

```text
status = 已核准
```

中文與英文顯示文字由 Frontend 或 Translation Layer 處理。

---

## 17.6 Data Source

GA4 與 GSC 為國際共通資料來源。

請確認：

* Property Name 可包含多語言
* Domain 可使用國際網域
* Search Query 可保存 Unicode
* Report 可處理非中文關鍵字
* AI Prompt 不假設輸入內容為中文

---

# 18. Codex 建議輸出

請 Codex 在開始修改程式碼前，先提供：

## Current State

* 現有 i18n 實作
* 現有 Workspace Settings
* 現有 Timezone 處理
* 現有 Billing
* 現有 Report Language
* 現有 AI Prompt 結構
* 現有 Email Template

---

## Gap Analysis

分類為：

```text
Already Supported
Small Extension
Needs New Module
Needs Refactor
Blocking Issue
Can Be Deferred
```

---

## Minimum Internationalization Plan

只完成：

```text
zh-TW
en-US
TWD
USD
Workspace Timezone
Multilingual Report
Multilingual Email
```

---

## Long-term Plan

規劃但暫不實作：

* More Languages
* More Currencies
* Regional Deployment
* Enterprise Compliance
* Data Residency
* Advanced Tax Handling

---

# 19. 建議執行優先順序

## Priority 0：避免未來重寫

現在就應處理：

* Domain Enum 不儲存中文
* Database Time 使用 UTC
* Workspace 加入 Timezone
* UI String 與 Component 分離
* AI Prompt 不寫死中文架構
* Price 與 Plan 分離
* Payment Provider 使用 Adapter

---

## Priority 1：台灣 MVP

先完成：

* 中文產品
* TWD Pricing
* 台灣 Email
* 台灣報表
* 台灣市場驗證

---

## Priority 2：英文版

完成：

* 英文 Landing Page
* 英文 Dashboard
* 英文 Email
* 英文 Report
* 英文 Prompt
* USD Pricing

---

## Priority 3：國際付款與測試

完成：

* 國際信用卡
* USD Subscription
* 國際 Trial
* 國際客戶測試
* 英文客服文件

---

## Priority 4：Agency Plan

當有國際代理商需求後再實作：

* Multi-client Overview
* White-label
* Client Portal
* Agency Permission
* Bulk Report
* Cross-client Signal
* Agency Billing

不要因為未來可能有代理商，就在現在一次完成全部功能。

---

# 20. 產品決策原則

市場選擇不應只看：

* 哪個市場人口比較多
* 哪個市場月費比較高
* 哪裡競品比較少

應該看：

```text
Revenue
－ Infrastructure Cost
－ AI Cost
－ Payment Cost
－ Acquisition Cost
－ Support Time Cost
＝ Sustainable Owner Profit
```

Highlight Signal 是一人公司產品。

最重要的不是最大營收。

而是：

> 在不聘請大量人員、不提供即時客服、不接受無限制客製的前提下，建立可持續收入。

---

# 21. 最終策略

Highlight Signal 應採用：

```text
Taiwan-first
International-ready
Agency-capable
Not agency-dependent
```

具體含義：

### Taiwan-first

先用台灣客戶：

* 驗證產品
* 發現操作問題
* 建立案例
* 測試價格
* 測試續約
* 控制初期風險

### International-ready

架構上現在就支援：

* Locale
* Timezone
* Language
* Currency
* Payment Adapter
* Multilingual Prompt
* Multilingual Report

### Agency-capable

資料模型應允許：

* 一個 Account 管理多個 Workspace
* 多網站
* 多成員
* 客戶分組
* 未來白標

但不需要立刻完成完整 Agency Product。

### Not agency-dependent

產品仍應讓單一企業與品牌可以自行使用。

不能為了代理商市場，使產品變得過度複雜。

---

# 22. 最終結論

Highlight Signal 可以同時服務台灣與國際客戶。

台灣市場的優勢是：

* 語言與在地化
* 初期信任較容易建立
* 完整 Decision Workflow 競品較少
* 適合取得第一批真實案例

國際市場的優勢是：

* SaaS 付費習慣成熟
* 客單價較高
* 小型代理商與獨立顧問數量多
* 多 Workspace 與白標具有清楚價值

國際市場的缺點是：

* 競爭激烈
* 英文產品品質要求高
* 免費與成熟替代方案多
* 新品牌建立信任較困難

因此正確路線不是放棄台灣、直接進攻國外。

而是：

```text
先在台灣取得 5～10 位客戶
→ 完成產品與銷售流程驗證
→ 同步完成英文與國際化基礎
→ 測試 3～5 位國際付費客戶
→ 比較兩個市場的收益與服務成本
→ 再決定主要成長市場
```

最終產品定位保持不變：

> Highlight Signal 不只告訴使用者數據是多少。

它要告訴使用者：

> 哪些變化值得注意、為什麼重要、現在應該做什麼，以及執行後是否真的有效。
