# Search Intelligence PHP API

Deploy the files in `php/` to:

```text
https://www.highlight.url.tw/highlightsignal/si/
```

Run `sql/si_schema.sql` on the MySQL database first.

The PHP files are designed for the existing PHP project layout:

```text
highlightsignal/
  api_helpers.php
  db_connect.php
  si/
    common.php
    save_common.php
    seo/
      add.php
      list.php
      summary.php
    sites/
      list.php
    aeo/
      generate.php
      summary.php
      save.php
    geo/
      generate.php
      summary.php
      save.php
```

The root files `aeo_summary.php`, `geo_summary.php`, and `save_summary.php`
can remain as backward-compatible wrappers, but new frontend code should use the
folder-based endpoints.

`si/seo/*.php` are compatibility wrappers around the existing `seo/*.php`
endpoints. Keep the original `seo/` folder until the frontend has fully migrated.

## Endpoints

### POST `/si/seo/list.php`

Compatibility wrapper for `/seo/list.php`.

### POST `/si/seo/add.php`

Compatibility wrapper for `/seo/add.php`.

### POST `/si/seo/summary.php`

Compatibility wrapper for `/seo/summary.php`.

### POST `/si/sites/list.php`

Lists analyzable sites for the current user. It returns `si_sites` and also
falls back to existing `seo_sites` rows so AEO/GEO can reuse SEO sites.

### POST `/si/aeo/summary.php`

Request:

```json
{
  "user_id": 1,
  "site_id": 1,
  "tab": "overview"
}
```

### POST `/si/geo/summary.php`

Request:

```json
{
  "user_id": 1,
  "site_id": 1,
  "tab": "overview"
}
```

### POST `/si/aeo/save.php`

Same payload as the old save endpoint, but `module` is forced to `aeo`.

### POST `/si/geo/save.php`

Same payload as the old save endpoint, but `module` is forced to `geo`.

### POST `/si/save_summary.php`

Backward-compatible generic save endpoint. New code should prefer module-specific
save endpoints.

Request:

```json
{
  "user_id": 1,
  "site_id": 1,
  "module": "aeo",
  "tab": "overview",
  "title": "AEO Overview",
  "desc": "Summary text",
  "metrics": [
    { "label": "Questions", "value": "42", "note": "+8 this week" }
  ],
  "panelTitle": "Question opportunities",
  "items": [
    {
      "title": "What is Search Intelligence?",
      "meta": "High intent",
      "status": "Ready",
      "source": "AI Overview",
      "tags": ["faq", "priority"]
    }
  ],
  "actions": ["Create FAQ content"],
  "sideTitle": "Visibility score",
  "sideItems": [
    { "name": "Highlight Signal", "score": 68 }
  ],
  "recommendation": "Improve answer-friendly content."
}
```
### POST `/si/aeo/generate.php`

Generates a rule-based AEO analysis from existing SEO site/cache data, stores it
in the SI tables, and returns the generated summary.

### POST `/si/geo/generate.php`

Generates a rule-based GEO analysis from existing SEO site/cache data, stores it
in the SI tables, and returns the generated summary.
