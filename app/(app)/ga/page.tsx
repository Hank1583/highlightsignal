"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, Database, RotateCcw, Sparkles, Target } from "lucide-react";
import PageHeader from "@/components/ga/PageHeader";
import KpiCard from "@/components/ga/KpiCard";
import SectionCard from "@/components/ga/SectionCard";
import { useGAConnections, useGaData } from "../ga/dataSource";
import { useWorkspace } from "@/components/workspace/WorkspaceProvider";

function getLastDays(days: number) {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days + 1);
  const format = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return { start: format(start), end: format(end) };
}

function safeNum(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function avg(sum: number, count: number) {
  return sum / Math.max(1, count);
}

function calcGrowth(curr: number, prev: number) {
  if (!prev) return null;
  return ((curr - prev) / prev) * 100;
}

function formatPct(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatGrowth(value: number | null) {
  if (value === null) return "尚無足夠資料";
  return `${value > 0 ? "+" : ""}${Math.round(value)}%`;
}

export default function GaPage() {
  const { currentWorkspace } = useWorkspace();
  const [user, setUser] = useState<{ id: number; isDemo?: boolean } | null>(null);
  const [dateRange, setDateRange] = useState(getLastDays(30));
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [connectionMessage, setConnectionMessage] = useState<string | null>(null);
  const [reviewDecision, setReviewDecision] = useState<"approve" | "revise" | "dismiss" | null>(null);
  const isDemo = Boolean(user?.isDemo);
  const accountFetchLink = user?.id && !isDemo ? `/api/ga/account-link?workspace_id=${currentWorkspace.id}` : null;

  const {
    gaConnections,
    loading: connectionsLoading,
    error: connectionsError,
  } = useGAConnections();

  useEffect(() => {
    // A previous Workspace's connection ids must never carry over into the
    // active-ids query for the newly selected Workspace.
    setSelectedIds([]);
  }, [currentWorkspace.id]);

  useEffect(() => {
    if (gaConnections.length > 0 && selectedIds.length === 0) {
      setSelectedIds(gaConnections.map((item) => item.id));
    }
  }, [gaConnections, selectedIds.length]);

  useEffect(() => {
    let alive = true;
    fetch("/api/auth/me", { credentials: "include" })
      .then((response) => response.json())
      .then((result) => {
        if (alive && result?.ok && result?.data?.id) setUser(result.data);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("connected") !== "1") return;
    setConnectionMessage("GA 帳號已連接，請到 GA 帳號管理頁同步資料。");
    url.searchParams.delete("connected");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);

  const allIds = useMemo(() => gaConnections.map((item) => item.id), [gaConnections]);
  const activeIds = selectedIds.length ? selectedIds : allIds;
  const {
    gaDailySummary,
    gaTrafficSources,
    loading: dataLoading,
    error: dataError,
  } = useGaData({ ids: activeIds, dateRange });

  const loading = connectionsLoading || dataLoading;
  const error = connectionsError || dataError;
  const hasNoSyncedData = !loading && !error && gaConnections.length > 0 && gaDailySummary.length === 0;

  const totalOverview = useMemo(() => {
    const acc = {
      users: 0,
      sessions: 0,
      pageviews: 0,
      events: 0,
      newUsers: 0,
      avgSessionDurationSum: 0,
      bounceRateSum: 0,
      days: 0,
    };

    gaDailySummary.forEach((row) => {
      acc.users += safeNum(row.users);
      acc.sessions += safeNum(row.sessions);
      acc.pageviews += safeNum(row.pageviews);
      acc.events += safeNum(row.events);
      acc.newUsers += safeNum(row.new_users);
      acc.avgSessionDurationSum += safeNum(row.avg_session_duration);
      acc.bounceRateSum += safeNum(row.bounce_rate);
      acc.days += 1;
    });

    return {
      users: acc.users,
      sessions: acc.sessions,
      pageviews: acc.pageviews,
      events: acc.events,
      newUsers: acc.newUsers,
      avgSessionDuration: avg(acc.avgSessionDurationSum, acc.days),
      bounceRate: avg(acc.bounceRateSum, acc.days),
    };
  }, [gaDailySummary]);

  const growthPack = useMemo(() => {
    const rows = [...gaDailySummary].sort((a, b) => a.date.localeCompare(b.date));
    if (rows.length < 4) {
      return { sessionsGrowth: null, usersGrowth: null, pageviewsGrowth: null, bounceGrowth: null };
    }

    const mid = Math.floor(rows.length / 2);
    const sumBlock = (block: typeof rows) =>
      block.reduce(
        (sum, row) => ({
          sessions: sum.sessions + safeNum(row.sessions),
          users: sum.users + safeNum(row.users),
          pageviews: sum.pageviews + safeNum(row.pageviews),
          bounceRate: sum.bounceRate + safeNum(row.bounce_rate),
          days: sum.days + 1,
        }),
        { sessions: 0, users: 0, pageviews: 0, bounceRate: 0, days: 0 }
      );

    const prev = sumBlock(rows.slice(0, mid));
    const curr = sumBlock(rows.slice(mid));
    return {
      sessionsGrowth: calcGrowth(curr.sessions, prev.sessions),
      usersGrowth: calcGrowth(curr.users, prev.users),
      pageviewsGrowth: calcGrowth(curr.pageviews, prev.pageviews),
      bounceGrowth: calcGrowth(avg(curr.bounceRate, curr.days), avg(prev.bounceRate, prev.days)),
    };
  }, [gaDailySummary]);

  const channelAgg = useMemo(() => {
    const byChannel: Record<string, { channel: string; sessions: number }> = {};
    gaTrafficSources.forEach((row) => {
      const key = row.channel_group || "Other";
      byChannel[key] ||= { channel: key, sessions: 0 };
      byChannel[key].sessions += safeNum(row.sessions);
    });
    return Object.values(byChannel).sort((a, b) => b.sessions - a.sessions);
  }, [gaTrafficSources]);

  const deviceAgg = useMemo(() => {
    const byDevice: Record<string, { device: string; sessions: number }> = {};
    gaTrafficSources.forEach((row) => {
      const key = row.device || "Other";
      byDevice[key] ||= { device: key, sessions: 0 };
      byDevice[key].sessions += safeNum(row.sessions);
    });
    return Object.values(byDevice).sort((a, b) => b.sessions - a.sessions);
  }, [gaTrafficSources]);

  const topChannel = channelAgg[0]?.channel ?? "尚無資料";
  const topDevice = deviceAgg[0]?.device ?? "尚無資料";
  const newUserRatio = totalOverview.users > 0 ? totalOverview.newUsers / totalOverview.users : 0;

  const primaryRecommendation = useMemo(() => {
    const growth = growthPack.sessionsGrowth;
    if (growth !== null && growth <= -10) {
      return {
        summary: "Sessions 明顯下滑，建議優先檢查主要流量來源。",
        recommendation: "前往流量來源分析，確認是否有廣告、SEO 或 referral 來源異常。",
        impact: "若高意圖來源同步下滑，可能直接影響 leads 與後續轉換。",
        risk: "流量下滑若未即時確認來源，後續會更難判斷是活動結束、技術問題或市場需求變化。",
        href: "/ga/traffic",
      };
    }

    if (newUserRatio >= 0.6) {
      return {
        summary: "新使用者占比偏高，回訪與轉換訊號需要一起檢查。",
        recommendation: "查看漏斗與轉換事件，確認新流量是否有形成有效互動。",
        impact: "若新使用者很多但轉換不足，代表導流品質或頁面承接可能需要調整。",
        risk: "只看流量成長容易誤判成效，需要搭配轉換與回訪指標判斷。",
        href: "/ga/funnel",
      };
    }

    return {
      summary: "目前流量資料穩定，可以進一步觀察成長與轉換品質。",
      recommendation: "持續追蹤 Sessions、Users、Pageviews 與 Bounce Rate 的變化。",
      impact: "穩定的網站成效基準可以協助決策中心判斷 SEO 與 AI 能見度改善是否真的帶來商業影響。",
      risk: "若沒有定期檢查趨勢，可能錯過來源品質下降或轉換率惡化的早期訊號。",
      href: "/ga/trend",
    };
  }, [growthPack.sessionsGrowth, newUserRatio]);

  return (
    <div className="space-y-6">
      {connectionMessage ? (
        <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
          {connectionMessage}
        </div>
      ) : null}

      <PageHeader
        title="網站成效"
        description="整理 Google Analytics 的流量、使用者、頁面與轉換訊號，協助判斷網站成效是否正在改善。"
        right={
          isDemo ? (
            <button type="button" disabled className="rounded-2xl bg-slate-200 px-4 py-2 text-sm font-bold text-slate-500">
              Demo 帳號無法連接 GA
            </button>
          ) : accountFetchLink ? (
            <a href={accountFetchLink} className="rounded-2xl bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-700">
              連接 GA 帳號
            </a>
          ) : null
        }
      />

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <button type="button" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold" onClick={() => setDateRange(getLastDays(7))}>
            最近 7 天
          </button>
          <button type="button" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold" onClick={() => setDateRange(getLastDays(30))}>
            最近 30 天
          </button>
          <input type="date" value={dateRange.start} onChange={(event) => setDateRange((current) => ({ ...current, start: event.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
          <input type="date" value={dateRange.end} onChange={(event) => setDateRange((current) => ({ ...current, end: event.target.value }))} className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {gaConnections.map((connection) => {
            const checked = selectedIds.includes(connection.id);
            return (
              <label
                key={connection.id}
                className={[
                  "inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-semibold",
                  checked ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-600",
                ].join(" ")}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    setSelectedIds((current) =>
                      current.includes(connection.id)
                        ? current.filter((id) => id !== connection.id)
                        : [...current, connection.id]
                    );
                  }}
                />
                {connection.account_name}
              </label>
            );
          })}
        </div>
      </section>

      {loading ? <Notice text="正在載入 GA 資料..." /> : null}
      {error ? <Notice tone="error" text={error} /> : null}
      {!loading && !error && gaConnections.length === 0 ? <Notice text="目前沒有可用的 GA 帳號，請先連接 GA 資料來源。" /> : null}

      {!loading && !error && gaConnections.length > 0 ? (
        <>
          <section className="rounded-3xl border border-blue-100 bg-blue-50/70 p-6">
            <div className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-blue-700">AI Summary</p>
                <h2 className="mt-2 text-2xl font-black text-slate-950">{primaryRecommendation.summary}</h2>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  分析區間：{dateRange.start} 到 {dateRange.end}。系統會以 GA 資料判斷流量、來源與轉換品質。
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="grid gap-5 lg:grid-cols-[1fr_280px] lg:items-center">
              <div>
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-violet-700">
                  <Target className="h-4 w-4" />
                  Top Recommendation
                </div>
                <h2 className="mt-3 text-xl font-black text-slate-950">{primaryRecommendation.recommendation}</h2>
                <p className="mt-2 text-sm leading-7 text-slate-600">{primaryRecommendation.impact}</p>
              </div>
              <Link href={primaryRecommendation.href} className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-black text-white hover:bg-violet-700">
                查看分析
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard title="Total Users" value={totalOverview.users.toLocaleString()} sub={`${dateRange.start} ~ ${dateRange.end}`} />
            <KpiCard title="Sessions" value={totalOverview.sessions.toLocaleString()} sub={formatGrowth(growthPack.sessionsGrowth)} />
            <KpiCard title="Pageviews" value={totalOverview.pageviews.toLocaleString()} sub={formatGrowth(growthPack.pageviewsGrowth)} />
            <KpiCard title="Bounce Rate" value={formatPct(totalOverview.bounceRate)} sub={formatGrowth(growthPack.bounceGrowth)} />
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-500">
              <Database className="h-4 w-4" />
              Evidence
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <Evidence label="主要流量來源" value={topChannel} sub="依 sessions 排序" />
              <Evidence label="主要裝置" value={topDevice} sub="依 sessions 排序" />
              <Evidence label="新使用者占比" value={formatPct(newUserRatio)} sub="new users / users" />
            </div>
          </section>

          <section className="rounded-3xl border border-amber-200 bg-amber-50/70 p-6">
            <p className="text-xs font-black uppercase tracking-wide text-amber-700">Business Impact</p>
            <h2 className="mt-2 text-lg font-black text-slate-950">{primaryRecommendation.risk}</h2>
          </section>

          <section className="rounded-3xl bg-slate-950 p-6 text-white">
            <p className="text-xs font-black uppercase tracking-wide text-blue-300">Human Review</p>
            <h2 className="mt-2 text-xl font-black">是否同意這個網站成效判斷？</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              <ReviewButton active={reviewDecision === "approve"} onClick={() => setReviewDecision("approve")} label="同意建議" icon={<Check className="h-4 w-4" />} />
              <ReviewButton active={reviewDecision === "revise"} onClick={() => setReviewDecision("revise")} label="需要調整" icon={<RotateCcw className="h-4 w-4" />} />
              <ReviewButton active={reviewDecision === "dismiss"} onClick={() => setReviewDecision("dismiss")} label="先略過" />
            </div>
          </section>

          {hasNoSyncedData ? (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
              <div className="text-base font-extrabold text-amber-900">尚未找到已同步的 GA 資料</div>
              <p className="mt-2 text-sm font-medium text-amber-800">
                GA 帳號已存在，但目前查不到同步後的資料。請到 GA 帳號管理頁執行資料同步。
              </p>
              <Link href="/ga/account" className="mt-4 inline-flex items-center rounded-2xl bg-amber-900 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-amber-800">
                前往同步資料
              </Link>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <SectionCard title="Growth" description="比較目前區間前後半段的變化。">
              <div className="space-y-3 text-sm text-slate-600">
                <GrowthRow label="Sessions" value={growthPack.sessionsGrowth} />
                <GrowthRow label="Users" value={growthPack.usersGrowth} />
                <GrowthRow label="Pageviews" value={growthPack.pageviewsGrowth} />
                <GrowthRow label="Bounce Rate" value={growthPack.bounceGrowth} />
              </div>
            </SectionCard>

            <SectionCard title="洞察摘要" description="用 GA 資料快速定位需要追蹤的成效訊號。">
              <div className="space-y-3 text-sm text-slate-600">
                <Insight title="主要來源" text={`目前 sessions 最多的來源是 ${topChannel}。`} />
                <Insight title="主要裝置" text={`目前 sessions 最多的裝置是 ${topDevice}。`} />
                <Insight title="新客比例" text={`新使用者占比為 ${formatPct(newUserRatio)}。`} />
              </div>
            </SectionCard>
          </div>
        </>
      ) : null}
    </div>
  );
}

function Notice({ text, tone = "default" }: { text: string; tone?: "default" | "error" }) {
  return (
    <div className={`rounded-3xl border p-8 text-center shadow-sm ${tone === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-slate-200 bg-white text-slate-500"}`}>
      {text}
    </div>
  );
}

function Evidence({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-sm font-bold text-slate-600">{label}</p>
      <p className="mt-2 text-xl font-black text-slate-950">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{sub}</p>
    </div>
  );
}

function ReviewButton({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black ${
        active ? "bg-emerald-500 text-white" : "bg-white text-slate-950"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function GrowthRow({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
      <span>{label}</span>
      <span className={`font-bold ${value !== null && value < 0 ? "text-rose-600" : "text-emerald-600"}`}>
        {formatGrowth(value)}
      </span>
    </div>
  );
}

function Insight({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="font-bold text-slate-900">{title}</div>
      <div className="mt-1 text-slate-600">{text}</div>
    </div>
  );
}
