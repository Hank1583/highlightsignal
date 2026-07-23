# V12-01 — Registration & Onboarding BFF Report

Date: 2026-07-22
Executor: codex/v09-roadmap session (owner instruction: "啟動V1.2好了" — start V1.2)
Milestone: V1.2 Production & Specification Complete

---

## 1. Scope decision (made with the owner before writing any code)

Initial research for this task found that `register.php`/`login.php`/
`change_password.php` do **not** exist anywhere in the `highlightsignal`
repo — they live at `D:\7.Highlight\1.Project\4.php\api`, a **shared,
cross-product legacy member system** used by roughly a dozen unrelated
products (ai_fortune, babycare, binance, brandhue, cities-insight,
leanfuel, lineBot, platform-ops, shop, traderBot, vip, highlightsignal).
`db_connect.php` there connects to a single shared MySQL database
(`vhost125121`) with a plaintext credential committed to disk.

Given the blast radius of touching shared, unrelated-product infrastructure,
the owner confirmed this task's scope is **highlightsignal's Next.js side
only** — build/harden the BFF that mediates between the Browser and that
external system; never modify `4.php/api/*.php` itself. Two follow-up items
were explicitly deferred to separate, owner-approved tasks (flagged via the
session's task-suggestion mechanism, not actioned here):

* Adding real forgot-password / email-verification endpoints to the shared
  `4.php` member system (owner's explicit choice — a new task, not V12-01).
* The concrete issues noticed while reading that shared code: a plaintext
  DB password in `db_connect.php`, `update_profile.php` echoing a raw
  interpolated SQL string back in its JSON response, and account-enumeration
  leaks in `login.php`/`register.php`'s distinct error messages.

Rate limiting: the frontend deploys to Cloudflare Workers (edge runtime, no
persistent in-process memory across requests — confirmed via
`docs/infrastructure/V08-04_CLOUDFLARE_ENVIRONMENTS.md`), and a standing
owner policy blocks any Cloudflare deploy until the full V1.2 roadmap
passes acceptance. The owner chose **Cloudflare Rate Limiting Rules**
(dashboard-configured platform feature) over an application-code counter —
documented below as a deploy-time configuration, not implemented as code,
consistent with how V11-08 documented a retention policy ahead of its
job implementation.

## 2. What existed before this task

* **Registration**: the Browser called
  `https://www.highlight.url.tw/api/register.php` **directly**, client-side,
  with a hardcoded absolute URL — no BFF, no origin check, no validation
  beyond HTML `required` attributes.
* **Login**: already had a thin BFF (`app/api/auth/login/route.ts` proxying
  server-side to `login.php`), but no origin/CSRF check, no rate limiting,
  and forwarded `login.php`'s raw error message verbatim — including the
  distinct "帳號不存在" (account doesn't exist) vs "密碼錯誤" (wrong
  password) messages, a classic account-enumeration leak.
* **Workspace provisioning**: solid and transactional
  (`WorkspaceProvisioningService`, already idempotent) but only triggered
  *reactively* by `WorkspaceProvider`'s client-side "list empty → provision
  → re-list" fallback on first Dashboard load — never connected to
  registration/login itself.
* **No email verification or password reset exists anywhere** — confirmed
  from the real external source, not just its absence in this repo.

## 3. What this task built

All changes are confined to this repo (`app/`, `lib/`) — `4.php/api/*.php`
was never modified.

* `lib/legacyMemberAuth.ts` — the one place that calls the external
  `register.php`/`login.php`. Normalizes `login.php`'s enumeration-prone
  "帳號不存在"/"密碼錯誤" pair into one generic message
  (`帳號或密碼錯誤，請重新確認。`) before it ever reaches the Browser —
  `"帳號已封鎖"` (blocked) stays distinct, a different situation a
  legitimately blocked user needs to know about, not the same risk class.
* `lib/authSession.ts` — JWT signing / AdFusion token fetch / cookie options,
  extracted from the login route so register can reuse the identical shape
  after auto-login instead of duplicating it.
* `lib/workspaceProvisioning.ts` — the PHP provisioning call extracted from
  `app/api/workspaces/route.ts`'s `POST` handler, so the registration route
  can call it directly, server-side, as part of the same request instead of
  a self-referential HTTP round trip.
* `lib/authOrigin.ts` — same-origin check (`Origin` header, `Referer`
  fallback) for the auth BFF routes; a present-but-mismatched header is
  rejected (`403 ORIGIN_REJECTED`), a genuinely absent header is allowed.
* `lib/correlationId.ts` — one UUID per request, included in every response
  body and server log line across the register → login → provision chain.
* `app/api/auth/register/route.ts` (new) — the real BFF: server-side
  validation (email format, password ≥ 8 chars, name required/bounded),
  origin check, then a 3-step saga (register → auto-login → provision
  default Workspace) with each step's outcome reported distinctly so the
  UI can show accurate partial-failure states instead of a flat
  success/fail (e.g. "帳號已建立，但自動登入失敗，請手動登入" is a
  materially different, recoverable situation from "註冊失敗").
* `app/api/auth/login/route.ts` (rewritten) — same origin check +
  correlation id + normalized error message, using the shared helpers
  above instead of its own inline copy of this logic.
* `app/auth/register/page.tsx` (rewritten) — calls the new same-origin
  `/api/auth/register` instead of the external URL directly; handles the
  three real outcomes (full success, logged-in-but-workspace-pending,
  registered-but-login-failed) with distinct user-facing messages.
* `lib/config.ts` — fixed a **dead/unwired bug**: `API_DOMAIN` defaulted to
  `""`, so the pre-existing `API.REGISTER`/`API.LOGIN`/`API.CHANGEPASSWORD`
  constants resolved to bare relative paths and were never actually usable
  (nothing referenced them; both routes hardcoded absolute URLs directly
  instead). Fixed with a real default
  (`https://www.highlight.url.tw`), now overridable via
  `LEGACY_MEMBER_API_BASE_URL` for local rehearsal against a mock server
  without touching production behavior.

## 4. Deliberately NOT built (honest gaps, not silently skipped)

* **Email verification / password reset** — no endpoint exists on the
  external system to call, and this task does not modify that system (see
  scope decision). A separate follow-up task is required before this can
  exist for real.
* **Application-level rate limiting** — deferred to Cloudflare Rate
  Limiting Rules, configured at actual deploy time (which itself is blocked
  until V1.2 completes, per standing owner policy). Recommended rule to
  configure then: limit `POST /api/auth/register` and `POST /api/auth/login`
  by IP, e.g. 10 requests/minute, block on excess.
* **Login/register account-enumeration fix at the source** — only mitigated
  at the BFF layer (see above); `register.php`'s "Email 已被註冊" message is
  left as-is (revealing this at registration time, not login time, is
  common accepted UX and a much weaker signal — changing it would trade
  onboarding UX for a marginal security gain, and doing so would require
  editing the external shared system anyway).
* **Legacy endpoint access closure** — the task's own required work item #6
  ("Legacy direct endpoint 在切換後關閉 Browser access 或受等價保護") is not
  applicable here: the external `register.php`/`login.php` are shared by
  ~12 other products and cannot be closed off from this repo; the
  Browser-side fix (never calling them directly) is what item #3 already
  covers, and is done.

## 5. Verification evidence

**No automated test framework exists in this repo yet** (`package.json` has
no Jest/Vitest/Playwright — that is V12-02's job, not this task's). This
was verified by:

1. **`npx tsc --noEmit`**: clean, zero errors, across every new/modified file.
2. **`npm run lint`**: clean, zero warnings/errors.
3. **A real local mock server** (plain Node `http`, reproducing the EXACT
   response shapes read from the real `register.php`/`login.php`/PHP
   workspaces-endpoint source) + the REAL `next dev` server pointed at it
   via `LEGACY_MEMBER_API_BASE_URL`/`NEXT_PUBLIC_HIGHLIGHT_PHP_API_BASE_URL`
   overrides — never touching the real external production system or
   creating real accounts on the shared member database. Driven via real
   HTTP (`curl`), 10 scenarios, all passed:
   - Origin rejected (`403 ORIGIN_REJECTED`) for a cross-origin request.
   - Full happy path: register → auto-login → Workspace provisioning all
     succeed in one call, correct `workspaceProvisioned: true`.
   - Duplicate email correctly surfaced as a `phase: "register"` failure
     (account never created twice).
   - Login with a wrong password → generic
     `帳號或密碼錯誤，請重新確認。` message.
   - Login with a **non-existent** email → the **exact same** generic
     message — confirmed indistinguishable, closing the enumeration leak
     at this layer.
   - Correct login succeeds with full user payload.
   - Bad email format and too-short password both rejected by the BFF's
     own validation, before ever reaching the external system.
   - Demo login (pre-existing special case) still works unchanged.
4. **A real, click-driven browser flow** (via the in-app browser preview):
   filled the actual registration form, submitted it, and confirmed via
   the browser's own network trace that the ONLY request made was
   `POST http://localhost:.../api/auth/register` (same-origin) — no direct
   call to the external host appears anywhere in the trace — followed by a
   real redirect to `/dashboard`. This directly satisfies the task's
   mandatory verification: "Browser network trace 不直接呼叫 legacy
   register endpoint."
5. The pre-existing "already provisioned" (`409`) branch in
   `provisionDefaultWorkspace()` was preserved verbatim from the original
   inline logic during extraction, but not independently re-triggered
   against a live `409` in this rehearsal (the mock always returns success
   unless a query param the app code doesn't send is set) — noted here
   rather than silently claimed as tested.

All local rehearsal processes (mock server, `next dev` instance, mock
data) were torn down after verification; nothing was left running.

## 6. Not yet executed (needs the real host / real deploy)

* A real end-to-end registration against the actual `www.highlight.url.tw`
  system was deliberately NOT performed — that would create a real row in
  the shared `members` table used by ~12 products, which is not this
  task's call to make unilaterally.
* Configuring the recommended Cloudflare Rate Limiting Rules — blocked
  until the owner's standing "no Cloudflare deploy before full V1.2
  acceptance" policy is lifted.
* Closing the two follow-up items (email verification/reset endpoints on
  `4.php`; the plaintext-credential/SQL-leak/enumeration issues found in
  that shared system) — flagged as separate tasks, not started.
