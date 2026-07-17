# 12_Reporting_Architecture.md

Version: v1.0

---

# Purpose

Reporting Architecture 定義 Highlight Signal 如何將 AI 分析結果，
透過 Dashboard、Email、Report、Export 等方式，
轉換為使用者可以立即採取行動的決策資訊。

Reporting 並不是資料輸出。

而是整個 AI Decision Engine 的最後一層。

```
Signal
    ↓
Evidence
    ↓
Recommendation
    ↓
Human Review
    ↓
Reporting
```

---

# Design Philosophy

Highlight Signal 不追求產生最多的報表。

而是讓使用者在最短時間內知道：

- 發生什麼？
- 為什麼？
- 要做什麼？
- 做完之後有沒有改善？

所有 Report 都必須遵守：

Decision First

Evidence Second

Raw Data Last

---

# Architecture

```
                AI Core

                   │

              Signal Engine

                   │

            Evidence Engine

                   │

         Recommendation Engine

                   │

          Human Review Engine

                   │

         Reporting Architecture

        ┌────────┼────────┐

 Dashboard     Email      Export

        │         │          │

      Widget     PDF       CSV

                 Weekly

                 Monthly
```

Reporting 不負責分析。

Reporting 只負責：

將 AI Decision 轉換成適合不同情境的輸出。

---

# Reporting Types

Highlight Signal 定義四種 Report。

---

## 1. Dashboard

目的：

即時查看目前狀況。

更新頻率：

Realtime

適用：

- Daily Review
- 即時監控
- 工作管理

內容：

- Workspace Health
- Recommendation
- Evidence
- Trend
- Recent Actions

---

## 2. Weekly Report

目的：

每週回顧。

更新頻率：

Weekly

適用：

- 行銷主管
- 中小企業
- 團隊會議

內容：

- AI Executive Summary
- Website Overview
- Search Overview
- Trend
- Completed Actions
- Recommendations

---

## 3. Monthly Report

目的：

觀察長期趨勢。

更新頻率：

Monthly

內容：

- Monthly Summary
- KPI Comparison
- Growth Trend
- Major Improvements
- Long-term Recommendations

---

## 4. Executive Report

目的：

提供經營者快速掌握整體營運。

內容：

- Executive Summary
- Business Health
- Website
- Search
- AI Recommendations

Executive Report 為未來版本。

---

# Highlight Signal Weekly Report

第一版整合：

```
Website

+

Search

+

AI Recommendation
```

不包含：

AdFusion

AdFusion 保持獨立 Report。

未來可新增：

Executive Report

整合：

Highlight Signal

+

AdFusion

---

# Report Components

每份 Report 皆由固定模組組成。

```
Executive Summary

↓

Health Summary

↓

Trend

↓

Evidence

↓

Recommendations

↓

Completed Actions

↓

Appendix
```

---

## Executive Summary

AI 自動產生。

限制：

3~5 句。

內容：

- 本週最大的變化
- 最大風險
- 最大機會
- 一句建議

---

## Health Summary

以 Workspace Health 為核心。

例如：

SEO

92

Website

88

Search

90

Overall

90

---

## Trend

比較：

- 上週
- 上月
- 去年同期（未來）

主要回答：

是否改善？

---

## Evidence

所有 Recommendation

皆可展開 Evidence。

包含：

- GA4
- Search Console
- Website Scan
- AI Search

Evidence 永遠放在 Recommendation 後面。

---

## Recommendations

固定排序：

★★★★★

Critical

★★★★☆

Important

★★★☆☆

Suggestion

每項 Recommendation 必須包含：

- Why
- Evidence
- Estimated Impact
- Confidence

---

## Completed Actions

記錄：

本週完成事項。

例如：

✓ 修正 Sitemap

✓ 新增 FAQ

✓ 修正 Meta Description

方便回顧。

---

## Appendix

原始資料。

例如：

Top Pages

Top Keywords

Traffic Sources

放最後。

---

# Report Generation Flow

```
Data Source

↓

Signal Engine

↓

Evidence Engine

↓

Recommendation Engine

↓

AI Summary

↓

Report Builder

↓

Dashboard

↓

Email

↓

Export
```

所有輸出皆共用同一套資料。

不得維護兩份不同邏輯。

---

# Delivery Channels

目前支援：

Dashboard

Email

CSV

未來：

PDF

Excel

API

Webhook

Slack

LINE Notify

---

# Scheduling

支援：

Manual

Daily

Weekly

Monthly

未來：

Custom Schedule

---

# Export

所有 Report

共用 Export Engine。

格式：

CSV

PDF（Future）

Excel（Future）

Image（Future）

---

# AI Summary

AI Summary 為 Highlight Signal 最大特色。

每份 Report

必須先產生 Summary。

流程：

```
Signals

↓

Evidence

↓

Recommendation

↓

Summary

↓

Report
```

Summary 必須回答：

1.

本週發生什麼？

2.

最大的原因？

3.

最大的機會？

4.

最大的風險？

5.

建議下一步。

禁止：

僅列 KPI。

---

# Future

未來規劃：

Executive Report

Scheduled Report

Custom Report

White Label Report

Multi Workspace Report

Cross Product Report

Business Report

---

# Architecture Principles

所有 Reporting 必須遵守：

1.

Decision First

不是 KPI First。

---

2.

Evidence After Recommendation

不要讓使用者先閱讀大量圖表。

---

3.

One Data Source

Dashboard

Email

PDF

CSV

全部共用同一套資料。

---

4.

AI Summary Required

沒有 AI Summary

即不算完成的 Highlight Signal Report。

---

5.

Action Oriented

每份 Report

都必須提供下一步。

不能只是描述現況。

---

# Final Goal

Highlight Signal 希望建立：

```
Signal

↓

Evidence

↓

Recommendation

↓

Human Decision

↓

Reporting

↓

Business Improvement
```

Reporting 不是終點。

而是協助使用者持續改善網站、搜尋成效與 AI 可見性的決策工具。