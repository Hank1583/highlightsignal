"use client";

import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/components/ga/PageHeader";
import SectionCard from "@/components/ga/SectionCard";
import KpiCard from "@/components/ga/KpiCard";
import { useGAConnections, useGaData } from "../dataSource";

type DateRange = {
  start: string;
  end: string;
};

type StepSource = "summary" | "event" | "page" | "conversion";

type FunnelStep = {
  id: string;
  source: StepSource;
  key: string;
  label: string;
};

type StepOption = {
  source: StepSource;
  key: string;
  label: string;
  count: number;
};

const DEFAULT_STEPS: FunnelStep[] = [
  { id: "step-1", source: "summary", key: "sessions", label: "Sessions" },
  { id: "step-2", source: "summary", key: "pageviews", label: "Pageviews" },
  { id: "step-3", source: "summary", key: "events", label: "Events" },
  { id: "step-4", source: "summary", key: "conversions", label: "Conversions" },
];

function getLastDays(days: number): DateRange {
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

function safeNum(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-TW").format(Math.round(value));
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return "0%";
  return `${Math.round(value)}%`;
}

function optionValue(option: Pick<StepOption, "source" | "key">) {
  return JSON.stringify({ source: option.source, key: option.key });
}

function readOptionValue(value: string): Pick<StepOption, "source" | "key"> | null {
  try {
    const parsed = JSON.parse(value) as Pick<StepOption, "source" | "key">;
    if (
      (parsed.source === "summary" ||
        parsed.source === "event" ||
        parsed.source === "page" ||
        parsed.source === "conversion") &&
      typeof parsed.key === "string"
    ) {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
}

export default function FunnelPage() {
  const [dateRange, setDateRange] = useState<DateRange>(getLastDays(30));
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [steps, setSteps] = useState<FunnelStep[]>(DEFAULT_STEPS);
  const [autoFilled, setAutoFilled] = useState(false);

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
    gaDailySummary = [],
    gaEvents = [],
    gaPages = [],
    gaConversions = [],
    loading: dataLoading,
    error: dataError,
  } = useGaData({
    ids: activeIds,
    dateRange,
  });

  const loading = connectionsLoading || dataLoading;
  const error = connectionsError || dataError;

  const summaryCounts = useMemo(() => {
    const totals = new Map<string, number>([
      ["users", 0],
      ["sessions", 0],
      ["pageviews", 0],
      ["events", 0],
      ["new_users", 0],
      ["conversions", 0],
    ]);

    gaDailySummary.forEach((row) => {
      totals.set("users", (totals.get("users") || 0) + safeNum(row.users));
      totals.set("sessions", (totals.get("sessions") || 0) + safeNum(row.sessions));
      totals.set("pageviews", (totals.get("pageviews") || 0) + safeNum(row.pageviews));
      totals.set("events", (totals.get("events") || 0) + safeNum(row.events));
      totals.set("new_users", (totals.get("new_users") || 0) + safeNum(row.new_users));
    });

    gaConversions.forEach((row) => {
      totals.set("conversions", (totals.get("conversions") || 0) + safeNum(row.count));
    });

    return totals;
  }, [gaConversions, gaDailySummary]);

  const eventCounts = useMemo(() => {
    const byName = new Map<string, number>();

    gaEvents.forEach((row) => {
      const key = row.event_name || "(unknown)";
      byName.set(key, (byName.get(key) || 0) + safeNum(row.event_count));
    });

    return byName;
  }, [gaEvents]);

  const pageCounts = useMemo(() => {
    const byPath = new Map<string, number>();

    gaPages.forEach((row) => {
      const key = row.page_path || "(unknown)";
      byPath.set(key, (byPath.get(key) || 0) + safeNum(row.users || row.pageviews));
    });

    return byPath;
  }, [gaPages]);

  const conversionCounts = useMemo(() => {
    const byName = new Map<string, number>();

    gaConversions.forEach((row) => {
      const key = row.conversion_name || "(unknown)";
      byName.set(key, (byName.get(key) || 0) + safeNum(row.count));
    });

    return byName;
  }, [gaConversions]);

  const stepOptions = useMemo<StepOption[]>(() => {
    const summaryOptions: StepOption[] = [
      { source: "summary", key: "sessions", label: "Sessions", count: summaryCounts.get("sessions") || 0 },
      { source: "summary", key: "users", label: "Users", count: summaryCounts.get("users") || 0 },
      { source: "summary", key: "pageviews", label: "Pageviews", count: summaryCounts.get("pageviews") || 0 },
      { source: "summary", key: "events", label: "Events", count: summaryCounts.get("events") || 0 },
      { source: "summary", key: "new_users", label: "New Users", count: summaryCounts.get("new_users") || 0 },
      { source: "summary", key: "conversions", label: "Conversions", count: summaryCounts.get("conversions") || 0 },
    ];

    const eventOptions = Array.from(eventCounts.entries())
      .map(([key, count]) => ({
        source: "event" as const,
        key,
        label: key,
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    const pageOptions = Array.from(pageCounts.entries())
      .map(([key, count]) => ({
        source: "page" as const,
        key,
        label: key,
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    const conversionOptions = Array.from(conversionCounts.entries())
      .map(([key, count]) => ({
        source: "conversion" as const,
        key,
        label: key,
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    return [...summaryOptions, ...eventOptions, ...pageOptions, ...conversionOptions];
  }, [conversionCounts, eventCounts, pageCounts, summaryCounts]);

  useEffect(() => {
    if (autoFilled || stepOptions.length < 2) return;

    const hasDefaultData = DEFAULT_STEPS.some((step) => {
      const countMap =
        step.source === "summary"
          ? summaryCounts
          : step.source === "event"
            ? eventCounts
            : step.source === "page"
              ? pageCounts
              : conversionCounts;
      return (countMap.get(step.key) || 0) > 0;
    });

    if (hasDefaultData) {
      setAutoFilled(true);
      return;
    }

    setSteps(
      stepOptions.slice(0, Math.min(4, stepOptions.length)).map((option, index) => ({
        id: `step-${index + 1}`,
        source: option.source,
        key: option.key,
        label: option.label,
      }))
    );
    setAutoFilled(true);
  }, [autoFilled, conversionCounts, eventCounts, pageCounts, stepOptions, summaryCounts]);

  const funnelRows = useMemo(() => {
    let previous = 0;

    return steps.map((step, index) => {
      const countMap =
        step.source === "summary"
          ? summaryCounts
          : step.source === "event"
            ? eventCounts
            : step.source === "page"
              ? pageCounts
              : conversionCounts;
      const rawCount = countMap.get(step.key) || 0;
      const count = index === 0 ? rawCount : Math.min(previous, rawCount);
      const conversionRate = index === 0 || previous === 0 ? 100 : (count / previous) * 100;
      const dropOff = index === 0 ? 0 : Math.max(0, previous - count);
      const dropOffRate = index === 0 || previous === 0 ? 0 : (dropOff / previous) * 100;

      previous = count;

      return {
        ...step,
        rawCount,
        count,
        conversionRate,
        dropOff,
        dropOffRate,
      };
    });
  }, [conversionCounts, eventCounts, pageCounts, steps, summaryCounts]);

  const firstCount = funnelRows[0]?.count || 0;
  const lastCount = funnelRows[funnelRows.length - 1]?.count || 0;
  const totalConversionRate = firstCount > 0 ? (lastCount / firstCount) * 100 : 0;
  const biggestDrop = funnelRows.slice(1).sort((a, b) => b.dropOff - a.dropOff)[0];

  const updateStep = (id: string, value: string) => {
    const parsed = readOptionValue(value);
    if (!parsed) return;

    const option = stepOptions.find(
      (item) => item.source === parsed.source && item.key === parsed.key
    );

    setSteps((current) =>
      current.map((step) =>
        step.id === id
          ? {
              ...step,
              source: parsed.source,
              key: parsed.key,
              label: option?.label || parsed.key,
            }
          : step
      )
    );
  };

  const addStep = () => {
    const nextOption = stepOptions.find(
      (option) =>
        !steps.some((step) => step.source === option.source && step.key === option.key)
    );

    if (!nextOption) return;

    setSteps((current) => [
      ...current,
      {
        id: `step-${Date.now()}`,
        source: nextOption.source,
        key: nextOption.key,
        label: nextOption.label,
      },
    ]);
  };

  const removeStep = (id: string) => {
    setSteps((current) => current.filter((step) => step.id !== id));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="轉換漏斗"
        description="查看每個步驟的完成率、流失人數與整體轉換效率"
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
          載入漏斗資料中...
        </div>
      )}

      {error && (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center text-red-700 shadow-sm">
          {error}
        </div>
      )}

      {!loading && !error && gaConnections.length === 0 && (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
          目前尚未連接 GA 帳戶
        </div>
      )}

      {!loading && !error && gaConnections.length > 0 && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <KpiCard
              title="第一步人數"
              value={formatNumber(firstCount)}
              sub={funnelRows[0]?.label || "-"}
            />
            <KpiCard
              title="完成人數"
              value={formatNumber(lastCount)}
              sub={funnelRows[funnelRows.length - 1]?.label || "-"}
            />
            <KpiCard
              title="整體完成率"
              value={formatPercent(totalConversionRate)}
              sub={biggestDrop ? `最大流失：${biggestDrop.label}` : "-"}
            />
          </div>

          <SectionCard
            title="漏斗步驟"
            description={`${dateRange.start} ~ ${dateRange.end}`}
          >
            <div className="space-y-3">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-[72px_1fr_auto]"
                >
                  <div className="flex items-center text-sm font-black text-slate-500">
                    Step {index + 1}
                  </div>
                  <select
                    value={optionValue(step)}
                    onChange={(e) => updateStep(step.id, e.target.value)}
                    className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                  >
                    <optgroup label="摘要">
                      {stepOptions
                        .filter((option) => option.source === "summary")
                        .map((option) => (
                          <option key={optionValue(option)} value={optionValue(option)}>
                            {option.label}
                          </option>
                        ))}
                    </optgroup>
                    <optgroup label="事件">
                      {stepOptions
                        .filter((option) => option.source === "event")
                        .map((option) => (
                          <option key={optionValue(option)} value={optionValue(option)}>
                            {option.label}
                          </option>
                        ))}
                    </optgroup>
                    <optgroup label="頁面">
                      {stepOptions
                        .filter((option) => option.source === "page")
                        .map((option) => (
                          <option key={optionValue(option)} value={optionValue(option)}>
                            {option.label}
                          </option>
                        ))}
                    </optgroup>
                    <optgroup label="轉換">
                      {stepOptions
                        .filter((option) => option.source === "conversion")
                        .map((option) => (
                          <option key={optionValue(option)} value={optionValue(option)}>
                            {option.label}
                          </option>
                        ))}
                    </optgroup>
                  </select>
                  <button
                    type="button"
                    onClick={() => removeStep(step.id)}
                    disabled={steps.length <= 2}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    移除
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-4">
              <button
                type="button"
                onClick={addStep}
                disabled={stepOptions.length <= steps.length}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                新增步驟
              </button>
            </div>
          </SectionCard>

          <SectionCard title="漏斗視覺化" description="依目前可用彙總資料估算">
            {funnelRows.every((row) => row.count === 0) ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-400">
                目前步驟沒有可計算的資料
              </div>
            ) : (
              <div className="space-y-4">
                {funnelRows.map((row, index) => {
                  const width =
                    firstCount > 0 ? Math.max(8, (row.count / firstCount) * 100) : 0;

                  return (
                    <div key={row.id} className="space-y-2">
                      <div className="flex flex-wrap items-end justify-between gap-2">
                        <div>
                          <div className="text-sm font-black text-slate-900">
                            {index + 1}. {row.label}
                          </div>
                          <div className="mt-1 text-xs font-semibold text-slate-400">
                            {row.source === "summary"
                              ? "摘要"
                              : row.source === "event"
                                ? "事件"
                                : row.source === "page"
                                  ? "頁面"
                                  : "轉換"}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-black text-slate-900">
                            {formatNumber(row.count)}
                          </div>
                          <div className="text-xs font-semibold text-slate-400">
                            完成率 {formatPercent(row.conversionRate)}
                          </div>
                        </div>
                      </div>
                      <div className="h-12 overflow-hidden rounded-2xl bg-slate-100">
                        <div
                          className="flex h-full items-center justify-end rounded-2xl bg-blue-600 px-4 text-sm font-black text-white transition-all"
                          style={{ width: `${width}%` }}
                        >
                          {formatPercent(firstCount > 0 ? (row.count / firstCount) * 100 : 0)}
                        </div>
                      </div>
                      {index > 0 && (
                        <div className="text-xs font-semibold text-rose-600">
                          流失 {formatNumber(row.dropOff)}，流失率{" "}
                          {formatPercent(row.dropOffRate)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </SectionCard>

          <SectionCard title="步驟明細">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-black uppercase text-slate-400">
                    <th className="py-3 pr-4">步驟</th>
                    <th className="py-3 pr-4">來源</th>
                    <th className="py-3 pr-4 text-right">原始數量</th>
                    <th className="py-3 pr-4 text-right">漏斗人數</th>
                    <th className="py-3 pr-4 text-right">完成率</th>
                    <th className="py-3 text-right">流失率</th>
                  </tr>
                </thead>
                <tbody>
                  {funnelRows.map((row, index) => (
                    <tr key={row.id} className="border-b border-slate-100">
                      <td className="py-3 pr-4 font-bold text-slate-800">
                        {index + 1}. {row.label}
                      </td>
                      <td className="py-3 pr-4 text-slate-500">
                        {row.source === "summary"
                          ? "摘要"
                          : row.source === "event"
                            ? "事件"
                            : row.source === "page"
                              ? "頁面"
                              : "轉換"}
                      </td>
                      <td className="py-3 pr-4 text-right font-semibold text-slate-600">
                        {formatNumber(row.rawCount)}
                      </td>
                      <td className="py-3 pr-4 text-right font-semibold text-slate-600">
                        {formatNumber(row.count)}
                      </td>
                      <td className="py-3 pr-4 text-right font-semibold text-slate-600">
                        {formatPercent(row.conversionRate)}
                      </td>
                      <td className="py-3 text-right font-semibold text-rose-600">
                        {formatPercent(row.dropOffRate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </>
      )}
    </div>
  );
}
