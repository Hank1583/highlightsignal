export const API_DOMAIN = process.env.API_DOMAIN || "";

export const HIGHLIGHT_PHP_API_BASE_URL = (
  process.env.NEXT_PUBLIC_HIGHLIGHT_PHP_API_BASE_URL ||
  "https://www.highlight.url.tw/highlightsignal/v2"
).replace(/\/+$/, "");

export function highlightPhpApiUrl(path = "") {
  const normalizedPath = path.replace(/^\/+/, "");
  return normalizedPath
    ? `${HIGHLIGHT_PHP_API_BASE_URL}/${normalizedPath}`
    : HIGHLIGHT_PHP_API_BASE_URL;
}

// 所有 API 統一集中在這裡
export const API = {
  LOGIN: `${API_DOMAIN}/api/login.php`,
  REGISTER: `${API_DOMAIN}/api/register.php`,
  CHANGEPASSWORD: `${API_DOMAIN}/api/change_password.php`,
  // 你未來還可以一直加
};
