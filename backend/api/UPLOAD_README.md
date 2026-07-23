# API upload folder

This directory is the complete PHP application payload. As of this reorg,
`backend/api/` contains **only** what actually needs to be on the real host —
dev/test tooling (`vendor/`, `tests/`, `bin/`, `composer.json`/`composer.lock`,
`phpunit.xml`) now lives in the sibling `backend/dev/` directory instead, so
there is no longer a bulk exclusion list to remember: **upload this entire
folder's contents as-is**, nothing to skip for that reason.

Upload to the host path served as `/highlightsignal/v2/` (or whatever the
current, decided real path is — this note is stale the moment that path
changes; check the live cutover plan before trusting it); do not upload the
outer `api` folder as an additional nested level.

Before uploading:

1. Do not upload or overwrite a populated `.env` or credential JSON with this
   payload. The current host uses `/highlightsignal/private/.env` outside the
   web root; keep `HIGHLIGHT_SIGNAL_ENV_FILE` pointed at that server-only
   file.
2. Set Next.js `PHP_SERVICE_AUTH_SECRET` to the same value as PHP
   `SERVICE_AUTH_SECRET`.
3. Keep Google service-account JSON outside this web-accessible directory and
   set its absolute path in `GOOGLE_APPLICATION_CREDENTIALS`.
4. If scheduled GA email reports are used, retain the existing server-side
   `ga/report/config.php`; the real file is intentionally not included here
   (only `ga/report/config.php.example` is).
5. Confirm Apache allows `.htaccess` overrides and then test
   `/highlightsignal/v2/api/v1/health`.

Still exclude these individual files (small, genuinely not runtime payload —
unrelated to the bulk vendor/tests exclusion this reorg removed):
`UPLOAD_README.md` itself, `.env.example`, `ga/report/config.php.example`
(example only — the real `config.php` is server-only, see #4 above), and
`ga/report/check_phpspreadsheet.php` (a manual diagnostic script, not called
by any other code).

**Flagged for a real decision, not silently resolved here**:
`ga/report/delete_csv.php` was previously listed here as excluded, but it is
a REAL, currently-fixed endpoint (V09-05 added real
`hs_require_service_member()` authentication to it — it used to have none)
with no other caller in this codebase, meaning it is meant to be visited
directly by an operator to bulk-delete every generated CSV export. Nothing
else in this repo depends on it existing. Whether to include it in a real
upload is an operational choice (do you want this "wipe all exports" action
available on the live host) — not something to silently decide either way;
confirm before upload rather than trusting either the old exclusion or this
note by default.
