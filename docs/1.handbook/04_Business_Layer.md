# Business Layer

Version: v1.0
Last Update: 2026-07

---

# Purpose

Business Layer 是 Highlight Signal 的核心商業模型。

所有資料來源、

AI 分析、

Signal、

Dashboard、

Recommendation，

都必須建立在同一套 Business Layer 之上。

Business Layer 不依賴任何平台。

Google、Meta、LINE、CRM、POS、ERP 都只是資料來源。

Business Layer 永遠保持一致。

---

# Philosophy

企業真正關心的，

不是：

Google Analytics

Facebook

Instagram

Google Ads

SEO

而是：

今天生意有沒有變好？

Business Layer 就是把所有技術資料，

轉換成企業能理解的商業流程。

---

# Business Funnel

Highlight Signal 將所有資料，

映射到六個商業階段。

Exposure

↓

Traffic

↓

Engagement

↓

Lead

↓

Conversion

↓

Retention

每一層，

都代表不同商業目標。

---

# Layer 1
## Exposure

代表：

有多少人知道你的品牌。

主要回答：

> 有多少人看見我？

常見來源：

- Google Search Impression
- AI Search Impression（Future）
- Facebook Reach
- Instagram Reach
- Threads View
- Google Ads Impression
- Meta Ads Impression

代表指標：

- Impression
- Reach
- View
- Visibility

AI 關注：

曝光是否增加？

哪個平台增加？

是否值得持續投入？

---

# Layer 2
## Traffic

代表：

多少人真正來到你的網站。

主要回答：

> 有多少人願意點進來？

資料來源：

- Google Analytics
- Cloudflare Analytics
- UTM
- Social Click
- Ads Click

代表指標：

- Users
- Sessions
- Landing Page
- Click
- CTR

AI 關注：

哪些渠道帶來流量？

自然流量是否下降？

社群是否成功導流？

---

# Layer 3
## Engagement

代表：

使用者是否真的開始互動。

主要回答：

> 他們有沒有興趣？

資料來源：

Website

Facebook

Instagram

Threads

YouTube（Future）

代表指標：

- Like
- Comment
- Share
- Save
- Scroll
- Time on Page
- Event

AI 關注：

哪些內容真正吸引人？

哪些頁面停留時間高？

哪些貼文值得延伸？

---

# Layer 4
## Lead

代表：

使用者開始留下商業機會。

主要回答：

> 有沒有產生詢問？

資料來源：

- Contact Form
- LINE
- Messenger
- Phone Click
- Email
- Booking

代表指標：

- Lead
- Inquiry
- Booking
- Contact

AI 關注：

哪些渠道真正帶來詢問？

哪個 Landing Page 最有效？

哪些來源品質最好？

---

# Layer 5
## Conversion

代表：

真正完成商業目標。

主要回答：

> 有沒有成交？

資料來源：

- GA Conversion
- Ecommerce
- CRM
- POS（Future）

代表指標：

- Purchase
- Order
- Revenue
- Conversion Rate

AI 關注：

哪個渠道最會成交？

廣告是否賺錢？

SEO 是否帶來成交？

---

# Layer 6
## Retention

代表：

客戶是否持續回來。

主要回答：

> 客戶有沒有留下來？

資料來源：

- CRM
- Membership
- Email
- GA Returning User
- Subscription

代表指標：

- Returning User
- Repeat Purchase
- Renewal
- LTV

AI 關注：

是否建立長期客戶？

哪些來源留存最好？

---

# Cross Platform Mapping

Highlight Signal 不分析單一平台。

而是分析商業流程。

例如：

| Business Layer | Google | Social | Ads | CRM |
|----------------|---------|---------|------|------|
| Exposure | Search Impression | Reach | Impression | - |
| Traffic | Session | Link Click | Click | - |
| Engagement | Event | Like / Comment | Landing | - |
| Lead | Form | Messenger | Lead Form | Lead |
| Conversion | Purchase | Conversion | Conversion | Deal |
| Retention | Returning User | Followers | - | Renewal |

資料來源可以增加。

Business Layer 永遠不變。

---

# Cross Platform Analysis

Highlight Signal 的核心價值，

不是分析平台。

而是分析平台之間的關聯。

例如：

Facebook Reach

↓

Website Traffic

↓

Lead

↓

Conversion

AI 應找出：

哪些平台真正影響商業成果。

---

# Business Questions

Highlight Signal 每個頁面，

都應回答至少一個商業問題。

例如：

Exposure

↓

最近有更多人知道我嗎？

Traffic

↓

客人從哪裡來？

Engagement

↓

哪些內容真正吸引人？

Lead

↓

哪些渠道帶來詢問？

Conversion

↓

哪些投入真正賺錢？

Retention

↓

哪些客戶願意再次回來？

如果不能回答商業問題，

則代表產品設計需要重新檢討。

---

# AI Responsibility

AI 的第一工作，

不是回答：

GA 增加多少。

而是回答：

Business Layer 哪一層出了問題。

例如：

Traffic ↓

但是

Conversion ↑

AI 不應直接判斷：

網站變差。

而應回答：

流量下降，

但成交率提升，

目前整體營運沒有惡化。

---

# Future Expansion

Business Layer 不限制資料來源。

未來可以增加：

- TikTok
- LINE OA
- YouTube
- Shopify
- POS
- ERP
- CRM
- Email Marketing
- Customer Service
- AI Search

新增平台，

只需要 Mapping 到既有 Business Layer。

不需要修改產品架構。

---

# Design Rules

所有新功能，

都必須回答：

這個功能屬於哪一層 Business Layer？

如果沒有答案，

則不應加入產品。

Business Layer 永遠優先於：

- API
- Database
- Dashboard
- Data Source

---

# Summary

Business Layer 是 Highlight Signal 最重要的抽象層。

它讓：

不同平台

↓

共同語言

↓

AI

↓

Business Insight

↓

Decision

↓

Action

Highlight Signal 不分析平台。

Highlight Signal 分析企業成長。