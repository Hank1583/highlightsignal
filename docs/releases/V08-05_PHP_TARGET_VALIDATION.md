# V08-05 PHP target validation

Status: VERIFY_PENDING_AUTH_HOTFIX_UPLOAD
Date: 2026-07-17
Target: 智邦 `/highlightsignal/v2` with PHP 7.0 and MySQL 5.6

## Owner-approved validation model

The owner declined a separate staging directory, subdomain, database, and local/CI PHP lint. The existing pre-launch target and database are the integration environment. Validation is URL-only; this is a documented risk acceptance, not equivalent to linting every deployable PHP file.

## Confirmed current-target evidence

Before the V08-03 upload, the target returned HTTP 200 for health, signed Workspace context, GA integration, dashboard workflow read, and a reversible test task mutation/readback. Unsigned, invalid-signature, expired-signature, replayed-nonce, and non-member requests were rejected with the expected 401/403 classes. Direct `.env`, `db_connect.php`, and internal-path requests were denied. MySQL reported 5.6.36-log.

These results prove the existing front-controller and core `010`–`012` schema paths, but they do not prove the newly changed legacy endpoints. Do not rerun the migrations blindly.

## One-time upload manifest

Upload the contents of `backend/api/` over `/highlightsignal/v2/`, preserving the existing server-only `/highlightsignal/private/.env` and existing report configuration. The upload must include all `.htaccess`, front controller, `src/`, legacy endpoint, and helper changes from commit `ad6f46d`.

Exclude these repository-only, example, or diagnostic files from the upload:

- `.env.example`
- `UPLOAD_README.md`
- `workers/README.md`
- `ga/report/config.php.example`
- `ga/report/check_phpspreadsheet.php`
- `ga/report/delete_csv.php`

Never upload `.env`, `backend/private/`, credential JSON, private keys, storage, `vendor`, SQL files, `.next`, or `.open-next` as part of this overlay.

## Required post-upload URL verification

- health: 200
- internal source and environment download: 403 or 404
- unsigned/invalid/expired/replayed signed request: 401
- valid signed legacy and `/api/v1` request: expected 2xx
- non-member Workspace: 403
- invalid JSON and unknown route: stable non-sensitive 400/404
- one reversible read/mutation/readback flow

PHP 7.0 is unsupported upstream and cannot be upgraded on this host. The owner accepts this hosting constraint for the pre-launch period. Moving to a supported PHP runtime remains a release risk, and no claim of full PHP 7.0 syntax compatibility is made without payload-wide lint or post-upload route coverage.

## First post-upload result

The 2026-07-17 URL run passed health, private/internal denial, unsigned/invalid/expired authentication rejection, `/api/v1` nonce replay rejection, Workspace membership isolation, signed unknown-route and invalid-JSON contracts, signed Workspace/context, workflow mutation/readback, signed GA/SI/SEO legacy reads, member/path tamper rejection, and legacy OPTIONS denial.

The authorized test mutation used context `v08-upload-smoke-20260717` and returned a matching task on readback.

Two gaps were found and fixed locally in commit `538ab3e`:

- a repeated signed legacy GET returned a cacheable 200 instead of reaching the nonce claim; all legacy authenticated responses now emit `no-store`, private, zero-age headers;
- OAuth invalid state returned 500 because provider configuration was checked before state; callback state is now authenticated before optional provider configuration.

Upload only `legacy_auth.php` and `ga/oauth_callback.php` from `538ab3e`, then repeat legacy replay plus OAuth invalid/expired-state tests. The host environment currently has no configured `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, or `GOOGLE_OAUTH_REDIRECT_URI`; a real provider exchange remains unavailable until those names are provisioned, without committing their values.
