# Signal Intelligence

Version: v1.0
Last Update: 2026-07

---

# Purpose

> V1 Alignment Patch: Signal answers what happened. Evidence establishes the factual basis; Explanation and Business Impact interpret it; Recommendation proposes what to do. Signal itself is not a Decision.

Signal Intelligence 是 Highlight Signal 的核心分析引擎。

Highlight Signal 不直接分析：

- Google Analytics
- Search Console
- Facebook
- Instagram
- Google Ads
- RiskRadar

Highlight Signal 分析的是：

> Business Signals（商業訊號）

所有資料來源，

都會先轉換成 Signal，

再交由 AI 進行分析。

因此，

Signal 才是 Highlight Signal 的共同語言。

---

# Philosophy

不同平台，

有不同的資料格式。

不同名稱。

不同 API。

不同限制。

但是：

企業真正關心的，

只有：

今天有哪些重要訊號？

Signal Intelligence

就是把所有平台，

翻譯成同一套商業語言。

---

# Signal Flow

所有資料，

都遵循同一流程。

Data Sources

↓

Normalization

↓

Signal Engine

↓

Correlation Engine

↓

AI Insight

↓

Recommendation

↓

Action

Highlight Signal 的 AI，

永遠分析 Signal。

而不是直接分析平台。

---

# Signal Domains

Highlight Signal 將所有訊號，

分成六個領域。

---

# Growth Signals

代表：

企業是否正在成長。

主要包含：

- Website Traffic
- Organic Traffic
- Conversion
- Revenue
- Lead
- Returning User

主要問題：

- 生意變好了嗎？
- 哪裡開始成長？
- 哪裡開始下降？

---

# Search Signals

代表：

搜尋能見度。

資料來源：

- Search Console
- SEO
- GEO
- AEO

主要訊號：

- Impression
- Click
- CTR
- Ranking
- AI Visibility

主要問題：

Google 找得到我嗎？

AI 找得到我嗎？

---

# Social Signals

代表：

社群經營成果。

資料來源：

- Facebook
- Instagram
- Threads
- YouTube（Future）
- TikTok（Future）

主要訊號：

- Reach
- View
- Engagement
- Share
- Save
- Followers

主要問題：

哪些內容真正有效？

---

# Advertising Signals

代表：

廣告成效。

資料來源：

- Google Ads
- Meta Ads
- LINE Ads（Future）

主要訊號：

- Impression
- Click
- CPC
- CPA
- ROAS

主要問題：

廣告是否真正帶來成果？

---

# Security Signals

代表：

網站健康。

資料來源：

- RiskRadar
- SSL
- Website Scan
- Secret Scan
- Docker Scan
- CSPM

主要訊號：

- Security Score
- Critical Risk
- SSL
- Secret Exposure

主要問題：

網站是否安全？

有哪些風險？

---

# System Signals

代表：

平台運作狀態。

資料來源：

Highlight Signal Platform

主要訊號：

- Sync Failed
- OAuth Expired
- API Error
- Data Delay
- Quota Limit

主要問題：

目前資料是否可信？

有哪些來源需要重新授權？

---

# Signal Object

每一個 Signal，

都應包含：

Signal ID

Signal Domain

Signal Type

Source

Business Layer

Severity

Confidence

Timestamp

Description

Recommendation

Data References

所有 AI 分析，

都必須建立於 Signal。

---

# Signal Severity

Highlight Signal 定義四種重要程度。

Critical

立即處理。

例如：

- 網站無法開啟
- SSL 過期
- API 全部失敗

High

24 小時內建議處理。

例如：

- Organic Traffic 大幅下降
- 廣告異常
- Security Risk

Medium

建議觀察。

例如：

CTR下降

排名下降

曝光增加

Low

一般資訊。

例如：

新貼文表現良好

自然流量增加

Follower增加

---

# Signal Confidence

AI 不應過度自信。

每個 Signal，

都應標示：

High

資料充分。

Medium

資料有限。

Low

僅供參考。

Unknown

資料不足。

例如：

沒有 UTM。

沒有 Conversion。

沒有 CRM。

則不能推論因果。

---

# Correlation Engine

Highlight Signal 最大特色，

不是分析平台。

而是分析：

Signal 與 Signal。

例如：

Facebook Reach

↓

Website Traffic

↓

Lead

↓

Conversion

AI 應回答：

是否存在商業關聯？

而不是：

Facebook 增加多少。

---

# Recommendation Engine

Signal

↓

Priority

↓

Recommendation

↓

Action

AI 的任務，

不是提醒。

而是排序。

每一天，

預設最多：

三個重要 Signal。

三個建議。

避免資訊過載。

---

# Evidence

每一個 Recommendation，

都應能回溯：

哪些 Signal

↓

哪些 Data Sources

↓

哪些 Business Layer

↓

得到這個結論。

所有 AI 建議，

都必須可以解釋。

---

# Future Signals

Signal Intelligence

應可持續增加新的 Signal Domain。

例如：

CRM Signals

POS Signals

Customer Service Signals

Email Signals

Finance Signals

Inventory Signals

Employee Signals

Highlight Signal 不需要修改架構。

只需要增加新的 Signal。

---

# Design Rules

新增任何功能，

都必須回答：

它產生哪些 Signal？

屬於哪一個 Signal Domain？

是否能與其他 Signal 建立關聯？

如果不能，

則代表：

它不是 Highlight Signal 的核心能力。

---

# Summary

Highlight Signal 的核心不是 Dashboard。

不是 AI。

不是資料來源。

而是：

Signal Intelligence。

Data

↓

Signal

↓

Insight

↓

Decision

↓

Action

Highlight Signal

讓企業每天知道：

今天真正重要的是什麼。
