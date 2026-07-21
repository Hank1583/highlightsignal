# Task Packet — V12-02 Automated Test Suite

Status: PLANNED
Milestone: V1.2 Production & Specification Complete
Dependency: `V12-01`
Tracker: `docs/00_V07_TO_V12_PROGRESS_TRACKER.md`（第 8 節）
Authority: `docs/00_Technical_Specification_Alignment_v1.2.md`、`docs/00_V1_Implementation_Gap_Analysis.md`（Verification Requirements）

---

# Objective

建立可在乾淨環境重跑的最低必要自動測試組合，覆蓋 unit、API integration、migration、authorization、queue 與 critical E2E，成為 release gate 而非選擇性腳本。

# Mandatory context before starting

1. 現有 package scripts、GitHub Actions/CI、PHP lint 與 migration rehearsal。
2. V10-08/V11-08/V12-01 的 golden paths、已知缺口與 fixture 需求。
3. Production targets：Node/Next.js、PHP 7.0 compatibility、MySQL 5.6 behavior。

# Required work

1. 建立 test matrix 與 risk mapping，至少涵蓋 JWT/signature/nonce、cross-workspace、role、Decision/idempotency、queue concurrency/retry、migration/checksum/rollback、onboarding。
2. 建立 hermetic fixtures/factories：至少兩個 Workspace、多角色、真實化但去識別的 GA/SEO samples。
3. 測試不可依賴 production DB/secrets；外部服務以 contract fixture/mock，另保留少量受控 integration smoke。
4. 提供單一 CI 指令與分層指令，輸出 JUnit/coverage 或等價 artifacts。
5. 定義 flaky test 政策、timeout、重試限制與最低 release blockers；不得用無限 retry 掩蓋失敗。

# Out of scope

* 不追求無意義的 100% coverage。
* 不讓 E2E 寫入正式 production 資料。
* 不用 snapshot-only 測試取代 security/domain assertions。

# Mandatory verification

* 乾淨 checkout 可用文件化步驟執行全部 suite。
* 故意引入 authorization、migration checksum、queue duplicate、Decision replay 缺陷時 gate 會失敗。
* CI 與本機結果一致；失敗 artifact 可定位問題。
* Secrets scan 確認 fixtures/artifacts 無憑證與真實個資。

# Required deliverables

1. Test matrix、fixtures、test suites、single-command runner。
2. CI integration 與 artifacts。
3. Mutation/negative proof 與 flaky policy。
4. Tracker 與 task packet 更新。

# Acceptance criteria

- [ ] 最低必要情境全部自動化且可重現。
- [ ] 失敗會阻擋 release gate。
- [ ] 測試不依賴 production secrets/data。
- [ ] 關鍵 cross-workspace、Decision、queue、rollback 測試通過。

# Execution-chat prompt

```text
請執行 Highlight Signal Roadmap Task V12-02。
專案：D:\7.Highlight\1.Project\5.web\highlightsignal
主追蹤：docs/00_V07_TO_V12_PROGRESS_TRACKER.md
任務包：docs/task-packets/V12-02_AUTOMATED_TEST_SUITE.md

先做 risk-to-test matrix，再補測試與單一 CI runner。至少故意破壞四個關鍵保護，
證明 gate 真的會失敗；測試不得連 production 或使用 production secrets。
```
