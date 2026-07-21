# V10-08 — Decision Intelligence Core (V1.0) E2E Acceptance Report

Date: 2026-07-21
Executor: codex/v09-roadmap session (owner-directed "V10-03→V10-08 GOGOGO"
continuous-run instruction)
Environment: disposable Docker `mysql:5.6` container + local PHP 7.4 CLI
(`mysqli` compiled in via a scratch Dockerfile), destroyed after use — same
methodology as every V10-0X task's own rehearsal, chained into one
continuous run here. **This is synthetic seeded data, not the real
pre-launch host's data** — see section 5 for exactly what that means for
this report's conclusion.

---

## 1. Scope

Per the task packet, this is a verification/acceptance task with no new
features: confirm the full V1.0 core chain — **Data Source → Signal →
Evidence → Explanation/Business Impact → Recommendation → Human Review →
Decision** — actually works end-to-end, across more than one source domain,
including isolation/idempotency/permission/failure scenarios, and produce a
reproducible PASS/FAIL/BLOCKED ledger rather than a narrative claim of
success.

## 2. What this report is NOT

It is **not** a real-Workspace, real-data golden path on the actual
pre-launch host. Every V10-01 through V10-07 task packet already recorded
that gap individually ("Not yet executed — needs the real host"); this task
does not close it, because doing so requires the owner's phpMyAdmin/FTP
access this environment does not have (see this project's standing "no SSH
hosting" constraint, `backend/sql/VERIFICATION_RUNBOOK.md`). What this
report adds beyond the individual V10-0X rehearsals is **chaining every
piece together in one continuous run**, in the same call order the real
production code actually uses, instead of testing each layer in isolation.

## 3. Golden path definition

Two continuous golden paths were executed in a single disposable-Docker PHP
session, using two seeded Workspaces (`workspace_id=1` with an owner
`member_id=1`, a `member`-role `member_id=10`, and a `viewer`-role
`member_id=11`; `workspace_id=2` with its own owner `member_id=2`):

* **Golden Path A (SEO)** — `site_id=5001`, two initial technical issues
  (`MISSING_TITLE` at `/landing`, `MISSING_META_DESCRIPTION` at `/about`),
  called through the exact same sequence `si/seo/summary.php` uses in
  production: `SignalService::runSeoTechnicalIssueDetection()` →
  `EvidenceService::recordSeoTechnicalIssueEvidence()` →
  `ExplanationService::readOrGenerateForSignal()`, then a separate
  `WorkflowService::mutate()` call exactly as `seo/page.tsx` sends it
  (`signal_context: {site_id, issue_type, url}`) to formalize the
  Recommendation and record a Human Decision.
* **Golden Path C (GA)** — `connection_id=7001`, a 70%-below-baseline
  session drop, through `SignalService::runGaTrafficAnomalyDetection()` →
  `EvidenceService::recordGaTrafficAnomalyEvidence()` →
  `ExplanationService::readOrGenerateForSignal()` → `WorkflowService::mutate()`
  using the V10-06 `signal_context: {signal_id}` path (GA has no
  site_id/issue_type/url), proving the SAME chain and the SAME Decision
  mechanism works for a second, structurally different source domain.

Full script and evidence: this session's `Bash`/`Write` tool calls (not
committed to the repo as a fixture — reproducible from this report's steps
and the existing `backend/sql/VERIFICATION_RUNBOOK.md` sections 6-12, which
document the same migrations/seed pattern).

## 4. Results — 33/33 checks passed

| # | Check | Result |
|---|---|---|
| A1 | Scan 1 creates 2 Signals | PASS |
| A2 | `MISSING_TITLE` Signal has `source='seo'` | PASS |
| A3 | Scan 1 records 2 Evidence rows, both linked | PASS |
| A4 | Explanation `status=ok` once Evidence exists | PASS |
| A5 | Explanation wording is source-neutral (bug found & fixed — see §6) | PASS |
| A6 | `impact_area` reflects `source=seo` (bug found & fixed — see §6) | PASS |
| A7 | Recommendation formalized from the real Signal, frontend-supplied fake title discarded | PASS |
| A8 | Recommendation `generator_type=backend_rule` | PASS |
| A9 | Recommendation `reason` cites the real Explanation text | PASS |
| A10 | Decision recorded by the real signed member identity | PASS |
| A11 | `decisions.actor_member_id` is the actual caller (`member_id=10`), not whoever formalized the Recommendation earlier | PASS |
| A12 | Decision → Recommendation → Signal fully joinable, no orphaned FK | PASS |
| A13 | Signal → Evidence traceability holds | PASS |
| A14 | Idempotent re-run: Signal count unchanged | PASS |
| A15 | Idempotent re-run: Evidence count unchanged | PASS |
| A16 | Idempotent re-run: Analysis count unchanged | PASS |
| A17 | Idempotent re-run: repeat decision submit (different outcome, same `idempotency_key`) returns the ORIGINAL decision, ignored | PASS |
| A18 | Fail-closed: a Signal with zero Evidence gets `insufficient_evidence` | PASS |
| A19 | Fail-closed propagates end-to-end into the formalized Recommendation's `expected_impact` (no fabricated content) | PASS |
| A20 | Signal auto-resolves when the issue disappears on next scan | PASS |
| A21 | Recommendation auto-archives on next read after its Signal resolves | PASS |
| B1 | Cross-workspace: Workspace 2 sees no Recommendation for Workspace 1's context_key | PASS |
| B2 | Cross-workspace: forged `site_id` in `signal_context` falls back to the caller's own legacy content, no leak | PASS |
| B3 | `viewer` role denied `workflow.mutate` | PASS |
| B4 | `member` role allowed `workflow.mutate` | PASS |
| B5 | Invalid decision value throws `ValidationException` | PASS |
| B6 | Rejected `mutate()` leaves zero half-created Recommendation rows (whole-transaction rollback) | PASS |
| C1 | GA detection creates a Signal (`source='ga'`) | PASS |
| C2 | GA Signal gets a real Explanation once Evidence exists | PASS |
| C3 | GA `impact_area='traffic'` (source-aware, not hardcoded `'seo'` — see §6) | PASS |
| C4 | GA Recommendation formalized via the `signal_id` path, real title | PASS |
| C5 | GA Recommendation priority mapped from severity | PASS |
| C6 | GA Decision recorded via the identical Decision mechanism as SEO | PASS |
| C7 | GA Recommendation status correctly mapped for `needs_more_evidence` | PASS |

## 5. V1.0 exit-criteria evidence table

| Exit criterion | Status | Evidence |
|---|---|---|
| 真實資料驅動完整核心決策流程 (real-data-driven complete core decision flow) | **BLOCKED** | Chain proven correct end-to-end against synthetic seeded data (§3-4) and against every individual V10-0X task's own disposable rehearsal (see each task packet + `VERIFICATION_RUNBOOK.md` §6-12). A genuine real-Workspace, real-GA-property, real-SEO-scan run has **not** been executed — requires the owner's real host access. This is the single remaining gap. |
| Signal、Evidence、Recommendation、Decision 持久化且隔離 (persisted and isolated) | **PASS** (rehearsal-level) | A11-A13, B1-B2 above; consistent with V10-01 through V10-05's own isolation checks. |
| Human-in-the-loop 與 traceability 成立 (human-in-the-loop and traceability hold) | **PASS** (rehearsal-level) | A10-A13; `recordDecision()`'s `actor_member_id` is structurally always the signed `ServiceIdentity->memberId` — inspected `SignalService`/`EvidenceService`/`ExplanationService` source directly and confirmed none of them import or call `WorkflowRepository`/`WorkflowService`, so no system/AI-triggered path can ever record a Decision. |
| V1.0 出口條件有可重現證據 (reproducible evidence for V1.0 exit) | **PARTIAL** | This report + `VERIFICATION_RUNBOOK.md` §6-12 + each task packet's own evidence section together are the reproducible record for everything short of the real-host run. |

**Conclusion: V1.0 milestone stays VERIFY, not DONE.** Per this task's own
mandatory rule ("只有全部 V1.0 出口條件具證據時才將 milestone 標為 DONE") and
the standing project rule (never mark DONE without the owner's real-host
execution — see `docs/00_V07_TO_V12_PROGRESS_TRACKER.md`'s per-task VERIFY
status and `[[v12_cutover_plan]]`'s decision to apply everything in one shot
at V12-08), this report does not and cannot declare V1.0 complete. It
confirms the CODE is correct and the chain is real, not a mock — the
remaining gap is entirely deployment/execution, not design or
implementation.

## 6. Defects found and fixed during this acceptance pass

Per the task packet's own instruction ("發現缺陷應回到對應 task 修復並重驗"),
one real defect was found and fixed, not just noted:

* **`RuleBasedAnalysisGenerator` (V10-03) hardcoded SEO's own vocabulary**
  (`impact_area = 'seo'` unconditionally, and explanation wording that said
  "技術問題快照" / "非單次誤報") even though V10-07 made this same generator
  run for GA Signals too. A GA traffic anomaly's Explanation would have
  claimed `impact_area='seo'` and talked about "technical issue snapshots"
  that don't exist for a GA metric. Fixed by reading `signal['source']` and
  mapping it (`seo`→`seo`, `ga`→`traffic`, default `general`), and
  generalizing the explanation/impact-basis wording to be source-neutral.
  Caught by check C3 in this rehearsal (chaining a GA Signal through
  Explanation, which no prior task's own rehearsal did — V10-03's rehearsal
  only used SEO signals, V10-07's rehearsal stopped at Evidence).
  Re-verified: A5/A6 (SEO still correct) and C2/C3 (GA now correct) all pass
  after the fix. Files: `backend/api/src/Explanation/Generator/RuleBasedAnalysisGenerator.php`.

No other defects were found in this pass — the two test-script bugs
encountered while writing the rehearsal (a wrong assertion value, and an
Evidence-already-recorded ordering mistake in the fail-closed scenario) were
corrected in the rehearsal script itself, not code defects.

## 7. Negative/edge scenarios covered

* Cross-workspace isolation (Signal, Evidence, Recommendation, Decision) — B1, B2.
* Role/permission fail-closed (`viewer` denied, `member` allowed) — B3, B4.
* Invalid input fail-closed with full-transaction rollback (no half-created state) — B5, B6.
* Idempotency across the ENTIRE chain, not just one layer — A14-A17.
* Fail-closed Explanation/Impact when Evidence is missing, propagated all the
  way to the Recommendation's displayed content — A18, A19.
* Auto-resolve/auto-archive lifecycle when an issue disappears — A20, A21.
* A second, structurally different source domain (GA) proven through the
  identical Decision mechanism as SEO — C1-C7.

## 8. Explicitly out of scope / not attempted here

* AEO/GEO Signal detection — V10-07 already recorded this as a deliberate
  deferred gap (no scan-history-equivalent persistence layer exists yet);
  this report does not attempt it either, consistent with "不在驗收 task 偷補
  大功能".
  * **Recommendation for AEO/GEO's persistence gap**: it is real project
    work, not a documentation-only note. Flagging it as a candidate for a
    background task so it gets tracked and picked up rather than only living
    in this report.
* V1.1 Action/Execution/Outcome lifecycle — untouched, per task packet.
* A real AI-generated (non-rule-based) Explanation path — not built by any
  V10-0X task; `RuleBasedAnalysisGenerator`'s `generator_type='rule'` is
  accurate as recorded, never claimed to be AI.

## 9. Static verification (this session, all tasks V10-05 through V10-08)

* `php -l` passed on every new/modified PHP file across V10-05, V10-06,
  V10-07, and this task's `RuleBasedAnalysisGenerator.php` fix.
* `npm run typecheck`, `npm run lint`, `npm run build` all passed after the
  V10-06 frontend changes (no frontend files changed in V10-07/V10-08).
* Every migration (024-028) preflight/apply/postflight cycle completed
  cleanly in disposable MySQL 5.6, including confirming non-idempotent DDL
  fails identically to every prior migration on a second apply attempt
  (expected MySQL 5.6 behavior, not a bug).

## 10. Residual risk carried into V1.1/V1.2

Unchanged from what V10-01 through V10-07 already recorded individually —
this task does not add new risk, it confirms the existing list is still
accurate:

* Nothing in V10-01~08 has been applied to the real pre-launch host yet
  (migrations 024-028, PHP uploads, frontend build). Per the owner's
  2026-07-21 decision, this is deliberately deferred to a single V12-08
  cutover rather than applied incrementally (see
  `docs/00_V07_TO_V12_PROGRESS_TRACKER.md` and the `[[v12_cutover_plan]]`
  memory).
* AEO/GEO have no Signal-backed Decision flow (§8).
* The Decision-first Dashboard UI (V10-06) has not been clicked through in a
  live-authenticated browser session — only disposable-Docker backend
  rehearsal and static frontend checks (typecheck/lint/build) exist for it.
* GA traffic-anomaly detection has not run against a real Google Analytics
  property with genuine multi-day history — only synthetic seeded numbers.
