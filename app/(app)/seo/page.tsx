"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  Monitor,
  Plus,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import type { SeoSite, SeoSummaryResponse } from "@/lib/seo/types";
import AddSeoSiteDialog from "@/components/seo/AddSeoSiteDialog";
import { formatAnalysisDate } from "@/lib/formatAnalysisDate";
import { useWorkspace } from "@/components/workspace/WorkspaceProvider";
import { workspaceHeaders } from "@/lib/workspaceFetch";

type SummaryData = SeoSummaryResponse["data"];
type PageSpeedStrategy = "mobile" | "desktop";
type PageSpeedMetric = {
  id: string;
  label: string;
  value: string;
  numericValue: number | null;
  score: number | null;
  status: "good" | "average" | "poor" | "unknown";
};
type PageSpeedData = {
  url: string;
  strategy: PageSpeedStrategy;
  score: number | null;
  status: "good" | "average" | "poor" | "unknown";
  metrics: PageSpeedMetric[];
  fetchedAt: string;
};
type SeoWorkflow = {
  task: { id: number; status: string; steps: Array<{ id: number; title: string; status: "pending" | "completed" }> } | null;
  outcome: { status: string } | null;
};
type Signal = {
  id: number;
  type: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  status: "new" | "acknowledged" | "resolved" | "dismissed";
  title: string;
  summary: string;
  detected_at: string;
  last_seen_at: string;
  occurrence_count: number;
};
type SignalAnalysis = {
  id: number;
  status: "ok" | "insufficient_evidence" | "failed";
  evidence_ids: number[];
  explanation: { text: string | null; confidence: number | null };
  business_impact: {
    area: string | null;
    direction: "positive" | "negative" | "neutral" | "unknown";
    magnitude: string | null;
    confidence: number | null;
    basis: string | null;
    limitations: string | null;
  };
  generator: { type: "rule" | "ai"; provider: string | null; model: string | null; version: string };
};

const seoTabs = [
  { key: "overview", label: "1. 總覽", href: "/si/seo" },
  { key: "technical", label: "2. 技術問題", href: "/si/seo?tab=technical" },
  { key: "keywords", label: "3. 關鍵字機會", href: "/si/seo?tab=keywords" },
];

async function parseJsonSafe<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) throw new Error(`API 回傳空內容。status=${res.status} url=${res.url}`);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`API 未回傳有效 JSON。status=${res.status} url=${res.url}`);
  }
}

function getErrorMessage(json: any, fallback: string) {
  return json?.error?.message || json?.message || fallback;
}

function scoreTone(score: number | null | undefined) {
  if (score === null || score === undefined) return "text-slate-400";
  if (score >= 90) return "text-emerald-600";
  if (score >= 50) return "text-amber-600";
  return "text-rose-600";
}

function severityClass(severity: string) {
  if (severity === "HIGH") return "bg-rose-100 text-rose-700";
  if (severity === "MEDIUM") return "bg-amber-100 text-amber-700";
  return "bg-blue-100 text-blue-700";
}

function signalStatusClass(status: Signal["status"]) {
  if (status === "new") return "bg-rose-100 text-rose-700";
  if (status === "acknowledged") return "bg-amber-100 text-amber-700";
  if (status === "resolved") return "bg-emerald-100 text-emerald-700";
  return "bg-slate-100 text-slate-600";
}

function signalStatusLabel(status: Signal["status"]) {
  if (status === "new") return "新偵測";
  if (status === "acknowledged") return "已確認";
  if (status === "resolved") return "已解決";
  return "已忽略";
}

function impactDirectionLabel(direction: SignalAnalysis["business_impact"]["direction"]) {
  if (direction === "negative") return "負面影響";
  if (direction === "positive") return "正面影響";
  if (direction === "neutral") return "中性";
  return "尚無法判斷";
}

function generatorLabel(generator: SignalAnalysis["generator"]) {
  return generator.type === "ai" ? `AI 生成（${generator.model || generator.provider || "未知模型"}）` : "規則式產生（非 AI）";
}

function metricTone(status: PageSpeedMetric["status"]) {
  if (status === "good") return "text-emerald-700";
  if (status === "average") return "text-amber-700";
  if (status === "poor") return "text-rose-700";
  return "text-slate-700";
}

export default function SeoPage() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace.id;
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab") || "overview";
  const tab = rawTab === "issues" || rawTab === "ai" ? "technical" : rawTab;
  const activeSeoTab = seoTabs.find((item) => item.key === tab) || seoTabs[0];

  const [user, setUser] = useState<{ id: number; isDemo?: boolean } | null>(null);
  const [sites, setSites] = useState<SeoSite[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<number | null>(null);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loadingSites, setLoadingSites] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [workflow, setWorkflow] = useState<Record<string, SeoWorkflow>>({});
  const [workflowBusy, setWorkflowBusy] = useState("");
  const [workflowError, setWorkflowError] = useState("");
  const [pageSpeedStrategy, setPageSpeedStrategy] = useState<PageSpeedStrategy>("mobile");
  const [pageSpeed, setPageSpeed] = useState<PageSpeedData | null>(null);
  const [pageSpeedHistory, setPageSpeedHistory] = useState<PageSpeedData[]>([]);
  const [loadingPageSpeed, setLoadingPageSpeed] = useState(false);
  const [loadingPageSpeedHistory, setLoadingPageSpeedHistory] = useState(false);
  const [pageSpeedError, setPageSpeedError] = useState("");
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loadingSignals, setLoadingSignals] = useState(false);
  const [signalBusyId, setSignalBusyId] = useState<number | null>(null);
  const [expandedSignalId, setExpandedSignalId] = useState<number | null>(null);
  const [analysisById, setAnalysisById] = useState<Record<number, SignalAnalysis>>({});
  const [loadingAnalysisId, setLoadingAnalysisId] = useState<number | null>(null);
  const isDemo = Boolean(user?.isDemo);

  const selectedSite = useMemo(
    () => sites.find((site) => site.id === selectedSiteId) || null,
    [sites, selectedSiteId]
  );

  const workflowRequest = useCallback(
    async (contextKey: string, body: Record<string, unknown>) => {
      const response = await fetch(`/api/workspaces/${workspaceId}/dashboard/workflow`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context_key: contextKey, ...body }),
      });
      const json = await parseJsonSafe<{ ok: boolean; data?: SeoWorkflow; error?: { message?: string } }>(response);
      if (!response.ok || !json.ok || !json.data) throw new Error(getErrorMessage(json, "工作流程更新失敗。"));
      setWorkflow((current) => ({ ...current, [contextKey]: json.data! }));
      return json.data;
    },
    [workspaceId]
  );

  const loadSites = useCallback(async () => {
    try {
      setLoadingSites(true);
      setErrorText("");
      const response = await fetch("/api/seo/sites", {
        method: "GET",
        headers: workspaceHeaders(workspaceId),
        cache: "no-store",
      });
      const json = await parseJsonSafe<{ ok: boolean; data: SeoSite[]; error?: any }>(response);
      if (!response.ok || !json.ok) throw new Error(getErrorMessage(json, "讀取 SEO 站點失敗。"));
      setSites(json.data);
      setSelectedSiteId((current) => current || json.data[0]?.id || null);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "讀取 SEO 站點失敗。");
    } finally {
      setLoadingSites(false);
    }
  }, [workspaceId]);

  const loadSummary = useCallback(
    async (siteId: number, options?: { force?: boolean }) => {
      if (options?.force && isDemo) return;
      try {
        setLoadingSummary(true);
        setErrorText("");
        const response = await fetch("/api/seo/summary", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Workspace-Id": String(workspaceId),
          },
          body: JSON.stringify({ site_id: siteId, force: Boolean(options?.force) }),
          cache: "no-store",
        });
        const json = await parseJsonSafe<SeoSummaryResponse>(response);
        if (!response.ok || !json.ok) throw new Error(getErrorMessage(json, "讀取 SEO summary 失敗。"));
        setSummary(json.data);
      } catch (error) {
        setSummary(null);
        setErrorText(error instanceof Error ? error.message : "讀取 SEO summary 失敗。");
      } finally {
        setLoadingSummary(false);
      }
    },
    [isDemo, workspaceId]
  );

  const loadPageSpeedHistory = useCallback(
    async (siteId: number, strategy: PageSpeedStrategy) => {
      try {
        setLoadingPageSpeedHistory(true);
        const response = await fetch("/api/seo/pagespeed", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Workspace-Id": String(workspaceId),
          },
          body: JSON.stringify({
            site_id: siteId,
            strategy,
            history: true,
            limit: 10,
          }),
          cache: "no-store",
        });
        const json = await parseJsonSafe<{
          ok: boolean;
          data?: PageSpeedData[];
          error?: { message?: string };
          message?: string;
        }>(response);

        if (!response.ok || !json.ok || !Array.isArray(json.data)) {
          throw new Error(getErrorMessage(json, "讀取 PageSpeed 歷史紀錄失敗。"));
        }

        setPageSpeedHistory(json.data);
      } catch {
        setPageSpeedHistory([]);
      } finally {
        setLoadingPageSpeedHistory(false);
      }
    },
    [workspaceId]
  );

  const loadPageSpeed = useCallback(
    async (url: string, strategy: PageSpeedStrategy, options?: { refresh?: boolean }) => {
      if (options?.refresh && isDemo) return;
      try {
        setLoadingPageSpeed(true);
        setPageSpeedError("");
        const response = await fetch("/api/seo/pagespeed", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Workspace-Id": String(workspaceId),
          },
          body: JSON.stringify({
            url,
            strategy,
            site_id: selectedSiteId,
            refresh: options?.refresh ?? true,
          }),
          cache: "no-store",
        });
        const json = await parseJsonSafe<{ ok: boolean; data?: PageSpeedData; error?: { message?: string }; message?: string }>(response);
        if (!response.ok || !json.ok || !json.data) throw new Error(getErrorMessage(json, "PageSpeed 檢測失敗。"));
        setPageSpeed(json.data);
        if (selectedSiteId) {
          void loadPageSpeedHistory(selectedSiteId, strategy);
        }
      } catch (error) {
        setPageSpeedError(error instanceof Error ? error.message : "PageSpeed 檢測失敗。");
      } finally {
        setLoadingPageSpeed(false);
      }
    },
    [isDemo, loadPageSpeedHistory, selectedSiteId, workspaceId]
  );

  const loadSignals = useCallback(async () => {
    try {
      setLoadingSignals(true);
      const response = await fetch(`/api/workspaces/${workspaceId}/signals?severity=&status=`, {
        method: "GET",
        cache: "no-store",
      });
      const json = await parseJsonSafe<{ ok: boolean; data?: { items: Signal[] }; error?: { message?: string } }>(response);
      if (!response.ok || !json.ok || !json.data) throw new Error(getErrorMessage(json, "讀取 Signal 失敗。"));
      setSignals(json.data.items);
    } catch {
      setSignals([]);
    } finally {
      setLoadingSignals(false);
    }
  }, [workspaceId]);

  const updateSignalStatus = useCallback(
    async (signalId: number, status: "acknowledged" | "dismissed") => {
      if (isDemo) return;
      try {
        setSignalBusyId(signalId);
        const response = await fetch(`/api/workspaces/${workspaceId}/signals`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ signal_id: signalId, status }),
        });
        const json = await parseJsonSafe<{ ok: boolean; data?: Signal; error?: { message?: string } }>(response);
        if (!response.ok || !json.ok || !json.data) throw new Error(getErrorMessage(json, "更新 Signal 失敗。"));
        setSignals((current) => current.map((item) => (item.id === signalId ? { ...item, ...json.data! } : item)));
      } catch {
        // Non-critical for this minimal integration -- V10-06 owns the real UI.
      } finally {
        setSignalBusyId(null);
      }
    },
    [isDemo, workspaceId]
  );

  const toggleSignalAnalysis = useCallback(
    async (signalId: number) => {
      if (expandedSignalId === signalId) {
        setExpandedSignalId(null);
        return;
      }
      setExpandedSignalId(signalId);
      if (analysisById[signalId]) return;
      try {
        setLoadingAnalysisId(signalId);
        const response = await fetch(`/api/workspaces/${workspaceId}/signals/${signalId}/analysis`, {
          method: "GET",
          cache: "no-store",
        });
        const json = await parseJsonSafe<{ ok: boolean; data?: SignalAnalysis; error?: { message?: string } }>(response);
        if (!response.ok || !json.ok || !json.data) throw new Error(getErrorMessage(json, "讀取 Explanation/Impact 失敗。"));
        setAnalysisById((current) => ({ ...current, [signalId]: json.data! }));
      } catch {
        // Non-critical for this minimal integration.
      } finally {
        setLoadingAnalysisId(null);
      }
    },
    [analysisById, expandedSignalId, workspaceId]
  );

  const createIssueTask = useCallback(
    async (issue: SummaryData["technicalIssues"][number]) => {
      if (!selectedSiteId || isDemo) return;
      const contextKey = `seo:${selectedSiteId}:${issue.type}`;
      try {
        setWorkflowBusy(contextKey);
        setWorkflowError("");
        await workflowRequest(contextKey, {
          action: "create_task",
          title: `修復 SEO 技術問題：${issue.type}`,
          description: `${issue.message}\nURL：${issue.url}\nAI 建議：${issue.recommendation || "請依照 SEO 檢測結果修正後重新掃描。"}`,
          // V10-04: real observed facts (which site, which detector issue
          // type, which URL), not a business claim -- lets the backend
          // resolve the real Signal this task is for and build the
          // Recommendation's title/priority/impact/reason from Signal/
          // Evidence/Explanation instead of trusting title/description
          // above. Falls back to the legacy fields if no matching Signal
          // resolves (e.g. Signal pipeline hasn't run yet for this scan).
          signal_context: {
            site_id: selectedSiteId,
            issue_type: issue.type,
            url: issue.url,
          },
          steps: [
            { title: "確認受影響頁面", description: issue.url },
            { title: "依照建議修正技術問題", description: issue.recommendation || issue.message },
            { title: "重新掃描並確認改善結果", description: "完成修正後重新產生 SEO summary。" },
          ],
          baseline: {
            seo_score: summary?.health.score ?? 0,
            seo_issues: summary?.technicalIssues.length ?? 0,
          },
        });
      } catch (error) {
        setWorkflowError(error instanceof Error ? error.message : "建立任務失敗。");
      } finally {
        setWorkflowBusy("");
      }
    },
    [isDemo, selectedSiteId, summary, workflowRequest]
  );

  const toggleIssueStep = useCallback(
    async (contextKey: string, taskId: number, stepId: number, completed: boolean, issueType: string) => {
      try {
        setWorkflowBusy(`${contextKey}:${stepId}`);
        setWorkflowError("");
        await workflowRequest(contextKey, {
          action: "update_step",
          title: `修復 SEO 技術問題：${issueType}`,
          task_id: taskId,
          step_id: stepId,
          completed,
        });
      } catch (error) {
        setWorkflowError(error instanceof Error ? error.message : "更新任務步驟失敗。");
      } finally {
        setWorkflowBusy("");
      }
    },
    [workflowRequest]
  );

  useEffect(() => {
    let alive = true;
    fetch("/api/auth/me", { credentials: "include", cache: "no-store" })
      .then((response) => response.json())
      .then((result) => {
        if (alive) setUser(result?.ok && result?.data?.id ? result.data : null);
      })
      .catch(() => {
        if (alive) setUser(null);
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    // Clear the previous Workspace's sites/summary immediately on switch so
    // stale content isn't shown while the new Workspace's sites reload.
    setSites([]);
    setSelectedSiteId(null);
    setSummary(null);
    setPageSpeed(null);
    setPageSpeedHistory([]);
    setWorkflow({});
    setErrorText("");
    setSignals([]);
    setExpandedSignalId(null);
    setAnalysisById({});
  }, [workspaceId]);

  useEffect(() => {
    loadSites();
  }, [loadSites]);

  useEffect(() => {
    void loadSignals();
  }, [loadSignals]);

  useEffect(() => {
    if (selectedSiteId) loadSummary(selectedSiteId);
  }, [selectedSiteId, loadSummary]);

  useEffect(() => {
    setPageSpeed(null);
    setPageSpeedError("");
    if (selectedSiteId) {
      void loadPageSpeedHistory(selectedSiteId, pageSpeedStrategy);
    } else {
      setPageSpeedHistory([]);
    }
  }, [loadPageSpeedHistory, selectedSiteId, pageSpeedStrategy]);

  const issueCount = summary?.technicalIssues.length ?? 0;
  const hasIssues = issueCount > 0;
  const createdTaskCount = Object.values(workflow).filter((item) => item.task).length;
  const primaryActionHref = hasIssues ? "/si/seo?tab=technical" : "/si/seo?tab=keywords";
  const primaryActionLabel = hasIssues ? "查看技術問題" : "查看關鍵字機會";
  const primaryRecommendation =
    summary?.suggestions[0]?.reason ||
    (hasIssues
      ? "先處理高風險技術問題，再重新掃描確認 SEO 分數與問題數是否改善。"
      : "目前沒有明顯技術問題，可以把重點放在關鍵字機會與內容擴充。");

  return (
    <>
      <div className="space-y-6">
        <header className="flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="mb-2 text-sm font-medium text-slate-500">搜尋健康度 / SEO</div>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">搜尋健康度</h1>
              <select
                value={selectedSiteId ?? ""}
                onChange={(event) => setSelectedSiteId(event.target.value ? Number(event.target.value) : null)}
                disabled={loadingSites || sites.length === 0}
                className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 lg:w-72"
              >
                {sites.length === 0 ? <option value="">尚未新增站點</option> : null}
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.site_name || site.site_url}
                  </option>
                ))}
              </select>
            </div>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
              檢查網站搜尋健康度、技術問題、關鍵字機會與 PageSpeed 表現，並把可執行項目送回決策中心。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setDialogOpen(true)} className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white">
              <Plus className="h-4 w-4" />
              新增網站
            </button>
            <button
              type="button"
              onClick={() => selectedSiteId && loadSummary(selectedSiteId, { force: true })}
              disabled={!selectedSiteId || loadingSummary || isDemo}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loadingSummary ? "animate-spin" : ""}`} />
              重新掃描
            </button>
          </div>
        </header>

        <nav className="flex flex-wrap gap-2">
          {seoTabs.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={`rounded-2xl px-4 py-2 text-sm font-bold ${
                activeSeoTab.key === item.key ? "bg-blue-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {errorText ? <Notice tone="error" text={errorText} /> : null}
        {loadingSummary ? <Notice text="正在讀取 SEO 分析..." /> : null}
        {!loadingSummary && !summary ? <Notice text="請先新增網站，或選擇一個站點產生 SEO summary。" /> : null}

        {summary ? (
          <>
            <section className="grid gap-4 md:grid-cols-4">
              <ScoreCard title="SEO Health" value={summary.health.score} icon={<ShieldCheck className="h-5 w-5" />} score={summary.health.score} />
              <ScoreCard title="技術問題" value={summary.technicalIssues.length} icon={<AlertTriangle className="h-5 w-5" />} />
              <ScoreCard title="關鍵字" value={summary.keywords.length} icon={<TrendingUp className="h-5 w-5" />} />
              <ScoreCard title="已建立任務" value={createdTaskCount} icon={<Target className="h-5 w-5" />} />
            </section>

            <section className="rounded-3xl border border-blue-100 bg-blue-50/70 p-6">
              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-blue-700">AI Summary</p>
                  <h2 className="mt-2 text-2xl font-black text-slate-950">{primaryRecommendation}</h2>
                  <p className="mt-2 text-sm leading-7 text-slate-600">
                    最近分析：{formatAnalysisDate(summary.meta.updated_at)}，資料來源：{summary.meta.source}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="grid gap-5 lg:grid-cols-[1fr_260px] lg:items-center">
                <div>
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-violet-700">
                    <Target className="h-4 w-4" />
                    Top Recommendation
                  </div>
                  <h2 className="mt-3 text-xl font-black text-slate-950">{summary.suggestions[0]?.title || primaryActionLabel}</h2>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{primaryRecommendation}</p>
                </div>
                <Link href={primaryActionHref} className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-black text-white hover:bg-violet-700">
                  {primaryActionLabel}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </section>

            {activeSeoTab.key === "overview" ? (
              <div className="grid gap-6 xl:grid-cols-2">
                <InfoCard title="SEO 分數拆解">
                  <div className="space-y-3">
                    <MetricRow label="技術健康度" value={summary.health.breakdown.tech} />
                    <MetricRow label="內容健康度" value={summary.health.breakdown.content ?? "-"} />
                    <MetricRow label="Search Console" value={summary.meta.gsc.ok ? "可讀取" : "待設定"} />
                  </div>
                </InfoCard>

                <InfoCard title="AI 建議">
                  {summary.suggestions.length === 0 ? (
                    <EmptyText text="目前沒有新的 AI 建議。" />
                  ) : (
                    <div className="space-y-3">
                      {summary.suggestions.map((item) => (
                        <div key={item.rule} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                          <div className="mt-2 text-sm leading-6 text-slate-600">{item.reason}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </InfoCard>
              </div>
            ) : null}

            {activeSeoTab.key === "technical" ? (
              <div className="space-y-6">
                {summary.comparison?.available ? (
                  <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
                    <p className="text-xs font-black uppercase tracking-wide text-emerald-700">Before / After</p>
                    <h2 className="mt-2 text-xl font-black text-slate-950">重新掃描已產生改善比較</h2>
                    <p className="mt-2 text-sm text-slate-600">
                      {formatAnalysisDate(summary.comparison.previous_scanned_at)} → {formatAnalysisDate(summary.comparison.current_scanned_at)}
                    </p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                      <MiniStat label="健康分數" value={`${summary.comparison.health_score.before} → ${summary.comparison.health_score.after}`} change={summary.comparison.health_score.change} />
                      <MiniStat label="問題數" value={`${summary.comparison.issues.before} → ${summary.comparison.issues.after}`} change={summary.comparison.issues.before - summary.comparison.issues.after} />
                      <MiniStat label="已修復" value={summary.comparison.issues.fixed} change={summary.comparison.issues.fixed} />
                      <MiniStat label="新增" value={summary.comparison.issues.added} change={-summary.comparison.issues.added} />
                      <MiniStat label="剩餘" value={summary.comparison.issues.remaining} change={-summary.comparison.issues.remaining} />
                    </div>
                  </section>
                ) : null}

                {workflowError ? <Notice tone="error" text={workflowError} /> : null}

                <InfoCard title="Signal（系統偵測事件）">
                  <p className="mb-3 text-xs text-slate-500">
                    每次重新掃描時系統自動偵測的技術問題新增／修復事件，同一問題重複偵測不會產生重複紀錄。
                  </p>
                  {loadingSignals ? (
                    <EmptyText text="正在讀取 Signal..." />
                  ) : signals.length === 0 ? (
                    <EmptyText text="目前沒有偵測到的 Signal。" />
                  ) : (
                    <div className="space-y-3">
                      {signals.map((signal) => (
                        <div key={signal.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="text-sm font-semibold text-slate-900">{signal.title}</div>
                            <div className="flex items-center gap-2">
                              <span className={`rounded-full px-2 py-1 text-[10px] font-black ${signalStatusClass(signal.status)}`}>
                                {signalStatusLabel(signal.status)}
                              </span>
                              <span className="rounded-full bg-slate-200 px-2 py-1 text-[10px] font-black text-slate-600">
                                x{signal.occurrence_count}
                              </span>
                            </div>
                          </div>
                          <div className="mt-2 text-sm text-slate-600">{signal.summary}</div>
                          <div className="mt-2 text-xs text-slate-400">最近偵測：{formatAnalysisDate(signal.last_seen_at)}</div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {(signal.status === "new" || signal.status === "acknowledged") && !isDemo ? (
                              <>
                                {signal.status === "new" ? (
                                  <button
                                    type="button"
                                    onClick={() => void updateSignalStatus(signal.id, "acknowledged")}
                                    disabled={signalBusyId === signal.id}
                                    className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-50"
                                  >
                                    確認
                                  </button>
                                ) : null}
                                <button
                                  type="button"
                                  onClick={() => void updateSignalStatus(signal.id, "dismissed")}
                                  disabled={signalBusyId === signal.id}
                                  className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-500 disabled:opacity-50"
                                >
                                  忽略
                                </button>
                              </>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => void toggleSignalAnalysis(signal.id)}
                              className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700"
                            >
                              {expandedSignalId === signal.id ? "收合解讀與影響評估" : "查看解讀與影響評估"}
                            </button>
                          </div>

                          {expandedSignalId === signal.id ? (
                            <div className="mt-3 space-y-3 border-t border-slate-200 pt-3">
                              {loadingAnalysisId === signal.id ? (
                                <EmptyText text="正在讀取 Explanation/Business Impact..." />
                              ) : !analysisById[signal.id] ? (
                                <EmptyText text="讀取失敗，請稍後再試。" />
                              ) : (
                                <>
                                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                                    <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Evidence</p>
                                    <p className="mt-1 text-sm text-slate-700">
                                      引用 {analysisById[signal.id].evidence_ids.length} 筆 Evidence（ID：
                                      {analysisById[signal.id].evidence_ids.join(", ") || "無"}）
                                    </p>
                                  </div>
                                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
                                    <p className="text-[10px] font-black uppercase tracking-wide text-blue-500">Explanation</p>
                                    {analysisById[signal.id].status === "insufficient_evidence" ? (
                                      <p className="mt-1 text-sm text-blue-900">尚無足夠 Evidence，無法產生解讀。</p>
                                    ) : analysisById[signal.id].status === "failed" ? (
                                      <p className="mt-1 text-sm text-rose-700">產生解讀時發生錯誤，未產生結果。</p>
                                    ) : (
                                      <>
                                        <p className="mt-1 text-sm text-blue-900">{analysisById[signal.id].explanation.text}</p>
                                        <p className="mt-1 text-xs text-blue-600">
                                          信心度：{analysisById[signal.id].explanation.confidence ?? "-"}％ ·{" "}
                                          {generatorLabel(analysisById[signal.id].generator)}
                                        </p>
                                      </>
                                    )}
                                  </div>
                                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                                    <p className="text-[10px] font-black uppercase tracking-wide text-amber-600">Business Impact</p>
                                    {analysisById[signal.id].status !== "ok" ? (
                                      <p className="mt-1 text-sm text-amber-900">尚無法判斷商業影響。</p>
                                    ) : (
                                      <>
                                        <p className="mt-1 text-sm font-bold text-amber-900">
                                          {impactDirectionLabel(analysisById[signal.id].business_impact.direction)}
                                          {analysisById[signal.id].business_impact.magnitude
                                            ? `（${analysisById[signal.id].business_impact.magnitude}）`
                                            : ""}
                                        </p>
                                        <p className="mt-1 text-xs text-amber-700">{analysisById[signal.id].business_impact.basis}</p>
                                        <p className="mt-1 text-xs text-amber-600">
                                          限制：{analysisById[signal.id].business_impact.limitations}
                                        </p>
                                      </>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </InfoCard>

                <InfoCard title="技術問題與修復任務">
                  {summary.technicalIssues.length === 0 ? (
                    <EmptyText text="目前沒有明顯技術問題。" />
                  ) : (
                    <div className="space-y-3">
                      {summary.technicalIssues.map((issue) => {
                        const contextKey = `seo:${selectedSiteId}:${issue.type}`;
                        const itemWorkflow = workflow[contextKey];
                        return (
                          <div key={`${issue.type}-${issue.url}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <div className="flex items-center justify-between gap-3">
                              <div className="text-sm font-semibold text-slate-900">{issue.type}</div>
                              <span className={`rounded-full px-2 py-1 text-[10px] font-black ${severityClass(issue.severity)}`}>
                                {issue.severity}
                              </span>
                            </div>
                            <div className="mt-2 text-sm text-slate-600">{issue.message}</div>
                            <div className="mt-2 break-all text-xs text-slate-400">{issue.url}</div>
                            <div className="mt-3 rounded-xl border border-violet-100 bg-violet-50 p-3 text-xs leading-5 text-violet-900">
                              <span className="font-black">AI 修復建議：</span>
                              {issue.recommendation || "請依照檢測結果修正後重新掃描。"}
                            </div>
                            {!itemWorkflow?.task ? (
                              <button
                                type="button"
                                onClick={() => void createIssueTask(issue)}
                                disabled={isDemo || workflowBusy === contextKey}
                                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white disabled:opacity-50"
                              >
                                <Target className="h-3.5 w-3.5" />
                                {workflowBusy === contextKey ? "建立中..." : "建立 Dashboard 任務"}
                              </button>
                            ) : (
                              <div className="mt-3 space-y-2">
                                <p className="text-xs font-black text-emerald-700">Dashboard 任務已建立</p>
                                {itemWorkflow.task.steps.map((step) => (
                                  <button
                                    key={step.id}
                                    type="button"
                                    onClick={() => void toggleIssueStep(contextKey, itemWorkflow.task!.id, step.id, step.status !== "completed", issue.type)}
                                    disabled={workflowBusy === `${contextKey}:${step.id}`}
                                    className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-bold ${
                                      step.status === "completed"
                                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                        : "border-slate-200 bg-white text-slate-700"
                                    }`}
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                    {step.title}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </InfoCard>
              </div>
            ) : null}

            {activeSeoTab.key === "keywords" ? (
              <div className="grid gap-6 xl:grid-cols-3">
                <KeywordPanel title="可推進關鍵字" items={summary.pushKeywords} />
                <KeywordPanel title="需防守關鍵字" items={summary.defendKeywords} />
                <KeywordPanel title="觀察關鍵字" items={summary.watchKeywords} />
              </div>
            ) : null}

            <PageSpeedPanel
              data={pageSpeed}
              history={pageSpeedHistory}
              error={pageSpeedError}
              loading={loadingPageSpeed}
              loadingHistory={loadingPageSpeedHistory}
              strategy={pageSpeedStrategy}
              onStrategyChange={setPageSpeedStrategy}
              onRefresh={() => selectedSite?.site_url && void loadPageSpeed(selectedSite.site_url, pageSpeedStrategy, { refresh: true })}
              disabled={!selectedSite?.site_url}
            />
          </>
        ) : null}
      </div>

      <AddSeoSiteDialog open={dialogOpen} onClose={() => setDialogOpen(false)} onSuccess={loadSites} />
    </>
  );
}

function Notice({ text, tone = "default" }: { text: string; tone?: "default" | "error" }) {
  return (
    <div className={`rounded-3xl border p-6 text-sm font-semibold shadow-sm ${tone === "error" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-slate-200 bg-white text-slate-500"}`}>
      {text}
    </div>
  );
}

function ScoreCard({ title, value, icon, score }: { title: string; value: string | number; icon: React.ReactNode; score?: number }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm font-medium text-slate-500">{title}</div>
        <div className="text-slate-400">{icon}</div>
      </div>
      <div className={`text-4xl font-bold tracking-tight ${score === undefined ? "text-slate-900" : scoreTone(score)}`}>{value}</div>
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="mb-4 text-lg font-semibold text-slate-900">{title}</div>
      {children}
    </section>
  );
}

function MetricRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
      <span className="text-sm font-bold text-slate-600">{label}</span>
      <span className="text-sm font-black text-slate-950">{value}</span>
    </div>
  );
}

function MiniStat({ label, value, change }: { label: string; value: string | number; change: number }) {
  return (
    <div className="rounded-xl border border-white bg-white p-4 shadow-sm">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-black text-slate-950">{value}</p>
      <p className={`mt-1 text-xs font-bold ${change > 0 ? "text-emerald-600" : change < 0 ? "text-rose-600" : "text-slate-400"}`}>
        {change > 0 ? "+" : ""}
        {change}
      </p>
    </div>
  );
}

function KeywordPanel({
  title,
  items,
}: {
  title: string;
  items: Array<{ keyword: string; position: number | null; impressions: number; clicks: number; ctr?: number }>;
}) {
  return (
    <InfoCard title={title}>
      {items.length === 0 ? (
        <EmptyText text="目前沒有資料。" />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.keyword} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="font-medium text-slate-900">{item.keyword}</div>
              <div className="mt-2 text-xs leading-5 text-slate-500">
                排名 {item.position ?? "-"} / 曝光 {item.impressions} / 點擊 {item.clicks}
                {typeof item.ctr === "number" ? ` / CTR ${item.ctr}%` : ""}
              </div>
            </div>
          ))}
        </div>
      )}
    </InfoCard>
  );
}

function PageSpeedPanel({
  data,
  history,
  error,
  loading,
  loadingHistory,
  strategy,
  onStrategyChange,
  onRefresh,
  disabled = false,
}: {
  data: PageSpeedData | null;
  history: PageSpeedData[];
  error: string;
  loading: boolean;
  loadingHistory: boolean;
  strategy: PageSpeedStrategy;
  onStrategyChange: (strategy: PageSpeedStrategy) => void;
  onRefresh: () => void;
  disabled?: boolean;
}) {
  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-sm font-medium text-slate-500">PageSpeed / Lighthouse</div>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900">網站速度檢測</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            檢查行動版與桌面版速度分數，協助判斷技術 SEO 與使用者體驗風險。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-2xl bg-slate-100 p-1">
            <StrategyButton active={strategy === "mobile"} onClick={() => onStrategyChange("mobile")} icon={<Smartphone size={16} />} label="行動版" />
            <StrategyButton active={strategy === "desktop"} onClick={() => onStrategyChange("desktop")} icon={<Monitor size={16} />} label="桌面版" />
          </div>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading || disabled}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            {data ? "重新檢測" : "開始檢測"}
          </button>
        </div>
      </div>

      {error ? <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">{error}</div> : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-[220px_minmax(0,1fr)]">
        <div className="rounded-2xl bg-slate-50 p-5 text-center">
          <div className={`text-5xl font-black ${scoreTone(data?.score)}`}>{loading ? "..." : data?.score ?? "-"}</div>
          <div className="mt-2 text-sm font-bold text-slate-500">速度分數</div>
          {data?.fetchedAt ? <div className="mt-2 text-xs text-slate-400">{formatAnalysisDate(data.fetchedAt)}</div> : null}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {(data?.metrics || []).map((metric) => (
            <div key={metric.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="truncate text-sm font-semibold text-slate-700">{metric.label}</span>
                <span className={`text-lg font-bold ${metricTone(metric.status)}`}>{metric.value}</span>
              </div>
            </div>
          ))}
          {!loading && !error && !data ? <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">尚未執行 PageSpeed 檢測。</div> : null}
        </div>
      </div>

      <div className="mt-6 border-t border-slate-200 pt-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-bold text-slate-900">歷史紀錄</h3>
            <p className="mt-1 text-sm text-slate-500">
              最近 10 次 {strategy === "mobile" ? "行動版" : "桌面版"} PageSpeed 檢測。
            </p>
          </div>
          {history.length >= 2 &&
          history[0].score !== null &&
          history[1].score !== null ? (
            <ScoreDelta value={history[0].score - history[1].score} />
          ) : null}
        </div>

        {loadingHistory ? (
          <p className="mt-4 text-sm text-slate-500">正在載入歷史紀錄...</p>
        ) : history.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs font-bold uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-3 py-2">檢測時間</th>
                  <th className="px-3 py-2">分數</th>
                  <th className="px-3 py-2">變化</th>
                  {history[0].metrics.slice(0, 4).map((metric) => (
                    <th key={metric.id} className="px-3 py-2">
                      {metric.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((item, index) => {
                  const previous = history[index + 1]?.score;
                  const delta =
                    item.score !== null && typeof previous === "number"
                      ? item.score - previous
                      : null;

                  return (
                    <tr key={`${item.fetchedAt}-${item.strategy}-${index}`} className="text-slate-600">
                      <td className="whitespace-nowrap px-3 py-3 font-semibold">
                        {formatAnalysisDate(item.fetchedAt)}
                      </td>
                      <td className="px-3 py-3 text-lg font-black text-slate-950">
                        {item.score ?? "-"}
                      </td>
                      <td className="px-3 py-3">
                        {delta === null ? (
                          <span className="text-slate-300">-</span>
                        ) : (
                          <ScoreDelta value={delta} compact />
                        )}
                      </td>
                      {history[0].metrics.slice(0, 4).map((metric) => {
                        const value = item.metrics.find((candidate) => candidate.id === metric.id)?.value;
                        return (
                          <td key={metric.id} className="whitespace-nowrap px-3 py-3">
                            {value || "-"}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">
            尚無歷史紀錄。執行一次 PageSpeed 檢測後，系統會保存紀錄並顯示在這裡。
          </p>
        )}
      </div>
    </section>
  );
}

function ScoreDelta({ value, compact = false }: { value: number; compact?: boolean }) {
  return (
    <span
      className={`inline-flex rounded-full font-black ${
        compact ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm"
      } ${
        value > 0
          ? "bg-emerald-50 text-emerald-700"
          : value < 0
            ? "bg-rose-50 text-rose-700"
            : "bg-slate-100 text-slate-500"
      }`}
    >
      {value > 0 ? "+" : ""}
      {value}
    </span>
  );
}

function StrategyButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
        active ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-900"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function EmptyText({ text }: { text: string }) {
  return <div className="text-sm text-slate-500">{text}</div>;
}
