import type {
  SeoAddPayload,
  SeoAddResponse,
  SeoListResponse,
  SeoSummaryResponse,
} from "@/lib/seo/types";
import { highlightPhpApiUrl } from "@/lib/config";

const PHP_API_BASE = highlightPhpApiUrl("si/seo");

function getErrorMessage(json: any, fallback: string) {
  return json?.error?.message || json?.message || fallback;
}

async function parseJsonSafe<T>(res: Response): Promise<T> {
  const text = await res.text();

  if (!text) {
    throw new Error(
      `API 回傳空內容，status=${res.status} statusText=${res.statusText} url=${res.url}`
    );
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      `API 回傳不是合法 JSON，status=${res.status} url=${res.url} body=${text}`
    );
  }
}

/* =========================
 * 給 route.ts 用：打 PHP
 * ========================= */

export async function phpListSeoSites(
  userId: number
): Promise<SeoListResponse> {
  const res = await fetch(`${PHP_API_BASE}/list.php`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_id: userId,
    }),
  });

  const json = await parseJsonSafe<SeoListResponse>(res);

  if (!res.ok || !json.ok) {
    throw new Error(getErrorMessage(json, "list.php 呼叫失敗"));
  }

  return json;
}

export async function phpAddSeoSite(
  payload: SeoAddPayload
): Promise<SeoAddResponse> {
  const res = await fetch(`${PHP_API_BASE}/add.php`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const json = await parseJsonSafe<SeoAddResponse>(res);

  if (!res.ok || !json.ok) {
    throw new Error(getErrorMessage(json, "add.php 呼叫失敗"));
  }

  return json;
}

export async function phpGetSeoSummary(
  userId: number,
  siteId: number,
  options?: { force?: boolean }
): Promise<SeoSummaryResponse> {
  const res = await fetch(`${PHP_API_BASE}/summary.php`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_id: userId,
      site_id: siteId,
      force: Boolean(options?.force),
    }),
  });

  const json = await parseJsonSafe<SeoSummaryResponse>(res);

  if (!res.ok || !json.ok) {
    throw new Error(getErrorMessage(json, "summary.php 呼叫失敗"));
  }

  return json;
}
