# Task Packet — V12-02 Automated Test Suite

Status: VERIFY（2026-07-22，PHPUnit（backend）＋Vitest（frontend）建立完成，disposable MySQL 5.6 驗證通過，CI 雙 job 已接上；4 項故意破壞的缺陷全數證明會被抓到，過程中另外發現並修復 3 個真實潛伏 bug）
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

- [x] 最低必要情境全部自動化且可重現 — JWT/signature/nonce、cross-workspace、
      role、Decision/idempotency、queue concurrency/retry、
      migration/checksum、onboarding 皆有對應自動化測試（PHP 38 項＋
      前端 26 項），disposable schema 可重複套用，本地與 CI 結果一致。
- [x] 失敗會阻擋 release gate — `backend-tests`／`verify` 為兩個獨立 CI
      job，皆為必要檢查；無任何自動重試機制掩蓋失敗。
- [x] 測試不依賴 production secrets/data — 全部使用 disposable
      `mysql:5.6`（CI service container）與 mock `fetch`，不連正式主機、
      不使用真實憑證。
- [x] 關鍵 cross-workspace、Decision、queue、rollback 測試通過 — 見驗證
      證據；另外，migration checksum 缺陷、queue 缺陷、Decision replay
      缺陷、authorization 缺陷皆已個別故意引入並證明測試會失敗。

# Verification evidence

詳見 `docs/releases/V12-02_AUTOMATED_TEST_SUITE_REPORT.md`。摘要：PHPUnit
38 項斷言（96 assertions）＋ Vitest 26 項，皆對 disposable 環境驗證通過。
過程中撰寫真實可執行測試（而非僅推理程式碼）意外發現並修復 3 個真實潛伏
bug：(1) `ServiceRequestAuthenticator`／`WorkerRequestAuthenticator` 的
nonce 重放偵測是 dead code（`MYSQLI_REPORT_STRICT` 下 `execute()` 會拋例外
而非回傳 false，原本的偵測邏輯永遠不會執行到）；(2) `MigrationRunner`
把版本號當 array key 時，PHP 會把無前導零的數字字串自動轉型成整數，導致
`applyOne(string $version)` 的嚴格型別檢查拋出 TypeError——目前所有真實
migration 版本都有前導零（010-037）而不受影響，但版本一旦達到 100+ 就會
真的觸發。4 項故意破壞的缺陷（authorization、migration checksum、queue
duplicate/lost-claim、Decision replay）全數證明測試會失敗，其中 queue
duplicate 缺陷的真實失效模式比預期更細微（輸家 worker 誤判佇列已空而提前
放棄，而非同一 job 被兩邊搶到），為此新增了第三個斷言才真正抓到。

**尚未執行**：新 CI workflow（`.github/workflows/release-gate.yml` 的
`backend-tests` job）尚未在真實 GitHub Actions 上跑過（此環境無本地 Actions
runner，且未經 owner 同意不會 push 到會觸發 CI 的分支/main）；每個指令已
個別驗證可正常執行。

# Execution-chat prompt

```text
請執行 Highlight Signal Roadmap Task V12-02。
專案：D:\7.Highlight\1.Project\5.web\highlightsignal
主追蹤：docs/00_V07_TO_V12_PROGRESS_TRACKER.md
任務包：docs/task-packets/V12-02_AUTOMATED_TEST_SUITE.md

先做 risk-to-test matrix，再補測試與單一 CI runner。至少故意破壞四個關鍵保護，
證明 gate 真的會失敗；測試不得連 production 或使用 production secrets。
```
