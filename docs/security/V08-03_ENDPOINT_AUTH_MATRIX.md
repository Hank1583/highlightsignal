# V08-03 Endpoint Authentication Matrix

Status: IMPLEMENTED_LOCAL_PENDING_TARGET_UPLOAD
Date: 2026-07-17
Target: 智邦 `/highlightsignal/v2` (pre-launch integration)

## Authentication classes

| Class | Contract |
|---|---|
| Public health | Anonymous GET; no database or secret data |
| Signed front controller | HMAC-SHA256 method/path/body/timestamp/nonce/member/workspace; active Workspace membership where applicable |
| Signed legacy bridge | Same HMAC/nonce contract; signed BFF member scope replaces direct `X-Member-*`/body identity trust |
| OAuth callback | Public provider callback with HMAC-protected state and 10-minute TTL |
| CLI/include only | HTTP denied by `.htaccess`; callable only from approved server include/CLI flow |
| Internal source | HTTP denied by `.htaccess`; never an endpoint |

## Public and front-controller endpoints

| Endpoint | Method | Class | Authorization |
|---|---|---|---|
| `api/v1/health` | GET | Public health | Explicit anonymous allow |
| `api/v1/workspaces` | GET | Signed front controller | Signed member; member-owned Workspace list |
| `api/v1/context` | GET | Signed front controller | Active Workspace membership |
| `api/v1/workspaces/{id}/integrations/ga` | GET/PATCH | Signed front controller | Active membership; PATCH owner/admin/manager |
| `api/v1/workspaces/{id}/dashboard/workflow` | GET/PATCH | Signed front controller | Active membership; PATCH excludes viewer/billing/external viewer |

## Signed legacy bridge endpoints

| PHP endpoint/group | Next.js caller | Scope/decision |
|---|---|---|
| `dashboard/ai_usage.php` | Dashboard AI quota helper | Signed BFF only; direct identity headers removed |
| `dashboard/ai_plan.php`, `dashboard/ai_compose.php` | `/api/dashboard/ai-compose` | Signed BFF only; helper missing fails closed |
| `ga/get_connections.php`, `ga/update_connection_status.php` | `/api/ga/connections` | Signed member scope; SQL limits updates to member |
| `ga/get_query.php` | `/api/ga/query`, AI/dashboard server flows | Signed member scope plus connection ownership verification |
| `ga/ga_report_list.php`, `ga_report_detail.php`, `ga_report_save.php`, `ga_report_update.php` | `/api/ga/report/*` | Signed member scope; report owner and connection ownership checks |
| `ga/report/report_mailer.php` | `/api/ga/report/send` | Signed BFF for HTTP; CLI include remains available |
| `ga/account_fetch.php` | `/api/ga/account-link` | Signed server fetch; returns Google redirect only to BFF |
| `ga/data_sync.php` | `/api/ga/sync` | Signed server fetch; BFF proxies response instead of browser redirect |
| `si/aeo/*`, `si/geo/*`, `si/sites/list.php` | `/api/si/*` | Signed member scope; site ownership constrained in SQL |
| `si/seo/add.php`, `list.php`, `summary.php`, `pagespeed.php`, `pagespeed_history.php` | `/api/seo/*` | Signed member scope; site ownership constrained in SQL |
| `si/aeo_summary.php`, `si/geo_summary.php`, `si/save_summary.php` | Compatibility/server flows | Signed through shared SI bootstrap; keep during migration |

The bridge deliberately preserves the current member-owned GA/SI/SEO tables.
It no longer accepts a browser-provided identity as authorization. Full actor
versus legacy-data-owner separation is completed by the V0.9 Workspace
migration; new `/api/v1` Workspace operations already use the actual signed
actor and membership role.

## OAuth special flow

`ga/oauth_callback.php` remains public because Google must call it. The BFF-only
`account_fetch.php` now creates `state` as a base64url payload plus
HMAC-SHA256. The callback verifies the HMAC, positive member ID, and a maximum
age of 600 seconds before exchanging the authorization code. TLS peer
verification is enabled for Google API calls.

## HTTP-denied internal/CLI files

The root `.htaccess` denies:

- `api_helpers.php`, `auth.php`, `db_connect.php`, `legacy_auth.php`;
- `src/`, `config/`, `workers/`;
- `ga/api_client.php`, `ga/ownership.php`, `ga/report/config.php`;
- `si/common.php`, `si/generate_common.php`, `si/save_common.php`;
- `ga/report/check_phpspreadsheet.php`, `delete_csv.php`, `report_excel.php`,
  `report_runner.php`;
- `.env*`, README, Composer metadata and `pagespeed_config.php`.

`report_runner.php` and report implementation files may still be used by an
approved host CLI/scheduler include flow; they are not public HTTP endpoints.

## Canonical request and retention

The canonical value is newline-joined:

```text
METHOD
URL_PATH
SHA256(BODY)
UNIX_TIMESTAMP
NONCE
MEMBER_ID
WORKSPACE_ID
```

The signature is lowercase HMAC-SHA256 hex. TTL defaults to 60 seconds. Nonces
are unique database keys. After a successful claim, a configurable percentage
of requests deletes up to 1,000 expired rows; default
`SERVICE_AUTH_NONCE_CLEANUP_PERCENT=1`.

## Verification state

Local:

- `npm run lint`: PASS
- `npx tsc --noEmit --pretty false`: PASS
- source scan for wildcard CORS/direct `HTTP_X_MEMBER_ID`: zero active hits

Already proven on the current target for `/api/v1`:

- valid signed request 200;
- unsigned/invalid/expired/replayed request 401;
- non-member Workspace 403;
- signed mutation/readback 200.

Pending after the single planned PHP upload:

- legacy unsigned, forged member, body/path tamper and replay tests;
- OAuth invalid/expired state tests without provider exchange;
- internal/CLI path 403/404 verification;
- signed legacy GA/SI/SEO positive reads;
- report and sync BFF smoke tests where provider data is available.
