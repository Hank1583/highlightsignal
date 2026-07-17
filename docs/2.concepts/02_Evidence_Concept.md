# 02 Evidence Concept

Version: v1.0

---

# Purpose

Evidence 是 Highlight Signal 用來支撐 Signal、Recommendation 與 Decision 的證據單位。

如果 Signal 是具有決策價值的訊號，那麼 Evidence 就是讓這個訊號可信、可驗證、可追蹤的依據。

Highlight Signal 不只告訴使用者「發生了什麼」，也必須說清楚「為什麼我們知道這件事」、「根據什麼資料判斷」以及「這個判斷有多可靠」。

Evidence 的存在目的，是讓 AI 的分析不只是看起來合理，而是能夠被檢查、被追溯、被修正。

---

# Definition

Evidence 是一個可用來支持或反駁 Signal 的資料、觀察、紀錄或推論依據。

Evidence 不等於原始資料。

Raw Data 是尚未處理的資料。

Evidence 是被選出來、整理過、能夠支撐某個判斷的資料片段。

Signal 代表「值得注意的事情」。

Evidence 代表「為什麼這件事值得相信」。

因此：

Data → Evidence → Signal → Recommendation → Decision

---

# Evidence Philosophy

Highlight Signal 相信：

沒有 Evidence 的 Signal，只是猜測。

沒有 Evidence 的 Recommendation，只是建議文字。

沒有 Evidence 的 Decision，無法被信任。

AI 可以推論，但每一個重要推論都應該盡可能回到可檢查的 Evidence。

Evidence 是 Highlight Signal 建立信任的基礎。

---

# Evidence Role

Evidence 在系統中扮演三個角色。

第一，支撐 Signal。

當系統偵測到一個異常、機會或風險時，Evidence 用來證明這個 Signal 不是憑空產生。

第二，提升 Confidence。

同一個 Signal 可能有不同程度的可信度。Evidence 越完整、越一致、越近期，Signal 的 Confidence 越高。

第三，協助 Decision Review。

當使用者回頭檢查某個建議或決策時，可以透過 Evidence 理解當時系統為什麼這樣判斷。

---

# Evidence Types

Evidence 可以有不同型態。

Metric Evidence

來自數據指標，例如流量、曝光、點擊率、轉換率、排名、成本、錯誤率。

Log Evidence

來自系統紀錄，例如 API log、scan log、security event、user activity。

Content Evidence

來自文字或內容，例如網頁內容、SEO metadata、AI 摘要、搜尋結果描述。

Comparison Evidence

來自前後比較，例如本週 vs 上週、本月 vs 上月、競品 vs 自身。

Trend Evidence

來自時間序列變化，例如持續上升、突然下降、波動加劇、長期衰退。

External Evidence

來自外部資料，例如 Google Search Console、Google Analytics、Ads、社群平台、雲端服務、第三方掃描器。

AI Evidence

來自 AI 的觀察、分類、歸納或異常判斷，但必須盡可能連回可檢查資料。

---

# Evidence Structure

每一個 Evidence 都應包含完整描述。

- ID
- Title
- Description
- Source
- Source Type
- Timestamp
- Data Range
- Raw Reference
- Extracted Value
- Related Signal
- Reliability
- Freshness
- Confidence Contribution
- Notes

Evidence 不一定都需要很長。

有時候一個數字、一段 log、一個截圖、一個排名變化，就可以成為 Evidence。

重點是它必須能夠回答：

這個判斷是根據什麼？

---

# Evidence Quality

不是所有 Evidence 都具有相同價值。

一個高品質 Evidence 應具備以下特性：

- 可追溯（Traceable）
- 可驗證（Verifiable）
- 具時間性（Time-aware）
- 具來源資訊（Source-aware）
- 與 Signal 有明確關係（Relevant）
- 可被重新檢查（Reviewable）

低品質 Evidence 可能包括：

- 來源不明
- 時間不明
- 與 Signal 關聯薄弱
- 只是一段 AI 推測
- 無法被重新驗證

Highlight Signal 應避免讓低品質 Evidence 支撐高風險決策。

---

# Evidence Relationship

Evidence 與 Signal 是多對多關係。

一個 Signal 可以由多個 Evidence 支撐。

一個 Evidence 也可能同時支撐多個 Signal。

例如：

同一段網站流量下降資料，可能同時支撐：

- SEO Visibility Drop Signal
- Conversion Risk Signal
- Landing Page Issue Signal

因此 Evidence 不應只是附屬在單一報告底下，而應該成為可以被引用、關聯與重用的知識物件。

---

# Evidence Weight

不同 Evidence 對 Signal 的影響程度不同。

Evidence Weight 會受到以下因素影響：

- Source Reliability
- Data Freshness
- Data Completeness
- Historical Consistency
- Business Relevance
- Conflict Level
- User Context

例如，來自 Google Search Console 的近期點擊下降，對 SEO Signal 的權重可能高於一段模糊的 AI 推測。

Evidence Weight 不只是資料可信度，也包含它對當前決策的影響力。

---

# Evidence Conflict

不同 Evidence 之間可能互相衝突。

例如：

Google Analytics 顯示流量上升。

Google Search Console 顯示曝光下降。

Ads 成本上升但轉換沒有下降。

Security scan 顯示風險，但實際服務沒有異常。

Highlight Signal 不應忽略衝突，而應標記 Evidence Conflict。

衝突本身也可能形成新的 Signal。

例如：

Data Inconsistency Signal

Tracking Issue Signal

Attribution Conflict Signal

AI 的工作不是強行得出單一答案，而是辨識哪些 Evidence 支持、哪些 Evidence 反駁、哪些 Evidence 需要進一步確認。

---

# AI Perspective

AI 不應只產生結論。

AI 應該先找出 Evidence，再形成 Signal，最後才產生 Recommendation。

AI 的推理流程應該是：

Collect Evidence

↓

Evaluate Evidence Quality

↓

Group Related Evidence

↓

Identify Signal

↓

Estimate Confidence

↓

Generate Recommendation

如果 AI 無法提供 Evidence，就應該降低 Confidence，或明確標示為假設。

---

# Evidence Memory

Evidence 不只是當下分析使用。

它也應該被保存為 Decision Memory 的一部分。

當未來發生類似事件時，系統可以回顧過去 Evidence：

- 當時有哪些資料？
- AI 如何判斷？
- 使用者採取什麼行動？
- 結果是否正確？

這讓 Highlight Signal 能夠從歷史決策中學習，而不是每次都從零開始。

---

# Future Evolution

未來 Evidence 將逐步演化為更完整的證據系統。

包括：

- Evidence Graph
- Evidence Timeline
- Evidence Score
- Evidence Conflict Detection
- Evidence Chain
- Evidence Memory
- Evidence Review
- Evidence Audit Trail

Evidence 將成為 Highlight Signal 可解釋 AI 與可信任決策的核心基礎。

---

# Summary

Evidence 是 Highlight Signal 的信任基礎。

Signal 告訴使用者什麼值得注意。

Evidence 告訴使用者為什麼值得相信。

沒有 Evidence，AI 只能提供看似合理的回答。

有了 Evidence，Highlight Signal 才能提供可驗證、可追蹤、可解釋、可回顧的決策支援。

Evidence 是 Signal 的根基，也是 Recommendation 與 Decision 能被信任的原因。

