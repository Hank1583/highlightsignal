// V12-01: was previously `process.env.API_DOMAIN || ""` -- with no env var
// set, every URL built from `API_DOMAIN` below resolved to a bare relative
// path like `/api/login.php` rather than the real external host. Nothing
// ever actually used this `API` object (register/login called a hardcoded
// absolute URL directly instead), so the bug was silent. Fixed with a real
// default so `API` is finally usable, and so a local rehearsal can override
// it to point at a mock server without touching production behavior.
export const API_DOMAIN = (
  process.env.LEGACY_MEMBER_API_BASE_URL || "https://www.highlight.url.tw"
).replace(/\/+$/, "");

// 2026-07-23 V1.2 換版：正式主機 PHP 路徑已從 `/highlightsignal/v2` 改為
// `/highlightsignal`（拿掉 `v2`），此預設值需跟著更新，否則所有走
// highlightPhpApiUrl() 的呼叫（SEO、SI、Signal/Dashboard workflow 等）
// 會打到已不存在的舊路徑並收到 404。
export const HIGHLIGHT_PHP_API_BASE_URL = (
  process.env.NEXT_PUBLIC_HIGHLIGHT_PHP_API_BASE_URL ||
  "https://www.highlight.url.tw/highlightsignal"
).replace(/\/+$/, "");

export function highlightPhpApiUrl(path = "") {
  const normalizedPath = path.replace(/^\/+/, "");
  return normalizedPath
    ? `${HIGHLIGHT_PHP_API_BASE_URL}/${normalizedPath}`
    : HIGHLIGHT_PHP_API_BASE_URL;
}

// The shared, cross-product legacy member system (register/login/change
// password) -- source lives OUTSIDE this repo, at D:\7.Highlight\1.Project\4.php\api,
// shared by ~12 unrelated products. This repo never modifies that code; it
// only calls it as a fixed external dependency. `CHANGEPASSWORD` remains
// unused today (no UI calls it) -- kept here as the single place to look
// when that changes, not wired into anything yet.
export const API = {
  LOGIN: `${API_DOMAIN}/api/login.php`,
  REGISTER: `${API_DOMAIN}/api/register.php`,
  CHANGEPASSWORD: `${API_DOMAIN}/api/change_password.php`,
  // 你未來還可以一直加
};
