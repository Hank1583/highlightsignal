import { highlightPhpApiUrl } from "@/lib/config";
import { signedPhpFetch } from "@/lib/signedPhpFetch";
import type {
  SiHistoryResponse,
  SiModule,
  SiSitesResponse,
  SiSummaryResponse,
} from "@/lib/si/types";

function getErrorMessage(json: SiSummaryResponse, fallback: string) {
  return json?.error?.message || json?.message || fallback;
}

async function parseJsonSafe<T>(res: Response): Promise<T> {
  const text = await res.text();

  if (!text) {
    throw new Error(
      `API returned empty response. status=${res.status} url=${res.url}`
    );
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      `API did not return valid JSON. status=${res.status} url=${res.url} body=${text}`
    );
  }
}

export async function phpGetSiSummary({
  module,
  userId,
  siteId,
  tab,
}: {
  module: SiModule;
  userId: number;
  siteId: number;
  tab: string;
}): Promise<SiSummaryResponse> {
  const body = JSON.stringify({ user_id: userId, site_id: siteId, tab });
  const res = await signedPhpFetch(highlightPhpApiUrl(`si/${module}/summary.php`), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body,
  }, { memberId: userId });

  const json = await parseJsonSafe<SiSummaryResponse>(res);

  if (!res.ok || !json.ok) {
    throw new Error(getErrorMessage(json, `${module} summary failed`));
  }

  return json;
}

export async function phpGenerateSiSummary({
  module,
  userId,
  siteId,
  tab,
}: {
  module: SiModule;
  userId: number;
  siteId: number;
  tab: string;
}): Promise<SiSummaryResponse> {
  const body = JSON.stringify({ user_id: userId, site_id: siteId, tab });
  const res = await signedPhpFetch(highlightPhpApiUrl(`si/${module}/generate.php`), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body,
  }, { memberId: userId });

  const json = await parseJsonSafe<SiSummaryResponse>(res);

  if (!res.ok || !json.ok) {
    throw new Error(getErrorMessage(json, `${module} generate failed`));
  }

  return json;
}

export async function phpGetSiHistory({
  module,
  userId,
  siteId,
  tab,
  limit = 10,
}: {
  module: SiModule;
  userId: number;
  siteId: number;
  tab: string;
  limit?: number;
}): Promise<SiHistoryResponse> {
  const body = JSON.stringify({ user_id: userId, site_id: siteId, tab, limit });
  const res = await signedPhpFetch(highlightPhpApiUrl(`si/${module}/history.php`), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body,
  }, { memberId: userId });

  const json = await parseJsonSafe<SiHistoryResponse>(res);

  if (!res.ok || !json.ok) {
    throw new Error(
      json?.error?.message || json?.message || `${module} history failed`
    );
  }

  return json;
}

export async function phpListSiSites(userId: number): Promise<SiSitesResponse> {
  const body = JSON.stringify({ user_id: userId });
  const res = await signedPhpFetch(highlightPhpApiUrl("si/sites/list.php"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body,
  }, { memberId: userId });

  const json = await parseJsonSafe<SiSitesResponse>(res);

  if (!res.ok || !json.ok) {
    throw new Error(json?.error?.message || json?.message || "list si sites failed");
  }

  return json;
}
