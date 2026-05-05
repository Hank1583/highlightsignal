"use client";
import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/ga/PageHeader";
import SectionCard from "@/components/ga/SectionCard";
import { useGAConnections, useGaData } from "../dataSource";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

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

const PIE_COLORS = [
  "#2563eb",
  "#16a34a",
  "#9333ea",
  "#ea580c",
  "#dc2626",
  "#0891b2",
];

const CHANNEL_LABELS: Record<string, string> = {
  Direct: "直接流量",
  "Organic Search": "自然搜尋",
  "Paid Search": "付費搜尋",
  "Organic Social": "自然社群",
  "Paid Social": "付費社群",
  Referral: "推薦連結",
  Email: "電子郵件",
  Display: "多媒體廣告",
  Video: "影音流量",
  Affiliates: "聯盟行銷",
  Unassigned: "未分類",
  Other: "其他",
};

const DEVICE_LABELS: Record<string, string> = {
  desktop: "桌機",
  mobile: "手機",
  tablet: "平板",
  "smart tv": "智慧電視",
  other: "其他",
};

function translateChannel(value: string) {
  return CHANNEL_LABELS[value] || value;
}

function translateDevice(value: string) {
  return DEVICE_LABELS[value.toLowerCase()] || value;
}

export default function TrafficPage() {
  const [dateRange, setDateRange] = useState(getLastDays(30));
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

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

  const allIds = useMemo(() => gaConnections.map((x) => x.id), [gaConnections]);
  const activeIds = selectedIds.length ? selectedIds : allIds;

  const {
    gaTrafficSources = [],
    gaDailySummary = [],
    loading: dataLoading,
    error: dataError,
  } = useGaData({
    ids: activeIds,
    dateRange,
  });

  const loading = connectionsLoading || dataLoading;
  const error = connectionsError || dataError;

  const channelAgg = useMemo(() => {
    const byChannel: Record<
      string,
      {
        channel: string;
        sessions: number;
        users: number;
        conversions: number;
      }
    > = {};

    gaTrafficSources.forEach((row: any) => {
      const key = row.channel_group || "Other";

      if (!byChannel[key]) {
        byChannel[key] = {
          channel: translateChannel(key),
          sessions: 0,
          users: 0,
          conversions: 0,
        };
      }

      byChannel[key].sessions += safeNum(row.sessions);
      byChannel[key].users += safeNum(row.users);
      byChannel[key].conversions += safeNum(row.conversions);
    });

    return Object.values(byChannel).sort((a, b) => b.sessions - a.sessions);
  }, [gaTrafficSources]);

  const deviceAgg = useMemo(() => {
    const byDevice: Record<
      string,
      {
        device: string;
        sessions: number;
      }
    > = {};

    gaTrafficSources.forEach((row: any) => {
      const key = row.device || "Other";

      if (!byDevice[key]) {
        byDevice[key] = {
          device: translateDevice(key),
          sessions: 0,
        };
      }

      byDevice[key].sessions += safeNum(row.sessions);
    });

    return Object.values(byDevice).sort((a, b) => b.sessions - a.sessions);
  }, [gaTrafficSources]);

  const newVsReturning = useMemo(() => {
    let totalUsers = 0;
    let newUsers = 0;

    gaDailySummary.forEach((row: any) => {
      totalUsers += safeNum(row.users);
      newUsers += safeNum(row.new_users);
    });

    const returningUsers = Math.max(0, totalUsers - newUsers);

    return [
      { name: "新訪客", value: newUsers },
      { name: "回訪訪客", value: returningUsers },
    ];
  }, [gaDailySummary]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="流量來源"
        description="分析流量來源、裝置與新舊訪客結構"
      />

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
          載入流量資料中...
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
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <SectionCard
            title="流量來源"
            description={`${dateRange.start} ~ ${dateRange.end}`}
          >
            <div className="h-[340px]">
              {channelAgg.length === 0 ? (
                <div className="flex h-full items-center justify-center text-slate-400">
                  目前沒有流量來源資料
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={channelAgg}>
                    <XAxis dataKey="channel" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="sessions" name="工作階段" fill="#2563eb" />
                    <Bar dataKey="users" name="使用者" fill="#16a34a" />
                    <Bar dataKey="conversions" name="轉換" fill="#9333ea" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="裝置"
            description={`${dateRange.start} ~ ${dateRange.end}`}
          >
            <div className="h-[340px]">
              {deviceAgg.length === 0 ? (
                <div className="flex h-full items-center justify-center text-slate-400">
                  目前沒有裝置資料
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={deviceAgg}
                      dataKey="sessions"
                      nameKey="device"
                      outerRadius={110}
                      label
                    >
                      {deviceAgg.map((_, idx) => (
                        <Cell
                          key={idx}
                          fill={PIE_COLORS[idx % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="新訪客與回訪訪客"
            description={`${dateRange.start} ~ ${dateRange.end}`}
          >
            <div className="h-[340px]">
              {newVsReturning.every((x) => x.value === 0) ? (
                <div className="flex h-full items-center justify-center text-slate-400">
                  目前沒有新舊訪客資料
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={newVsReturning}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={110}
                      label
                    >
                      {newVsReturning.map((_, idx) => (
                        <Cell
                          key={idx}
                          fill={PIE_COLORS[idx % PIE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  );
}
