# Task Packet — V10-07 GA/SEO/AEO/GEO Adapter Alignment

Status: PLANNED
Milestone: V1.0 Decision Intelligence Core
Dependency: `V10-01`～`V10-06`、`V09-08`
Tracker: `docs/00_V07_TO_V12_PROGRESS_TRACKER.md`（第 6 節）
Authority: `docs/00_Technical_Specification_Alignment_v1.2.md`（Integration、Data Source、Connector、Module Boundaries）

---

# Objective

讓既有 GA、SEO、AEO、GEO 能力透過一致 Adapter/Service 邊界輸入 Signal 與 Evidence，同時保留 legacy response compatibility，避免每個模組自行建立第二套 domain flow。

# Mandatory context before starting

1. V09-03/04/08 的 ownership 決策與所有 legacy endpoints。
2. V10-01～06 的 Signal/Evidence/Recommendation contracts。
3. `GaIntegrationRepository/Service`、`lib/ga`、`lib/seo`、`lib/si` 與 PHP SI/SEO routes。

# Required work

1. 盤點四個來源的 observation、metric、scan result、identity 與 freshness contract。
2. 建立或收斂 Adapter interface，把 legacy payload 轉成穩定的 source observation/evidence DTO；不得讓 adapter 寫 Decision。
3. 至少完成 GA 與 SEO 兩條 vertical slice；AEO/GEO 若資料不足，必須提供 contract test 與明確 deferred gap。
4. 所有 Adapter 以真實 Workspace context 執行，移除 `memberId` fallback 作 tenant boundary。
5. Legacy routes/response 在相容期保留，並建立 deprecation/cleanup 條件。

# Out of scope

* 不一次重寫所有 legacy PHP。
* 不在 Adapter 內放 UI 或 Human Review logic。
* 不引入第二套 Signal/Evidence schema。

# Mandatory verification

* GA 與 SEO 各完成 Source → Adapter → Evidence/Signal → Dashboard trace。
* 同一輸入重跑維持 idempotent，錯誤來源不污染其他 Workspace。
* Legacy response contract tests 通過。
* AEO/GEO 未完成項有 owner、原因與後續 task，不得假裝完成。

# Required deliverables

1. Adapter contracts、implementations 與 mapping 文件。
2. GA/SEO vertical slice；AEO/GEO 實作或明確 gap。
3. Compatibility、idempotency、Workspace isolation 測試。
4. Tracker 與 task packet 更新。

# Acceptance criteria

- [ ] GA、SEO 兩條 vertical slice 通過。
- [ ] 四個來源共用正式 domain contracts。
- [ ] Legacy compatibility 與 tenant isolation 未退化。
- [ ] Adapter 不跨越 Human Review。

# Execution-chat prompt

```text
請執行 Highlight Signal Roadmap Task V10-07。
專案：D:\7.Highlight\1.Project\5.web\highlightsignal
主追蹤：docs/00_V07_TO_V12_PROGRESS_TRACKER.md
任務包：docs/task-packets/V10-07_DOMAIN_ADAPTER_ALIGNMENT.md

先盤點再收斂 Adapter 邊界，至少完成 GA 與 SEO 兩條真實 vertical slice。
保持 legacy response compatibility；Adapter 不得建立 Decision 或 Action。
```
