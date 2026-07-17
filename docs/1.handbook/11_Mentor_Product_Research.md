# Mentor Product Research

Version: v0.1

Last Update: 2026-07-09

Source: `D:\7.Highlight\2.Document\5.產品研究\Mentor`

---

# Purpose

整理 Mentor 競品截圖中值得參考的功能，作為 Highlight Signal 後續規劃「如何加入現有功能」的產品備忘。

本文件不以複製 UI 外觀為目標，而是萃取可轉化為 Highlight Signal 的產品能力：

- 將成效數據轉成可行動建議
- 將圖表作為 Evidence，而不是讓 Dashboard 成為主角
- 將分析結果接到人為審核、任務建立、報表保存與後續執行

---

# Executive Summary

Mentor 的核心價值不是單純報表，而是把商品、客戶、媒體三種成效資料包成營運者可以理解與執行的工作台。

對 Highlight Signal 最有價值的借鑑方向是：

1. 用 AI Recommendation 作為第一層輸出
2. 用 KPI、趨勢、熱力圖、分群表作為 Evidence
3. 把每個分析模組都導向明確行動
4. 保留人工審核與決策流程，符合 Decision First Experience

---

# Observed Product Structure

Mentor 的成效報表分成三大區：

| Area | Main Purpose | Useful Pattern |
| --- | --- | --- |
| 商品成效 | 看商品表現、品類週期、搭售機會與銷售建議 | 商品分類建議、銷售週期熱力圖、購物籃分析 |
| 客戶成效 | 看會員收入、留存、分群與可投放策略 | Cohort 留存、會員榜、分群策略說明 |
| 媒體成效 | 看 GA 與廣告投放成效、素材與關鍵字表現 | 事件註記、素材列表、SOV、報表 builder |

每個區域都有一致的操作模式：

- 全域日期區間與同比比較
- 篩選列
- KPI 指標卡
- 趨勢圖與數據表切換
- 匯出功能
- 指標與維度切換
- 分析洞察或建議分頁

---

# Feature Candidates

## 1. AI 銷售建議卡

Mentor 將商品分成不同營運類型，例如：

- 明星商品
- 潛力商品
- 走量商品
- 滯銷 / 長尾商品
- 季節性商品
- 搭售建議
- 規格建議
- 商品生命週期

每張卡包含：

- 分類標籤
- 代表商品
- 建議動作
- 原因說明
- AI 建議標記

### Highlight Signal 導入想法

可以轉成 `Signal Recommendation Card`：

| Mentor Pattern | Highlight Signal Version |
| --- | --- |
| 明星商品 | 高價值頁面 / 高轉換活動 / 高意圖關鍵字 |
| 潛力商品 | 增長中但尚未放大的頁面、活動、關鍵字 |
| 走量商品 | 帶來大量流量或曝光但轉換偏弱的項目 |
| 滯銷商品 | 長期低效頁面、廣告、素材或關鍵字 |
| 季節性商品 | 週期性搜尋需求、檔期流量、季節活動 |
| 搭售建議 | 頁面組合、內容群集、廣告受眾組合 |

### Suggested First Implementation

在 Dashboard 或 GA Insights 中加入「AI 建議卡」區塊：

- Title: 這週最值得處理的訊號
- Recommendation: 建議做什麼
- Evidence: 3 個支持數據
- Business Impact: 預估影響
- Human Review: 接受 / 暫緩 / 拒絕
- Action: 建立任務

---

## 2. 銷售週期熱力圖

Mentor 用月份作為橫軸，品類作為縱軸，用顏色強弱表示銷售數量或成效。

這個模式的價值是快速回答：

- 哪個類別在哪個月份最強
- 哪些商品有季節性
- 哪些時段應該提前備貨、投放或安排內容

### Highlight Signal 導入想法

可轉成多種 Evidence Heatmap：

| Heatmap | Rows | Columns | Value |
| --- | --- | --- | --- |
| SEO 週期熱力圖 | 關鍵字群 / 頁面群 | 月份 | Clicks / Impressions / Position |
| GA 流量熱力圖 | Landing page / Channel | 週 / 月 | Sessions / Conversions |
| 廣告活動熱力圖 | Campaign / Ad group | 週 / 月 | ROAS / CPA / Spend |
| Signal 熱力圖 | Signal category | 時間 | Severity / Impact |

### Suggested First Implementation

優先做 `Page x Week` 或 `Channel x Week` 的 GA 熱力圖，因為現有系統已有 GA 模組，資料取得成本較低。

---

## 3. 購物籃 / 搭售分析

Mentor 顯示 Top 商品組合，包含：

- 商品 A + 商品 B
- 連帶率
- 客單價
- 排名
- 建議搭售組合

### Highlight Signal 導入想法

如果短期沒有電商訂單資料，可先轉成「共同出現 / 路徑組合」：

| Mentor | Highlight Signal |
| --- | --- |
| 商品 A + 商品 B | Landing page A + Conversion page B |
| 搭售組合 | Content cluster / Funnel path |
| 連帶率 | Same-session transition rate |
| 客單價 | Conversion value / Lead quality |

### Suggested First Implementation

先做 GA Funnel / Page Path Insight：

- 哪些 landing pages 常導向同一個 conversion page
- 哪些 page pairs 具有高轉換貢獻
- 哪些內容應該互相內鏈
- 哪些廣告入口頁適合搭配特定 CTA

---

## 4. 客戶 Cohort 留存熱力圖

Mentor 用新客月份作為 cohort，追蹤後續月份留存率與 LTV。

這個功能的價值是回答：

- 哪批新客品質較好
- 哪個月份或活動帶來長期客戶
- 新客是否在第二、第三個月快速流失

### Highlight Signal 導入想法

可延伸為「流量 cohort」或「lead cohort」：

| Cohort Type | Cohort By | Retention / Value Metric |
| --- | --- | --- |
| Traffic cohort | First visit month | Return sessions / conversions |
| Lead cohort | First lead month | Qualified leads / repeat actions |
| Campaign cohort | First campaign touch | Later conversion value |
| Workspace cohort | Account created month | Active usage / report creation |

### Suggested First Implementation

中期再做。這需要比較完整的使用者、事件或 CRM 資料，不適合第一波。

---

## 5. 客戶分群對應廣告策略

Mentor 將客戶分群與投放策略直接對應，例如：

- 頂級客戶
- 忠誠客戶
- 潛在忠誠客戶
- 最近新客
- 有希望的客戶
- 需要注意的客戶
- 即將沉睡的客戶
- 有風險的客戶
- 不能流失的客戶
- 冬眠客戶
- 流失客戶

每個分群都有：

- 特徵
- 建議廣告策略
- 建議使用的指標
- 是否應該排除或再行銷

### Highlight Signal 導入想法

這可以變成 `Audience Recommendation`：

| Segment | Signal Meaning | Possible Action |
| --- | --- | --- |
| 高價值訪客 | 多次回訪、高互動、高轉換 | Remarketing / high intent campaign |
| 潛在轉換訪客 | 有互動但尚未轉換 | Content nurture / offer |
| 低品質流量 | 高跳出、低停留、無轉換 | Exclude / lower bid / landing page review |
| 流失受眾 | 曾轉換或高互動但近期沉默 | Win-back campaign |

### Suggested First Implementation

先以 GA 行為資料做簡化分群，不急著接完整 CRM：

- High intent
- New visitor
- Returning visitor
- Low engagement
- Converted
- At risk

---

## 6. 事件註記趨勢圖

Mentor 在趨勢圖上標記事件，例如活動、素材更新、預算調整或檔期。

這個功能非常適合 Highlight Signal，因為成效波動必須有 context。

### Highlight Signal 導入想法

建立 `Event Annotation` 能力：

- Campaign launch
- Budget change
- Landing page update
- SEO content update
- Tracking issue
- External event
- Manual note

### Suggested First Implementation

先在 GA Trend 或 Dashboard 趨勢圖加入手動事件註記：

- 日期
- 事件類型
- 標題
- 說明
- 影響範圍

後續再由 AI 自動偵測異常並建議建立事件。

---

## 7. 自訂報表 Builder

Mentor 的自訂報表可選：

- 時間粒度
- 維度
- 指標
- 即時預覽
- 儲存報表

### Highlight Signal 導入想法

可以作為進階功能，但不應取代 Decision First 首屏。

適合放在：

- GA Report
- Ads Report
- Workspace Saved Views
- Recommendation Evidence Drilldown

### Suggested First Implementation

先不做完整 builder。第一步可以做「從 Recommendation 儲存 Evidence View」：

- 使用者看到一張 AI 建議卡
- 展開 Evidence
- 按下「儲存此視圖」
- 系統保存當下的維度、指標、日期與篩選

---

# Fit With Current Highlight Signal

Highlight Signal 目前的產品方向是：

- Decision First
- Human-in-the-loop
- AI Recommendation
- Evidence-driven
- Workspace-centric

Mentor 的功能可被吸收成以下層級：

```text
Data
  -> Evidence
  -> Signal
  -> Recommendation
  -> Human Review
  -> Action / Saved Report
```

因此導入時應避免把 Mentor 的 dashboard-first 結構完整照搬。應該保留 Mentor 的分析元件，但把它們放在 Highlight Signal 的 decision-first flow 裡。

---

# Recommended Roadmap

## Phase 1: Low Data Dependency

適合先做，因為可接現有 GA / SEO / SI 資料。

1. AI Recommendation Cards
2. Event Annotation on Trend Chart
3. Evidence Heatmap
4. Saved Evidence View

## Phase 2: Medium Data Dependency

需要較完整事件、頁面路徑或行為資料。

1. Page Path / Funnel Pair Insight
2. Audience Behavior Segments
3. Recommendation-to-Task workflow
4. Recommendation Explanation Drawer

## Phase 3: High Data Dependency

需要 CRM、訂單、LTV 或廣告平台資料整合。

1. Cohort Retention
2. LTV by Acquisition Source
3. Basket / Bundle Analysis
4. Full Custom Report Builder
5. Audience export / suppression list

---

# Prioritized Backlog

| Priority | Feature | Why | Suggested Location |
| --- | --- | --- | --- |
| P0 | AI Recommendation Cards | 最符合 Highlight Signal 核心定位 | Dashboard / GA Insights |
| P0 | Event Annotation | 讓趨勢圖有解釋能力 | GA Trend / Dashboard |
| P1 | Evidence Heatmap | 快速找出週期性與異常 | GA / SEO / SI |
| P1 | Saved Evidence View | 讓分析結果可保存 | Report / Recommendation |
| P2 | Audience Segments | 從分析走向投放策略 | GA / Ads |
| P2 | Funnel Pair Insight | 替代購物籃分析的第一步 | GA Funnel / Pages |
| P3 | Cohort Retention | 高價值但資料需求較高 | CRM / GA |
| P3 | Custom Report Builder | 進階功能，非首要 | Report |

---

# Product Principles For Adoption

導入 Mentor 功能時，建議遵守以下原則：

1. 不直接複製 dashboard-first layout
2. 每個圖表都要能回答一個決策問題
3. 每個 AI 建議都必須有 Evidence
4. 每個 Action 前都需要 Human Review
5. 先做能用現有資料完成的功能
6. 先做可解釋的建議，再做複雜自動化
7. 報表是保存與追蹤用，不是產品主體

---

# Open Questions

後續規劃前需要確認：

1. 第一波要放在哪個入口：Dashboard、GA Insights、還是新增 Signal Recommendation？
2. 現有 GA 資料是否已足夠支援 page path、returning visitor、conversion value？
3. 是否已有事件註記資料表，或需要新增 annotation model？
4. Task creation 現在是否已有資料模型，還是先用 review decision 記錄？
5. 是否要把 SEO / GA / SI 的建議統一成同一種 Recommendation schema？

---

# Suggested Next Step

下一步可以先做一份「Phase 1 功能規格」：

1. AI Recommendation Card UI
2. Event Annotation data model
3. Evidence Heatmap component
4. Saved Evidence View API

完成後再對照現有程式碼，決定要放在既有頁面還是新增一個 recommendation route。
