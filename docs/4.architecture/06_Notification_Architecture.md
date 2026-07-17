# Notification Framework

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

> V1 Alignment Patch: Notification subscribes to internal Domain Events and is not a fixed final stage of the business decision flow. Notification delivery state remains a normal workspace-scoped REST resource.

Notification Framework 定義 Highlight AI 產品中的通知架構。

Notification 的目的不是把所有數據變化推送給使用者。

Notification 的目的是：

在正確時間，透過正確渠道，提醒使用者真正重要的 Decision 與 Action。

Highlight AI 的通知不是 Alert System。

Highlight AI 的通知是 Decision Delivery System。

---

# Philosophy

傳統通知：

Metric Changed

↓

Alert

↓

User Checks Dashboard

Highlight AI 通知：

Signal

↓

Decision

↓

Recommendation

↓

Notification

↓

Action

Notification 不應讓使用者重新分析資料。

Notification 應直接告訴使用者：

今天最重要的是什麼？

為什麼重要？

下一步該做什麼？

---

# Core Idea

Notification 是 AI Decision 的傳遞層。

Workspace Home 是使用者主動查看 Decision 的地方。

Notification 是系統主動把 Decision 送到使用者手上的方式。

Notification 必須遵守 Decision First 原則。

通知內容應以 Decision、Priority、Recommendation 為中心，而不是以 Raw Metrics 為中心。

---

# Notification Is Not Data Push

Notification 不應推送所有數字變化。

錯誤：

網站流量 -3%。

粉絲 +5。

CTR +0.2%。

正確：

今天有 3 個重要訊號需要注意。

1. 首頁 SEO 流量連續下降，建議優先檢查 Title 與 CTR。

2. SSL 7 天後到期，建議今天處理。

3. Threads 互動明顯上升，建議延伸該主題內容。

---

# Notification Sources

Notification 不直接來自 Raw Data。

Notification 應來自：

- Signal
- Decision
- Recommendation
- Evidence
- Action Status
- Report

一般情況下，Raw Data 不應直接產生 Notification。

Raw Data 應先經過 Signal Intelligence 與 AI Decision Engine。

---

# Notification Flow

標準流程：

Raw Data

↓

Signal Intelligence

↓

AI Decision Engine

↓

AI Recommendation Engine

↓

Evidence Selection

↓

Notification Engine

↓

User Channel

↓

Workspace Detail

Notification 應提供入口，引導使用者回到 Workspace 查看完整內容。

---

# Notification Channels

第一階段支援：

- LINE
- Email
- Workspace Inbox

未來可支援：

- Slack
- Microsoft Teams
- Push Notification
- SMS
- Webhook
- API Callback

不同 Channel 承載不同層級的資訊。

---

# Channel Strategy

不同通知渠道用途不同。

LINE：

即時、簡短、高優先級。

Email：

摘要、報告、週期性內容。

Workspace Inbox：

完整紀錄、可追蹤、可管理。

Slack / Teams：

團隊協作、任務分派、內部營運提醒。

Webhook / API：

系統整合與自動化。

---

# Notification Types

Notification 可分為：

1. Daily Brief
2. Critical Alert
3. Weekly Summary
4. Monthly Report
5. Recommendation Reminder
6. Action Follow-up
7. System Notice
8. Billing Notice
9. Data Source Notice
10. Security Notice

不同類型應有不同頻率、格式與優先級。

---

# Daily Brief

Daily Brief 是 Highlight Signal 的核心通知。

Daily Brief 回答：

今天最重要的是什麼？

今天應該先做什麼？

今天是否有 Critical Issue？

建議格式：

Today's Signals

今天有 3 個重要訊號。

1. SEO 流量下降，建議檢查首頁 CTR。

2. SSL 即將到期，建議今天處理。

3. Threads 互動上升，建議延伸內容。

查看詳情：Workspace Link

---

# Critical Alert

Critical Alert 僅用於真正需要立即處理的事件。

例如：

- SSL 即將到期
- 網站無法存取
- Critical Security Risk
- 廣告成本異常暴增
- 重要轉換事件中斷

Critical Alert 必須避免濫用。

若所有事情都是 Critical，使用者會停止信任通知。

---

# Weekly Summary

Weekly Summary 用於整理一週變化。

內容應包含：

- Top Signals
- Completed Actions
- Recommendation Progress
- Business Trend
- Next Week Focus

Weekly Summary 不應只是報表。

Weekly Summary 應回答：

這週發生什麼重要事情？

哪些行動有效？

下週應該注意什麼？

---

# Monthly Report

Monthly Report 用於較正式的營運回顧。

內容可包含：

- Business Pulse
- Key Decisions
- Module Summary
- Traffic / Search / Social / Ads / Security Overview
- Recommendation Completion
- Result Evaluation
- Next Month Focus

Monthly Report 可支援 PDF Export。

---

# Recommendation Reminder

Recommendation Reminder 用於提醒尚未完成的重要 Action。

例如：

你有 2 個 High Priority Recommendation 尚未完成：

1. 更新首頁 Meta Title

2. 檢查 SSL 到期設定

Recommendation Reminder 不應每天重複轟炸。

應根據 Priority、Deadline、User Behavior 調整頻率。

---

# Action Follow-up

Action Follow-up 用於追蹤使用者完成 Action 後的結果。

例如：

你上週完成了首頁 Meta Title 更新。

目前首頁 CTR 提升 3.8%。

AI 判斷：此 Recommendation 有效。

這是 Notification Framework 中非常重要的 Feedback Loop。

---

# Notification Priority

Notification 應有 Priority。

建議：

Critical

High

Medium

Low

Info

Priority 決定：

- 是否即時推送
- 使用哪個 Channel
- 是否重複提醒
- 是否需要使用者確認
- 是否進入 Daily Brief

---

# Notification Severity vs Priority

Severity 不等於 Priority。

Severity 描述事件嚴重程度。

Priority 描述此通知是否應該打擾使用者。

例如：

SEO 小幅下降，Severity Medium。

但如果企業本季目標是 SEO，Priority 可提高。

相反地，某個 Social Metric 大幅波動，Severity High。

但如果與 Business Goal 無關，Priority 可降低。

---

# Notification Frequency

通知頻率應避免過高。

建議原則：

- Daily Brief：每日一次
- Critical Alert：即時
- Weekly Summary：每週一次
- Monthly Report：每月一次
- Recommendation Reminder：依 Priority 與 Deadline
- Data Source Notice：必要時

系統應避免重複發送相同內容。

---

# Alert Fatigue

Alert Fatigue 是 Notification Framework 必須避免的核心問題。

AI 不應每天提醒同一個未解決問題。

例如：

SEO 連續下降 7 天。

錯誤：每天提醒 SEO 下降。

正確：

第一天通知。

後續改為 Watching 狀態。

若情況惡化或有新 Evidence，再重新通知。

---

# Notification Deduplication

系統應支援 Deduplication。

相同或高度相似的 Notification 不應重複發送。

Deduplication 可依據：

- Signal ID
- Decision ID
- Recommendation ID
- Module
- Time Window
- User Response
- Notification Status

---

# Notification State

Notification 應有狀態。

例如：

Created

Queued

Sent

Delivered

Opened

Clicked

Dismissed

Converted To Action

Archived

Notification State 可用於評估通知是否有效。

---

# Notification Personalization

Notification 應根據使用者角色與偏好調整。

例如：

Owner：

收到 Business Decision 與 High Priority Recommendation。

Marketing Manager：

收到 Search、Social、Ads 相關通知。

IT / Security：

收到 Security 與 System Alert。

Viewer：

只收到 Weekly / Monthly Summary。

---

# Workspace-Based Notifications

Notification 應以 Workspace 為核心。

一個 Workspace 可有多個使用者。

不同使用者收到不同通知。

但 Notification 的根源應屬於 Workspace。

例如：

Workspace A 的 SEO Alert 不應發送給 Workspace B 的成員。

Workspace 是 Notification 的邊界。

---

# Module-Based Notifications

Module 可影響 Notification。

例如：

Website Module：

- Traffic Drop
- Conversion Drop
- Website Down

Search Module：

- Ranking Drop
- CTR Drop
- AI Visibility Opportunity

Social Module：

- Engagement Spike
- Reach Drop

Advertising Module：

- CPA Increase
- Budget Anomaly

Security Module：

- SSL Expiring
- Critical Risk

不同 Module 可有不同通知規則。

---

# Notification Content Structure

每則通知應包含：

- Title
- Summary
- Priority
- Related Signal
- Decision
- Recommendation
- Evidence Preview
- CTA
- Workspace Link

短通知可省略部分內容。

但重要通知必須能連回完整 Workspace Detail。

---

# LINE Notification Format

LINE 通知應簡短。

建議格式：

Today's Signals

今天有 3 個重要訊號：

1. SEO 流量下降，需要檢查首頁 CTR。

2. SSL 7 天後到期，建議今天處理。

3. Threads 互動上升，可延伸內容。

查看詳情：Link

LINE 不適合放大量 Evidence。

LINE 應作為入口。

---

# Email Notification Format

Email 可承載較完整內容。

建議格式：

Subject：Today’s Signals - 3 Important Updates

內容：

- AI Summary
- Top Signals
- Recommendations
- Evidence Preview
- Action List
- Workspace Link

Email 可用於 Daily Brief、Weekly Summary、Monthly Report。

---

# Workspace Inbox

Workspace Inbox 是所有通知的完整紀錄。

Workspace Inbox 可包含：

- Notification History
- Filter
- Status
- Related Signal
- Related Recommendation
- Action Status
- Read / Unread

Workspace Inbox 可作為通知中心。

---

# Notification And Evidence

Notification 應提供 Evidence Preview。

例如：

SEO 流量下降。

Evidence Preview：

- Organic Sessions -18%
- CTR -12%
- Top Landing Page -25%

使用者點擊後進入 Workspace Detail 查看完整 Evidence。

---

# Notification And Action

Notification 最終應導向 Action。

每則重要通知應有 CTA。

例如：

- View Details
- Review Recommendation
- Mark As Done
- Assign To Team
- Snooze
- Dismiss

未來 Execution Engine 可支援：

- Approve Action
- Execute Action

---

# Notification And Learning

系統應學習通知效果。

例如：

- 使用者是否開啟通知？
- 是否點擊 Workspace？
- 是否完成 Recommendation？
- 哪些通知被忽略？
- 哪些通知導致 Action？

這些資料可回饋 AI Decision Engine 與 Recommendation Engine。

---

# Notification Rules

Notification Rules 定義何時通知。

規則可包含：

- Priority Threshold
- Severity Threshold
- Business Goal
- User Role
- Channel Preference
- Quiet Hours
- Frequency Limit
- Deduplication Window

Notification 不應只是 if metric changed then alert。

應該是 if decision matters then notify。

---

# Quiet Hours

系統應支援 Quiet Hours。

例如：

晚上 10 點至早上 8 點不發送非 Critical 通知。

Critical Alert 可突破 Quiet Hours。

但必須謹慎。

---

# Notification Lifecycle

Notification 生命週期：

Created

↓

Evaluated

↓

Queued

↓

Sent

↓

Delivered

↓

Opened

↓

Actioned / Dismissed

↓

Archived

每個狀態都可用於分析通知品質。

---

# Cross Product Notifications

同一套 Notification Framework 可套用到不同產品。

Highlight Signal：

- Business Signal Notification
- Daily Brief
- Weekly Growth Summary

RiskRadar：

- Security Alert
- Critical Finding
- Weekly Security Report

BrandHue：

- Brand Consistency Alert
- Visual Opportunity
- Palette Recommendation

所有產品都遵守：

Signal

↓

Decision

↓

Recommendation

↓

Notification

---

# Engineering Principles

系統設計應支援：

- Notification Queue
- Notification Rules
- Channel Adapter
- Deduplication
- User Preference
- Workspace Scope
- Delivery Status
- Click Tracking
- Action Tracking
- Notification History

Notification Service 不應直接讀 Raw Data 判斷通知。

Notification Service 應接收 AI Decision 與 Recommendation 的結果。

---

# Product Principles

Notification 必須遵守：

- Decision First
- Action Oriented
- Low Noise
- High Trust
- Evidence Backed
- User Controlled
- Workspace Scoped

Notification 的目標不是提高發送量。

Notification 的目標是提高有效行動。

---

# Future

Notification Framework 未來可加入：

- Smart Notification Timing
- User Behavior Learning
- Team Assignment
- AI Generated Brief
- Auto Escalation
- Multi-channel Routing
- Notification A/B Testing
- Execution Approval

未來 AI 可判斷：

什麼事情需要 LINE？

什麼事情只需要 Email？

什麼事情只放 Workspace Inbox？

什麼事情不應通知？

---

# Summary

Notification 是 Highlight AI 的 Decision Delivery Layer。

通知不是為了推送更多資訊。

通知是為了讓使用者在正確時間看到最重要的 Decision 與 Action。

Highlight AI 通知流程：

Signal

↓

Decision

↓

Recommendation

↓

Evidence Preview

↓

Notification

↓

Action

最好的通知不是提醒所有事情。

最好的通知是讓使用者知道現在最值得做什麼。

---

# Related Documents

01 AI Core Framework
02 Signal Framework
03 Workspace Framework
04 Module Framework
05 Evidence Framework
07 Widget Framework（Future）
08 Data Flow Framework（Future）
09 Permission Framework（Future）
10 Domain Model（Future）

