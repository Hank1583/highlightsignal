# API upload folder

This directory is the complete PHP application payload. Upload its contents to
the host path served as `/highlightsignal/v2/`; do not upload the outer `api` folder
as an additional nested level.

Before testing:

1. Copy `.env.example` to `.env` on the server and fill the production values.
2. Set Next.js `PHP_SERVICE_AUTH_SECRET` to the same value as PHP
   `SERVICE_AUTH_SECRET`.
3. Keep Google service-account JSON outside this web-accessible directory and
   set its absolute path in `GOOGLE_APPLICATION_CREDENTIALS`.
4. If scheduled GA email reports are used, retain the existing server-side
   `ga/report/config.php`; the real file is intentionally not included.
5. Confirm Apache allows `.htaccess` overrides and then test
   `/highlightsignal/v2/api/v1/health`.

Do not upload `ga_runner.php`; it is a legacy fake-data utility and is not part
of this payload.
