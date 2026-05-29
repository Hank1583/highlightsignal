"use client";

import {useCallback, useEffect, useMemo, useState } from "react";

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
  status?: string;
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

async function fetchConnections(): Promise<GAConnection[]> {
  const res = await fetch("/api/ga/connections", {
    credentials: "include",
    cache: "no-store",
  });

  const json = await res.json();

  if (!res.ok || !json?.ok) {
    throw new Error(json?.message || "fetchConnections failed");
  }

  return Array.isArray(json.data) ? json.data : [];
}

async function fetchQuery<T>(
  type: "daily" | "pages" | "sources" | "events" | "conversions",
  ids: number[],
  start: string,
  end: string
): Promise<T[]> {
  if (!ids.length) return [];

  const payload = { type, ids, start, end };
  // console.log("fetchQuery payload:", payload);

  const res = await fetch("/api/ga/query", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
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

export function useGAConnections() {
  const [gaConnections, setGaConnections] = useState<GAConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await fetchConnections();

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
  }, []);

  return {
    gaConnections,
    loading,
    error,
  };
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
            dateRange.end
          ),
          fetchQuery<GAPageRow>(
            "pages",
            stableIds,
            dateRange.start,
            dateRange.end
          ),
          fetchQuery<GATrafficSourceRow>(
            "sources",
            stableIds,
            dateRange.start,
            dateRange.end
          ),
          fetchQuery<GAEventRow>(
            "events",
            stableIds,
            dateRange.start,
            dateRange.end
          ),
          fetchQuery<GAConversionRow>(
            "conversions",
            stableIds,
            dateRange.start,
            dateRange.end
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
  }, [stableIds, dateRange.start, dateRange.end]);

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
  const [reportList, setReportList] = useState<GaReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchList = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/ga/report/list", {
        method: "GET",
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
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  return { reportList, loading, error, refresh: fetchList };
}

export function useGaReportSave() {
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
  }, []);

  return { saveReport, saving, error };
}

export function useGaReportDetail(id: number) {
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
  }, [id]);

  return { reportDetail, loading, error };
}

export function useGaReportUpdate() {
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
