# Task Packet — V12-08 Final Acceptance & Production Release

Status: PLANNED
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

- [ ] Alignment v1.2 固定決策全部成立。
- [ ] 無未處理 P0/P1。
- [ ] Pilot、restore、rollback、staging、monitoring 與 owner readiness 通過。
- [ ] Owner 已明確核准 production go-live。
- [ ] Release 可重現、可觀測、可回滾。

# Execution-chat prompt

```text
請執行 Highlight Signal Roadmap Task V12-08。
專案：D:\7.Highlight\1.Project\5.web\highlightsignal
主追蹤：docs/00_V07_TO_V12_PROGRESS_TRACKER.md
任務包：docs/task-packets/V12-08_FINAL_ACCEPTANCE_RELEASE.md

先做 release-candidate freeze 與完整 final checklist。這份 prompt 不授權 production
deployment；只有所有 gate 通過並取得 owner 明確 go-live 核准後才能部署與建立正式 tag。
```
