# V08-02 Secret Containment Report

Date: 2026-07-17  
Task: `V08-02`  
Status: `BLOCKED_EXTERNAL_ROTATION`

Local containment commit: `95a7167d` (`fix(security): contain runtime secrets`)

This report intentionally records names and states only. It contains no secret
value, fingerprint, hash, or reversible representation.

## Redacted secret inventory

| Secret class | Runtime names or artifact | Owner | Environments | Purpose | State | Rotation state |
|---|---|---|---|---|---|---|
| MySQL credentials | `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | PHP/backend and database owner | Local private file; staging/production host | Business data and queue storage | Local configuration is outside `backend/api`; legacy mirror contains non-empty literals | `REQUIRED_COMPROMISED` |
| Session signing | `JWT_SECRET` | Next.js/Cloudflare owner | Local private file; Cloudflare secret present | Sign and verify login cookie JWT | Git/history/bundle clean; development fallback removed; missing/short value fails closed | `NO_EXPOSURE_FOUND`, coordinated rotation optional because it invalidates sessions |
| Next.js to PHP signing | `PHP_SERVICE_AUTH_SECRET`, `SERVICE_AUTH_SECRET` | Next.js/Cloudflare and PHP owners | Local values match and meet minimum length; Cloudflare secret missing; production PHP state unknown | HMAC service authentication | Both implementations fail closed; production pair is incomplete | `PROVISION_REQUIRED` |
| OpenAI | `OPENAI_API_KEY` | AI/backend owner | Local PHP private file; production PHP host | AI summary and composition | Repo/history/bundle clean; legacy mirror contains a key literal | `REQUIRED_COMPROMISED` |
| PageSpeed / Google API | `PAGESPEED_API_KEY` and legacy Google API key | SEO/backend and Cloudflare owners | Local private files; Cloudflare secret present; PHP host | PageSpeed and Google API access | Repo/history/bundle clean; legacy mirror contains a key literal | `REQUIRED_COMPROMISED` |
| Google service account | `GOOGLE_APPLICATION_CREDENTIALS` or `GOOGLE_SERVICE_ACCOUNT_JSON` | Google integration/backend owner | Local credential moved to `backend/private`; production file must remain outside web root | Search Console service authentication | Repo/history/bundle clean; legacy mirror contains private-key material under its web project tree | `REQUIRED_COMPROMISED` |
| Google OAuth client | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI` | GA integration owner | New PHP private environment; production host | GA OAuth code exchange and refresh | Hardcoded client secret removed from both release files; missing config fails closed; legacy mirror retains old literal | `REQUIRED_COMPROMISED` |
| AdFusion/internal backend | `INTERNAL_KEY` | AdFusion and Cloudflare owners | Local private file; Cloudflare secret present | Internal backend authentication | No Git/history/browser/Worker bundle exposure found | `NO_EXPOSURE_FOUND`, verify provider ownership |
| Report automation | Legacy report DB fields and report API key | Reporting/backend owner | Legacy PHP mirror and production report configuration | Scheduled report data and trigger authorization | Host-only config is excluded from Release, but legacy mirror contains non-empty DB/API literals | `REQUIRED_COMPROMISED` |
| Cloudflare deployment credential | Wrangler login or scoped API token, stored outside repo | Cloudflare account owner | Operator workstation/CI | Worker management | No repository or bundle material found; secret values are not readable through Wrangler | `OWNER_VERIFY` |

Cloudflare's read-only secret-name inventory returned `INTERNAL_KEY`,
`JWT_SECRET`, and `PAGESPEED_API_KEY`. It did not return
`PHP_SERVICE_AUTH_SECRET`.

## Exposure findings

### 智邦 hosting constraint and live HTTP evidence

The owner confirmed that the current 智邦 environment is fixed at PHP 7.0 and
MySQL 5.6 and cannot be switched to PHP 8.1/8.2 or a newer MySQL release. This
is accepted as the current compatibility target, not as resolution of the
runtime end-of-life risk.

On 2026-07-17, a live status-only check discarded all response bodies and
returned:

| Path class | HTTP status | Interpretation |
|---|---:|---|
| `/highlightsignal/v2/api/v1/health` | 200 | PHP front controller/router responds |
| `/highlightsignal/v2/db_connect.php` | 403 | Direct HTTP access denied |
| `/highlightsignal/v2/.env` | 403 | Direct HTTP access denied |
| `/highlightsignal/v2/si/seo/business-agent-*.json` | 403 | Credential-like path denied |
| `/highlightsignal/v2/ga/report/config.php` | 404 | Not publicly present at the checked path |

The 403 results verify defense-in-depth at the HTTP layer. They do not make a
hardcoded credential safe against FTP access, hosting-account compromise,
backup exposure, or accidental payload copying. The repository's sanitized
`db_connect.php` and private environment layout remain required.

During the 2026-07-17 in-place upload, the new private environment URL initially
returned HTTP 200 and the deployment README was also public. No response body
was retrieved by the verification process. The owner then uploaded explicit
deny rules to both the private directory and `/v2`, and removed the server copy
of `UPLOAD_README.md`. The follow-up status-only verification returned:

| Check | Final HTTP status |
|---|---:|
| `/highlightsignal/v2/api/v1/health` | 200 |
| `/highlightsignal/v2/UPLOAD_README.md` | 404 |
| `/highlightsignal/v2/.env` | 403 |
| `/highlightsignal/v2/db_connect.php` | 403 |
| `/highlightsignal/v2/config/bootstrap.php` | 403 |
| `/highlightsignal/private/.env` | 403 |
| unsigned `/highlightsignal/v2/api/v1/workspaces` | 401 |

Because the private environment URL was briefly reachable with HTTP 200, every
credential placed in that file remains classified as potentially exposed and
must be rotated even though the HTTP containment is now effective. Under the
current release flow, the unsigned workspace request reaching the authentication
boundary also provides positive evidence that environment loading and database
connection completed before the expected 401 response. It does not replace the
required signed request and workspace authorization tests.

The health endpoint intentionally bypasses database creation and service HMAC
authentication, so HTTP 200 does not count as DB, auth, or signed API smoke-test
evidence.

### Repository and Git history

- `.env.local`, PHP `.env`, private credential JSON, report `config.php`, PEM,
  key, private runtime storage, and build output are not tracked.
- A high-confidence scan across all commits found no private-key block, OpenAI
  key, Google API key, OAuth client-secret literal, or JWT token material.
- Sensitive-path history for local env, report config, and credential JSON was
  empty.
- `.env.example` files contain placeholders or empty optional values only.

### Current release and public payload

- `backend/api` high-confidence credential scan: zero findings after repair.
- The only sensitive-looking file remaining in the public payload is the safe
  tracked `.env.example`.
- Runtime PHP environment moved from `backend/api/.env` to ignored
  `backend/private/.env`.
- Local Google service-account JSON moved from `backend/api/si/seo` to ignored
  `backend/private/google-service-account.json`.
- The two legacy GA PHP files now read OAuth configuration from environment and
  return a configuration error when required values are missing.

### Legacy/deployment mirror

The non-authoritative mirror at
`D:\7.Highlight\1.Project\4.php\highlightsignal` contains high-confidence
non-empty literals or private material in:

- `db_connect.php`: database password, OpenAI key, and Google API key classes.
- `ga/data_sync.php` and `ga/oauth_callback.php`: OAuth client-secret class.
- `ga/report/config.php`: database credential and report API-key classes.
- `si/seo/business-agent-*.json`: private-key material.

Because these values exist in a shared working/deployment tree, they are treated
as compromised even though they were not found in this Git history.

### Cloudflare/OpenNext bundle

The first build showed that Next/OpenNext collected local `.env.local` values
into `.open-next/cloudflare/next-env.mjs`. Local frontend secrets were therefore
moved to ignored `backend/private/frontend.env`, and `npm run dev` now loads that
file explicitly through Node `--env-file`.

After deleting the generated `.open-next` directory and rebuilding from
scratch, browser assets and the complete Worker bundle both had zero matches
for the configured local JWT, PHP service, internal, PageSpeed, database,
OpenAI, and service-account secret classes. Private-key material also had zero
matches.

## Fail-closed evidence

- `getJwtSecret()` rejects a missing or shorter-than-32-character secret in
  every environment; the development signing fallback was removed.
- `createPhpServiceHeaders()` rejects a missing or short
  `PHP_SERVICE_AUTH_SECRET`.
- PHP `ServiceRequestAuthenticator` requires `SERVICE_AUTH_SECRET`.
- PHP database connection requires all database credentials.
- Both legacy GA OAuth entry points reject missing OAuth client configuration.
- Google Search Console returns a configuration error when neither protected
  credential source is readable.

Local static/dynamic checks passed. Target-runtime PHP validation remains
V08-05 because this workstation has no PHP executable.

## Rotation matrix

| Credential class | Preparation and cutover order | Verification | Rollback before revocation |
|---|---|---|---|
| MySQL | Create a new least-privileged account; update staging private env; verify; update production PHP private env; then disable old account | Health, DB connection, read/write transaction, queue access | Restore the old account while it remains enabled |
| OpenAI | Create restricted replacement key; update staging PHP; run one controlled AI request; update production; revoke old key | Successful request, expected model, quota and error logs | Restore old key before revocation |
| PageSpeed / Google API | Create restricted replacement key with API/referrer/IP restrictions; update PHP and Cloudflare consumers; verify; revoke old key | One PageSpeed/Google request through each real consumer | Restore old key before revocation |
| Google OAuth | Add replacement client secret to the existing OAuth client; update private PHP env and callback URI; complete staging authorization and refresh; cut over production; delete old secret | OAuth callback, access-token exchange, refresh-token flow, GA connection list | Restore old secret while both provider secrets remain valid |
| Google service account | Create a new service-account key; store outside web root; update protected path; verify Search Console; delete old key | Search Console authenticated query and audit-log identity | Restore old key file/path before deletion |
| Report automation | Move report DB/API settings to protected environment/config outside web root; replace affected DB/API credentials; verify scheduled report; retire mirror literals | Report generation, delivery, database query, scheduler authentication | Restore protected previous config before provider revocation |
| PHP service HMAC | Generate one new shared value; configure PHP staging and Cloudflare staging; deploy V08-03 coverage; run health plus signed API test; repeat coordinated production cutover | Health, valid signature, invalid signature, expiry and replay tests | Restore both previous sides together; do not leave mismatched values |
| JWT | Schedule session invalidation; set replacement Cloudflare secret; deploy; verify login/logout/protected route; retire old value | Fresh login and cookie verification | Restore old secret if rollback is required, understanding old sessions become valid again |
| AdFusion internal key | Prepare replacement on AdFusion backend; update Cloudflare secret; verify login/token exchange; revoke old key | Successful and rejected internal-auth paths | Keep old key active until new path passes |
| Cloudflare deployment token | Create scoped replacement token; update CI/operator secret store; verify read and dry-run/deployment permissions; revoke old token | `wrangler whoami` and approved deployment workflow | Restore old CI secret before token revocation |

## Pre-launch in-place cutover authorization

On 2026-07-17 the owner confirmed that Highlight Signal is not formally live,
authorized changes to the current test data and schema, and selected the
existing 智邦 `/highlightsignal/v2` path and current MySQL database as the
pre-launch integration environment. No staging directory, subdomain, or test
database will be created.

This authorizes a controlled in-place secret cutover after backup. It does not
permit secret values in Git/output, an unbacked destructive failure test, or
revoking an old provider credential before the replacement passes verification.
Provider/host access is still required to execute:

1. Rotate the exposed MySQL, OpenAI, Google API/PageSpeed, OAuth, Google
   service-account, and report automation credentials.
2. Configure `PHP_SERVICE_AUTH_SECRET` in Cloudflare and the matching
   `SERVICE_AUTH_SECRET` on the current pre-launch PHP path, then run a signed
   smoke test.
3. Back up the current PHP payload and database, rebuild the PHP deployment
   from this repository in place, and retire or
   quarantine the credential-bearing legacy mirror.
4. Decide whether to rotate JWT, AdFusion internal, and Cloudflare deployment
   credentials despite no repository/bundle exposure finding.

Until required rotations and the in-place signed smoke test are complete, this
task must remain `BLOCKED_EXTERNAL_ROTATION` and may not be marked `DONE`.

### Owner risk decision — 2026-07-17

The owner declined rotation of the current MySQL password because the same
account is used by more than ten existing systems and an in-place password
change would cause a multi-system outage. The owner also elected to retain the
current `SERVICE_AUTH_SECRET`. No credential value was requested or recorded.

HTTP containment is complete, but this decision does not erase the earlier
HTTP 200 exposure window. V08-02 therefore remains
`BLOCKED_EXTERNAL_ROTATION` rather than `DONE`. The preferred compensating
change is to create a new least-privileged MySQL user dedicated to Highlight
Signal and update only this application's private environment; that change is
deferred and must not modify the shared account. The retained service secret
still requires matching Cloudflare provisioning and a successful signed smoke
test.

Because the host runtime is fixed, V08-05 must execute PHP 7.0-compatible lint
and MySQL 5.6-compatible validation on the 智邦 target or an equivalent runtime.
PHP 8.1+ remains a future hosting-migration requirement rather than an in-place
switch.

## Local verification

| Check | Result |
|---|---|
| `npm run lint` | PASS |
| `npx tsc --noEmit --pretty false` | PASS |
| `npm run build:cf` after clean generated-output removal | PASS |
| Actual-value browser asset scan | PASS, zero hits |
| Actual-value complete Worker bundle scan | PASS, zero hits |
| Worker bundle private-key scan | PASS, zero hits |
| PHP public payload high-confidence scan | PASS, zero hits |
| Git current/history high-confidence scan | PASS, zero committed hits |
| JWT missing-secret dynamic check | PASS, rejected |
| PHP fail-closed static checks | PASS |
| Wrangler secret-name inventory | PASS, values not requested or returned |
| Post-change Wrangler dry-run | NOT RUN; execution environment rejected external bundle transfer |
| Current health endpoint | PASS, HTTP 200 |
| Current unsigned workspace request | PASS, HTTP 401 |
| Current internal bootstrap and environment source paths | PASS, HTTP 403 |
| Unknown authenticated route without a signature | HTTP 401 at authentication boundary; route-level 404 requires a valid signed request |
| PHP lint and in-place signed smoke test | BLOCKED; no local PHP runtime and no provider/hosting cutover evidence yet |
