"use client";
import Link from "next/link";
import { useMemo, useState, useEffect } from "react";
import PageHeader from "@/components/ga/PageHeader";
import KpiCard from "@/components/ga/KpiCard";
import SectionCard from "@/components/ga/SectionCard";
import { highlightPhpApiUrl } from "@/lib/config";
import { useGAConnections, useGaData } from "../ga/dataSource";

function getLastDays(days: number) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days + 1);

  const format = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  return {
    start: format(start),
    end: format(end),
  };
}

function safeNum(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function avg(sum: number, count: number) {
  return sum / Math.max(1, count);
}

function calcGrowth(curr: number, prev: number) {
  const c = safeNum(curr);
  const p = safeNum(prev);
  if (!p) return null;
  return ((c - p) / p) * 100;
}

function formatPct(v: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "0%";
  return `${Math.round(n * 100)}%`;
}

export default function DashboardPage() {
  const [user, setUser] = useState<{ id: number } | null>(null);
  const [dateRange, setDateRange] = useState(getLastDays(30));
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const accountFetchLink = user?.id
  ? highlightPhpApiUrl(`ga/account_fetch.php?member_id=${user.id}`)
  : null;
  const {
    gaConnections,
    loading: connectionsLoading,
    error: connectionsError,
  } = useGAConnections();

  useEffect(() => {
    if (gaConnections.length > 0 && selectedIds.length === 0) {
      setSelectedIds(gaConnections.map((x) => x.id));
    }
  }, [gaConnections, selectedIds.length]);

  useEffect(() => {
    let alive = true;

    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((res) => {
        if (!alive) return;
        if (res?.ok && res?.data?.id) {
          setUser(res.data);
        }
      })
      .catch(() => {});

    return () => {
      alive = false;
    };
  }, []);

  const allIds = useMemo(() => gaConnections.map((x) => x.id), [gaConnections]);
  const activeIds = selectedIds.length ? selectedIds : allIds;

  const {
    gaDailySummary,
    gaTrafficSources,
    loading: dataLoading,
    error: dataError,
  } = useGaData({
    ids: activeIds,
    dateRange,
  });

  const loading = connectionsLoading || dataLoading;
  const error = connectionsError || dataError;
  const hasNoSyncedData =
    !loading && !error && gaConnections.length > 0 && gaDailySummary.length === 0;

  const totalOverview = useMemo(() => {
    const acc = {
      users: 0,
      sessions: 0,
      pageviews: 0,
      events: 0,
      new_users: 0,
      avg_session_duration_sum: 0,
      bounce_rate_sum: 0,
      days: 0,
    };

    gaDailySummary.forEach((r) => {
      acc.users += safeNum(r.users);
      acc.sessions += safeNum(r.sessions);
      acc.pageviews += safeNum(r.pageviews);
      acc.events += safeNum(r.events);
      acc.new_users += safeNum(r.new_users);
      acc.avg_session_duration_sum += safeNum(r.avg_session_duration);
      acc.bounce_rate_sum += safeNum(r.bounce_rate);
      acc.days += 1;
    });

    return {
      users: acc.users,
      sessions: acc.sessions,
      pageviews: acc.pageviews,
      events: acc.events,
      new_users: acc.new_users,
      avg_session_duration: avg(acc.avg_session_duration_sum, acc.days),
      bounce_rate: avg(acc.bounce_rate_sum, acc.days),
    };
  }, [gaDailySummary]);

  const growthPack = useMemo(() => {
    const rows = [...gaDailySummary].sort((a, b) => a.date.localeCompare(b.date));

    if (rows.length < 4) {
      return {
        sessionsGrowth: null,
        usersGrowth: null,
        pageviewsGrowth: null,
        bounceGrowth: null,
      };
    }

    const mid = Math.floor(rows.length / 2);
    const prev = rows.slice(0, mid);
    const curr = rows.slice(mid);

    const sumBlock = (block: any[]) => {
      let sessions = 0;
      let users = 0;
      let pageviews = 0;
      let bounceSum = 0;
      let days = 0;

      block.forEach((r) => {
        sessions += safeNum(r.sessions);
        users += safeNum(r.users);
        pageviews += safeNum(r.pageviews);
        bounceSum += safeNum(r.bounce_rate);
        days += 1;
      });

      return {
        sessions,
        users,
        pageviews,
        bounce_rate: avg(bounceSum, days),
      };
    };

    const p = sumBlock(prev);
    const c = sumBlock(curr);

    return {
      sessionsGrowth: calcGrowth(c.sessions, p.sessions),
      usersGrowth: calcGrowth(c.users, p.users),
      pageviewsGrowth: calcGrowth(c.pageviews, p.pageviews),
      bounceGrowth: calcGrowth(c.bounce_rate, p.bounce_rate),
    };
  }, [gaDailySummary]);

  const channelAgg = useMemo(() => {
    const byChannel: Record<string, { channel: string; sessions: number }> = {};

    gaTrafficSources.forEach((r) => {
      const key = r.channel_group || "Other";
      if (!byChannel[key]) {
        byChannel[key] = { channel: key, sessions: 0 };
      }
      byChannel[key].sessions += safeNum(r.sessions);
    });

    return Object.values(byChannel).sort((a, b) => b.sessions - a.sessions);
  }, [gaTrafficSources]);

  const deviceAgg = useMemo(() => {
    const byDevice: Record<string, { device: string; sessions: number }> = {};

    gaTrafficSources.forEach((r) => {
      const key = r.device || "Other";
      if (!byDevice[key]) {
        byDevice[key] = { device: key, sessions: 0 };
      }
      byDevice[key].sessions += safeNum(r.sessions);
    });

    return Object.values(byDevice).sort((a, b) => b.sessions - a.sessions);
  }, [gaTrafficSources]);

  const topChannel = channelAgg[0]?.channel ?? null;
  const topDevice = deviceAgg[0]?.device ?? null;

  const insights = useMemo(() => {
    const out: {
      title: string;
      message: string;
      className: string;
    }[] = [];

    if (growthPack.sessionsGrowth !== null) {
      if (growthPack.sessionsGrowth >= 10) {
        out.push({
          title: "流量成長",
          message: `Sessions 成長 ${Math.round(
            growthPack.sessionsGrowth
          )}%，近期流量提升明顯。`,
          className:
            "rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800",
        });
      } else if (growthPack.sessionsGrowth <= -10) {
        out.push({
          title: "流量下滑",
          message: `Sessions 下滑 ${Math.abs(
            Math.round(growthPack.sessionsGrowth)
          )}%，建議檢查近期投放或流量來源變化。`,
          className:
            "rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800",
        });
      }
    }

    const newUserRatio =
      totalOverview.users > 0
        ? totalOverview.new_users / totalOverview.users
        : 0;

    if (newUserRatio >= 0.6) {
      out.push({
        title: "新用戶比例偏高",
        message: "新用戶比例偏高，建議持續追蹤回訪、留存與轉換表現。",
        className:
          "rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800",
      });
    }

    if (topChannel || topDevice) {
      out.push({
        title: "主要來源與裝置",
        message: `目前主要流量來源為 ${topChannel || "—"}，主要裝置為 ${
          topDevice || "—"
        }。`,
        className:
          "rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700",
      });
    }

    if (!out.length) {
      out.push({
        title: "數據穩定",
        message: "目前沒有明顯異常波動，建議持續觀察。",
        className:
          "rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700",
      });
    }

    return out;
  }, [growthPack, totalOverview, topChannel, topDevice]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="總覽 Dashboard"
        description="快速查看流量、成長與整體網站表現"
      />
      <div className="flex flex-wrap gap-3">
        {accountFetchLink && (
          <a
            href={accountFetchLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-2xl bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-700"
          >
            ＋ 新增 GA 帳號
          </a>
        )}
      </div>
      
      <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold"
            onClick={() => setDateRange(getLastDays(7))}
          >
            最近 7 天
          </button>
          <button
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold"
            onClick={() => setDateRange(getLastDays(30))}
          >
            最近 30 天
          </button>
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) =>
              setDateRange((d) => ({ ...d, start: e.target.value }))
            }
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) =>
              setDateRange((d) => ({ ...d, end: e.target.value }))
            }
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {gaConnections.map((ga) => {
            const checked = selectedIds.includes(ga.id);

            return (
              <label
                key={ga.id}
                className={[
                  "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-semibold",
                  checked
                    ? "border-blue-300 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-white text-slate-600",
                ].join(" ")}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    setSelectedIds((prev) =>
                      prev.includes(ga.id)
                        ? prev.filter((x) => x !== ga.id)
                        : [...prev, ga.id]
                    );
                  }}
                />
                {ga.account_name}
              </label>
            );
          })}
        </div>
      </div>

      {loading && (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
          載入 GA 資料中...
        </div>
      )}

      {error && (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center text-red-700 shadow-sm">
          {error}
        </div>
      )}

      {!loading && !error && gaConnections.length === 0 && (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
          目前沒有可用的 GA 帳號
        </div>
      )}

      {!loading && !error && gaConnections.length > 0 && (
        <>
          {hasNoSyncedData && (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
              <div className="text-base font-extrabold text-amber-900">
                目前查不到這個區間的 GA 資料
              </div>
              <p className="mt-2 text-sm font-medium text-amber-800">
                可能是新增 GA 帳號後還沒有同步歷史資料，或目前選擇的日期區間尚未寫入 DB。請到帳號管理選擇日期區間後按「同步到 DB」。
              </p>
              <Link
                href="/ga/account"
                className="mt-4 inline-flex items-center rounded-2xl bg-amber-900 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-amber-800"
              >
                前往帳號管理同步資料
              </Link>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              title="Total Users"
              value={totalOverview.users}
              sub={`${dateRange.start} ~ ${dateRange.end}`}
            />
            <KpiCard
              title="Sessions"
              value={totalOverview.sessions}
              sub={`${dateRange.start} ~ ${dateRange.end}`}
            />
            <KpiCard
              title="Pageviews"
              value={totalOverview.pageviews}
              sub={`${dateRange.start} ~ ${dateRange.end}`}
            />
            <KpiCard
              title="Bounce Rate"
              value={formatPct(totalOverview.bounce_rate)}
              sub="依目前區間平均"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <SectionCard title="Growth" description="流量與使用者成長表現">
              <div className="space-y-3 text-sm text-slate-600">
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <span>Sessions</span>
                  <span className="font-bold text-emerald-600">
                    {growthPack.sessionsGrowth === null
                      ? "—"
                      : `${Math.round(growthPack.sessionsGrowth)}%`}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <span>Users</span>
                  <span className="font-bold text-emerald-600">
                    {growthPack.usersGrowth === null
                      ? "—"
                      : `${Math.round(growthPack.usersGrowth)}%`}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <span>Pageviews</span>
                  <span className="font-bold text-emerald-600">
                    {growthPack.pageviewsGrowth === null
                      ? "—"
                      : `${Math.round(growthPack.pageviewsGrowth)}%`}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <span>Bounce Rate</span>
                  <span className="font-bold text-emerald-600">
                    {growthPack.bounceGrowth === null
                      ? "—"
                      : `${Math.round(growthPack.bounceGrowth)}%`}
                  </span>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="重點洞察" description="摘要結論">
              <div className="space-y-3">
                {insights.map((item) => (
                  <div key={item.title} className={item.className}>
                    <div className="font-bold">{item.title}</div>
                    <div className="mt-1">{item.message}</div>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>
        </>
      )}
    </div>
  );
}
