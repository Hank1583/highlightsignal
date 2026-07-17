"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useWorkspace } from "@/components/workspace/WorkspaceProvider";
import type { Workspace } from "@/types/workspace";

/** =========================
 * Types
========================= */

export type DateRange = {
  start: string;
  end: string;
};

export type GAConnection = {
  id: number;
  account_name: string;
  property_id?: string | number;
  status?: string | number;
};

export type CurrentUser = {
  id: number;
  email?: string;
  name?: string;
  isDemo?: boolean;
};

export type GADailySummaryRow = {
  date: string;
  connection_id?: number;
  users: number;
  sessions: number;
  pageviews: number;
  events: number;
  new_users: number;
  avg_session_duration: number;
  bounce_rate: number;
};

export type GAPageRow = {
  connection_id?: number;
  page_path: string;
  page_title?: string;
  pageviews: number;
  users: number;
  avg_time?: number;
};

export type GATrafficSourceRow = {
  connection_id?: number;
  channel_group?: string;
  device?: string;
  sessions: number;
  users: number;
  conversions: number;
};

export type GAEventRow = {
  connection_id?: number;
  event_name: string;
  event_count: number;
};

export type GAConversionRow = {
  connection_id?: number;
  conversion_name: string;
  count: number;
  value: number;
};

export type GaReportRow = {
  id: number;
  report_name: string;
  report_type: "weekly" | "monthly";
  connection_ids: number[];
  connection_names?: string[];
  send_weekday: number | null;
  send_monthday: number | null;
  send_time: string;
  email_subject: string;
  email_list: string[];
  section_list: string[];
  is_active: number;
};

export type SaveReportPayload = {
  report_name: string;
  report_type: string;
  connection_ids: number[];
  send_weekday: number;
  send_monthday: number;
  send_time: string;
  email_subject: string;
  email_list: string[];
  section_list: string[];
  is_active: boolean;
};

/** =========================
 * API helpers
========================= */

async function fetchConnections(
  workspace: Workspace,
  includeInactive = false
): Promise<GAConnection[]> {
  const legacyUrl = includeInactive
    ? "/api/ga/connections?include_inactive=1"
    : "/api/ga/connections";
  const workspaceUrl =
    "/api/workspaces/" +
    workspace.id +
    "/integrations/ga" +
    (includeInactive ? "?include_inactive=1" : "");
  const url = workspace.source === "backend" ? workspaceUrl : legacyUrl;
  const res = await fetch(url, {
    credentials: "include",
    headers: { "X-Workspace-Id": String(workspace.id) },
    cache: "no-store",
  });

  const json = await res.json();

  if (!res.ok || !json?.ok) {
    if (
      workspace.source === "backend" &&
      (res.status === 404 || res.status === 502)
    ) {
      const fallback = await fetch(legacyUrl, {
        credentials: "include",
        headers: { "X-Workspace-Id": String(workspace.id) },
        cache: "no-store",
      });
      const fallbackJson = await fallback.json();
      if (fallback.ok && fallbackJson?.ok) {
        return Array.isArray(fallbackJson.data) ? fallbackJson.data : [];
      }
    }

    throw new Error(
      json?.error?.message || json?.message || "fetchConnections failed"
    );
  }

  return Array.isArray(json.data) ? json.data : [];
}

async function fetchQuery<T>(
  type: "daily" | "pages" | "sources" | "events" | "conversions",
  ids: number[],
  start: string,
  end: string,
  workspaceId: number
): Promise<T[]> {
  if (!ids.length) return [];

  const payload = { type, ids, start, end };
  // console.log("fetchQuery payload:", payload);

  const res = await fetch("/api/ga/query", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-Workspace-Id": String(workspaceId),
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json();
  // console.log(`fetchQuery response [${type}]:`, json);

  if (!res.ok || !json?.ok) {
    throw new Error(json?.message || `fetch ${type} failed`);
  }

  return Array.isArray(json.data) ? json.data : [];
}

/** =========================
 * Hook: Connections
========================= */

export function useGAConnections(options: { includeInactive?: boolean } = {}) {
  const { currentWorkspace } = useWorkspace();
  const [gaConnections, setGaConnections] = useState<GAConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const includeInactive = Boolean(options.includeInactive);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setGaConnections(
        await fetchConnections(currentWorkspace, includeInactive)
      );
    } catch (err: any) {
      setError(err?.message || "Unknown error");
      setGaConnections([]);
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace, includeInactive]);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await fetchConnections(currentWorkspace, includeInactive);

        if (!alive) return;
        setGaConnections(data);
      } catch (err: any) {
        if (!alive) return;
        setError(err?.message || "Unknown error");
        setGaConnections([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [currentWorkspace, includeInactive]);

  return {
    gaConnections,
    loading,
    error,
    refresh,
  };
}

export async function updateGAConnectionForWorkspace(
  workspace: Workspace,
  connectionId: number,
  status: 0 | 1
) {
  const legacyUrl = "/api/ga/connections";
  const workspaceUrl =
    "/api/workspaces/" + workspace.id + "/integrations/ga";
  const request = async (url: string) => {
    const response = await fetch(url, {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-Workspace-Id": String(workspace.id),
      },
      body: JSON.stringify({ connection_id: connectionId, status }),
    });
    const payload = await response.json();
    return { response, payload };
  };

  const primary = await request(
    workspace.source === "backend" ? workspaceUrl : legacyUrl
  );
  if (primary.response.ok && primary.payload?.ok) {
    return primary.payload.data;
  }

  if (
    workspace.source === "backend" &&
    (primary.response.status === 404 || primary.response.status === 502)
  ) {
    const fallback = await request(legacyUrl);
    if (fallback.response.ok && fallback.payload?.ok) {
      return fallback.payload.data;
    }
  }

  throw new Error(
    primary.payload?.error?.message ||
      primary.payload?.message ||
      "無法更新 GA 帳號狀態"
  );
}

/** =========================
 * Hook: Data
========================= */

export function useGaData({
  ids,
  dateRange,
}: {
  ids: number[];
  dateRange: DateRange;
}) {
  const { currentWorkspace } = useWorkspace();
  const [gaDailySummary, setGaDailySummary] = useState<GADailySummaryRow[]>([]);
  const [gaPages, setGaPages] = useState<GAPageRow[]>([]);
  const [gaTrafficSources, setGaTrafficSources] = useState<GATrafficSourceRow[]>(
    []
  );
  const [gaEvents, setGaEvents] = useState<GAEventRow[]>([]);
  const [gaConversions, setGaConversions] = useState<GAConversionRow[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const idsKey = ids.join(",");
  const stableIds = useMemo(
    () =>
      idsKey
        ? idsKey
            .split(",")
            .map((id) => Number(id))
            .filter((id) => Number.isFinite(id))
            .sort((a, b) => a - b)
        : [],
    [idsKey]
  );

  useEffect(() => {
    let alive = true;

    if (!stableIds.length || !dateRange.start || !dateRange.end) {
      setGaDailySummary([]);
      setGaPages([]);
      setGaTrafficSources([]);
      setGaEvents([]);
      setGaConversions([]);
      return;
    }

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const [daily, pages, sources, events, conversions] = await Promise.all([
        // const [daily, pages, sources, events] = await Promise.all([
          fetchQuery<GADailySummaryRow>(
            "daily",
            stableIds,
            dateRange.start,
            dateRange.end,
            currentWorkspace.id
          ),
          fetchQuery<GAPageRow>(
            "pages",
            stableIds,
            dateRange.start,
            dateRange.end,
            currentWorkspace.id
          ),
          fetchQuery<GATrafficSourceRow>(
            "sources",
            stableIds,
            dateRange.start,
            dateRange.end,
            currentWorkspace.id
          ),
          fetchQuery<GAEventRow>(
            "events",
            stableIds,
            dateRange.start,
            dateRange.end,
            currentWorkspace.id
          ),
          fetchQuery<GAConversionRow>(
            "conversions",
            stableIds,
            dateRange.start,
            dateRange.end,
            currentWorkspace.id
          ),
        ]);

        if (!alive) return;

        setGaDailySummary(daily);
        setGaPages(pages);
        setGaTrafficSources(sources);
        setGaEvents(events);
        setGaConversions(conversions);
      } catch (err: any) {
        if (!alive) return;
        setError(err?.message || "Unknown error");

        setGaDailySummary([]);
        setGaPages([]);
        setGaTrafficSources([]);
        setGaEvents([]);
        setGaConversions([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [stableIds, dateRange.start, dateRange.end, currentWorkspace.id]);

  return {
    gaDailySummary,
    gaPages,
    gaTrafficSources,
    gaEvents,
    gaConversions,
    loading,
    error,
  };
}

export function useGaReportList() {
  const { currentWorkspace } = useWorkspace();
  const [reportList, setReportList] = useState<GaReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchList = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/ga/report/list", {
        method: "GET",
        headers: { "X-Workspace-Id": String(currentWorkspace.id) },
        cache: "no-store",
      });

      const json = await res.json();

      if (!json.ok) {
        throw new Error(json.message || "讀取報表清單失敗");
      }

      setReportList(json.data || []);
    } catch (err: any) {
      setReportList([]);
      setError(err.message || "讀取報表清單失敗");
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace.id]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  return { reportList, loading, error, refresh: fetchList };
}

export function useGaReportSave() {
  const { currentWorkspace } = useWorkspace();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const saveReport = useCallback(async (payload: SaveReportPayload) => {
    try {
      setSaving(true);
      setError("");

      const res = await fetch("/api/ga/report/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Workspace-Id": String(currentWorkspace.id),
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json.message || "儲存失敗");
      }

      return json.data;
    } catch (err: any) {
      const message = err.message || "儲存失敗";
      setError(message);
      throw err;
    } finally {
      setSaving(false);
    }
  }, [currentWorkspace.id]);

  return { saveReport, saving, error };
}

export function useGaReportDetail(id: number) {
  const { currentWorkspace } = useWorkspace();
  const [reportDetail, setReportDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await fetch("/api/ga/report/detail", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Workspace-Id": String(currentWorkspace.id),
          },
          body: JSON.stringify({
            id,
          }),
        });

        const result = await res.json();

        if (!res.ok || !result.success) {
          throw new Error(result.message || "讀取報表失敗");
        }

        setReportDetail(result.data);
      } catch (err: any) {
        setError(err.message || "讀取報表失敗");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, currentWorkspace.id]);

  return { reportDetail, loading, error };
}

export function useGaReportUpdate() {
  const { currentWorkspace } = useWorkspace();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const updateReport = async (id: number, payload: any) => {
    try {
      setSaving(true);
      setError("");

      const res = await fetch("/api/ga/report/update", {
        method: "POST", // 或 PUT，都可以，但 POST 最常見
        headers: {
          "Content-Type": "application/json",
          "X-Workspace-Id": String(currentWorkspace.id),
        },
        body: JSON.stringify({
          id,
          ...payload,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        throw new Error(data?.message || "更新失敗");
      }

      return data;
    } catch (err: any) {
      setError(err.message || "更新失敗");
      throw err;
    } finally {
      setSaving(false);
    }
  };

  return { updateReport, saving, error };
}

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/auth/me", {
          credentials: "include",
          cache: "no-store",
        });
        const json = await res.json();

        if (!alive) return;
        setUser(res.ok && json?.ok ? json.data : null);
      } catch {
        if (!alive) return;
        setUser(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  return { user, loading };
}
