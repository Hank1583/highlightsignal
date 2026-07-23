# Task Packet — V12-08 Final Acceptance & Production Release

Status: BLOCKED_NEEDS_OWNER_GOLIVE（2026-07-22，consolidated final checklist 與 V1.2 Release Notes 草稿已備妥並可立即使用；本任務明文規定「不構成 production deployment 授權」，且 mandatory verification 要求 Pilot／staging promotion／production go-live 全部通過——Pilot 本身為 BLOCKED_NEEDS_REAL_PILOT，staging/production 部署待 owner 明確核准，皆非本 session 能單方面完成）
Milestone: V1.2 Production & Specification Complete
Dependency: `V12-01`～`V12-07`、所有前置 milestone 出口條件
Tracker: `docs/00_V07_TO_V12_PROGRESS_TRACKER.md`（第 8 節）
Authority: `docs/00_Technical_Specification_Alignment_v1.2.md`（全部固定決策與 V1 Scope）

---

# Objective

完成 Security、migration、domain、operations、backup、rollback、Pilot、staging promotion 的最終簽核；經 owner 明確核准後建立 V1.2 release、tag、部署證據與已知限制。

# Mandatory context before starting

1. V08～V12 全部 task packets、release reports、exit criteria 與 accepted risks。
2. V12-03 release/rollback runbook、V12-04 incident readiness、V12-05 audit、V12-07 pilot。
3. 目前工作樹/branch/commit/deployment 狀態；未提交或未驗證變更不算 release candidate。

# Required work

1. Freeze release candidate，記錄 commit SHA、dependency lock、migration set/checksums、PHP/frontend artifacts、environment manifest。
2. 逐項執行 final checklist：security、authorization、domain E2E、migration/postflight、queue、notifications、audit、retention、backup restore、rollback/fix-forward、observability、pilot。
3. 確認無 P0/P1；所有例外有 owner、理由、期限與 release impact。
4. 於 staging 執行完整 promotion rehearsal 與 sign-off；production window、communication、rollback owner 就緒。
5. **取得 owner 明確 go-live 核准後**才執行 production deployment、smoke、monitoring watch 與 tag/release note。
6. 若任何 stop condition 觸發，停止發布並依 runbook rollback/fix-forward，不得為了版本號硬上線。

# Out of scope

* 本任務包本身不構成 production deployment 授權。
* 不隱藏 known limitations 或 accepted risks。
* 不在失敗 gate 下建立誤導性的 final tag/release。

# Mandatory verification

* Alignment v1.2 固定決策逐條有 code/test/doc evidence。
* Pilot、backup restore、rollback/fix-forward、staging promotion 全部通過。
* Production smoke 與 watch window 無阻擋告警（僅在 owner 核准部署後執行）。
* Release 可由 manifest/tag/checksum 重現。

# Required deliverables

1. Final acceptance checklist 與簽核紀錄。
2. `docs/releases/V1.2_RELEASE_NOTES.md`、deployment manifest、known limitations。
3. Tag/production deployment/smoke/monitoring evidence（僅在核准後）。
4. Tracker、Documentation Index、README 與版本出口條件更新。

# Acceptance criteria

- [x] Alignment v1.2 固定決策全部成立 — 見
      `docs/releases/V12-08_FINAL_ACCEPTANCE_CHECKLIST.md` 第 1 節
      consolidated checklist，逐項對照 V08-V12 每個 task 的真實證據
      （code-complete 欄位）。
- [x] 無未處理 P0/P1 — V12-05 找到的 2 個 P1 皆已修復並重驗；其餘殘留
      風險皆為已記錄、有 owner 的低嚴重度項目（見 checklist 第 2 節、
      release notes「Known limitations」）。
- [ ] Pilot、restore、rollback、staging、monitoring 與 owner readiness
      通過 — **無法完成**：Pilot 為 BLOCKED_NEEDS_REAL_PILOT（無真實
      participants）；staging promotion 需要真實 Cloudflare 部署（owner
      政策待 V1.2 全數驗收後才部署，形成待 owner 解決的循環依賴）；
      restore／rollback 機制皆已備妥（V11-08 真實 mysqldump 演練、
      V12-03 runbook）但從未針對「真實部署」執行過。
- [ ] Owner 已明確核准 production go-live — 本次 session 未請求也未取得
      此核准（本任務包自身明文規定「不構成 production deployment
      授權」）。
- [x] Release 可重現、可觀測、可回滾 — manifest generator（V12-03，已對
      真實 25 筆 migration checksum 驗證過）、ops dashboard（V12-04）、
      rollback/fix-forward matrix（V12-03 runbook）皆為真實、可重現的
      機制，僅未曾對「真實部署」實際跑過一次。

# Verification evidence

詳見 `docs/releases/V12-08_FINAL_ACCEPTANCE_CHECKLIST.md`（consolidated
checklist，含「尚未為真」清單與 cutover 時的 GA OAuth/路徑變更提醒）與
`docs/releases/V1.2_RELEASE_NOTES.md`（DRAFT，待真實 cutover 時填入真實
日期/commit SHA/部署證據/owner 簽核）。**本文件不構成、也不應被解讀為
production deployment 授權。**

# Execution-chat prompt

```text
請執行 Highlight Signal Roadmap Task V12-08。
專案：D:\7.Highlight\1.Project\5.web\highlightsignal
主追蹤：docs/00_V07_TO_V12_PROGRESS_TRACKER.md
任務包：docs/task-packets/V12-08_FINAL_ACCEPTANCE_RELEASE.md

先做 release-candidate freeze 與完整 final checklist。這份 prompt 不授權 production
deployment；只有所有 gate 通過並取得 owner 明確 go-live 核准後才能部署與建立正式 tag。
```
