import { highlightPhpApiUrl } from "@/lib/config";
import { signedPhpFetch } from "@/lib/signedPhpFetch";

const BASE_URL = highlightPhpApiUrl("ga");

/** GA Connections */
export async function getGAConnections(
  memberId: number,
  includeInactive = false
) {
  const res = await signedPhpFetch(`${BASE_URL}/get_connections.php`, {
    headers: {
      "X-Member-Id": String(memberId),
      ...(includeInactive ? { "X-Include-Inactive": "1" } : {}),
    },
    cache: "no-store",
  }, { memberId });
  // console.log("res:"+memberId+":"+res);

  const text = await res.text();
  // console.log("text:"+text);
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("Invalid JSON from GA connections API");
  }

  if (!res.ok || json?.ok === false) {
    throw new Error(json?.message || "GA connections failed");
  }

  return json.data;
}

export async function updateGAConnectionStatus(
  memberId: number,
  connectionId: number,
  status: 0 | 1
) {
  const body = JSON.stringify({ connection_id: connectionId, status });
  const res = await signedPhpFetch(`${BASE_URL}/update_connection_status.php`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Member-Id": String(memberId),
    },
    body,
  }, { memberId });

  const json = await res.json();
  if (!res.ok || !json?.ok) {
    throw new Error(json?.message || "Unable to update GA connection");
  }

  return json.data;
}

/** GA Query */
export async function gaQuery(
  memberId: number,
  params: {
    type: "daily" | "events" | "pages" | "sources" | "conversions";
    ids: number[];
    start: string;
    end: string;
  }
) {
  // console.log(params);
  const body = JSON.stringify(params);
  const res = await signedPhpFetch(`${BASE_URL}/get_query.php`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Member-Id": String(memberId),
    },
    body,
  }, { memberId });

  const text = await res.text();

  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("Invalid JSON from GA query API");
  }

  if (!res.ok || json?.ok === false) {
    throw new Error(json?.message || "GA query failed");
  }

  return json.data ?? json;
}

/** GA Report */
export async function getGaReportList(userId: number) {
  const body = JSON.stringify({ user_id: userId });
  const res = await signedPhpFetch(`${BASE_URL}/ga_report_list.php`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body,
  }, { memberId: userId });
// console.log(`${BASE_URL}/api/ga/ga_report_list.php`);
  const json = await res.json();
// console.log(json);
  if (!json.success) {
    throw new Error(json.message || "取得報表清單失敗");
  }

  return json.data || [];
}

export async function createGaReport(userId: number, payload: any) {
  const body = JSON.stringify({ user_id: userId, ...payload });
  const res = await signedPhpFetch(`${BASE_URL}/ga_report_save.php`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body,
  }, { memberId: userId });

  const rawText = await res.text();

  // console.log("report_save.php status =", res.status);
  // console.log("report_save.php raw =", rawText);

  let json: any;

  try {
    json = JSON.parse(rawText);
  } catch {
    throw new Error("報表儲存 API 回傳格式錯誤");
  }

  if (!res.ok || !json.success) {
    throw new Error(json?.message || "新增報表失敗");
  }

  return json;
}

export async function getGaReportDetail(user_id: number,id: number){
  const body = JSON.stringify({ user_id, id });
  const res = await signedPhpFetch(`${BASE_URL}/ga_report_detail.php`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body,
  }, { memberId: user_id });

  const result = await res.json();
  if (!res.ok) {
    throw new Error(result?.message || "讀取報表失敗");
  }

  return result;
}

export async function updateGaReport(
  userId: number,
  id: number,
  payload: any
) {
  const body = JSON.stringify({ user_id: userId, id, ...payload });
  const res = await signedPhpFetch(`${BASE_URL}/ga_report_update.php`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body,
  }, { memberId: userId });

  const result = await res.json();

  if (!res.ok || !result?.success) {
    throw new Error(result?.message || "更新失敗");
  }

  return result;
}
