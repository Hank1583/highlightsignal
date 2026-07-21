"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowUpRight,
  Bot,
  CheckCircle2,
  Clock3,
  Database,
  FileQuestion,
  Globe2,
  History,
  Lightbulb,
  Radar,
  RotateCcw,
  Sparkles,
  Target,
} from "lucide-react";
import type {
  SiHistoryResponse,
  SiModule,
  SiSite,
  SiSitesResponse,
  SiSummary,
  SiSummaryResponse,
} from "@/lib/si/types";
import { formatAnalysisDate } from "@/lib/formatAnalysisDate";
import { useWorkspace } from "@/components/workspace/WorkspaceProvider";
import { workspaceHeaders } from "@/lib/workspaceFetch";

type ModuleConfig = {
  module: SiModule;
  eyebrow: string;
  emptyTitle: string;
  iconMode: "aeo" | "geo";
};

const DEFAULT_SITE_ID = 1;

async function parseJsonSafe<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) throw new Error(`API 回傳空內容。status=${res.status}`);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`API 未回傳有效 JSON。body=${text}`);
  }
}

function getErrorMessage(json: SiSummaryResponse | SiHistoryResponse | SiSitesResponse, fallback: string) {
  return json?.error?.message || json?.message || fallback;
}

function siteLabel(site: SiSite) {
  return site.site_name || site.site_url;
}

function confidenceLabel(value?: string) {
  if (value === "high") return "信心高";
  if (value === "medium") return "信心中";
  if (value === "low") return "信心低";
  return value ? `信心：${value}` : "";
}

function draftModeLabel(value?: string) {
  if (value === "publishable") return "可直接發布";
  if (value === "guidance") return "方向建議";
  return value || "建議草稿";
}

function methodologyCopy(module: SiModule) {
  if (module === "aeo") {
    return {
      title: "AEO 分析口徑",
      desc: "以 SEO summary、頁面結構、FAQ、短答案覆蓋度與可回答性為基準，評估內容被 AI answer engine 摘用的準備度。",
      cadence: "建議在完成 SEO 修正、FAQ 更新、內容改寫或新增權威來源後重新產生分析。",
    };
  }

  return {
    title: "GEO 分析口徑",
    desc: "以品牌提及、權威來源、引用基礎、內容覆蓋與搜尋健康度為基準，評估品牌是否容易被 AI 搜尋看見與引用。",
    cadence: "建議在完成品牌內容更新、外部引用建設或 SEO 技術修正後重新產生分析。",
  };
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function confidenceScore(value?: string) {
  if (value === "high") return 92;
  if (value === "medium") return 72;
  if (value === "low") return 46;
  return 60;
}

function buildScoreBreakdown(module: SiModule, summary: SiSummary) {
  const itemCount = summary.items.length;
  const actionCount = summary.actions.length;
  const sideAverage = summary.sideItems.length
    ? summary.sideItems.reduce((sum, item) => sum + Number(item.score || 0), 0) / summary.sideItems.length
    : 58;
  const confidenceAverage = summary.items.length
    ? summary.items.reduce((sum, item) => sum + confidenceScore(item.confidence), 0) / summary.items.length
    : 58;
  const hasDrafts = summary.items.some((item) => Boolean(item.draft));
  const hasBasis = summary.metrics.some((item) => Boolean(item.basis)) || summary.items.some((item) => Boolean(item.basis));
  const hasTags = summary.items.some((item) => item.tags && item.tags.length > 0);

  if (module === "aeo") {
    const items = [
      { label: "FAQ / 短答案覆蓋", weight: 30, score: clampScore(Math.min(100, itemCount * 18 + (hasTags ? 12 : 0))) },
      { label: "內容證據基礎", weight: 20, score: clampScore(sideAverage) },
      { label: "答案可採用度", weight: 25, score: clampScore(confidenceAverage + (hasDrafts ? 8 : 0)) },
      { label: "Schema / metadata", weight: 15, score: clampScore(hasBasis ? 78 : 52) },
      { label: "技術 SEO 基礎", weight: 10, score: clampScore(actionCount ? 72 : 58) },
    ];
    return {
      label: "AEO readiness score",
      items,
      total: clampScore(items.reduce((sum, item) => sum + item.score * (item.weight / 100), 0)),
    };
  }

  const items = [
    { label: "品牌 / 權威來源基礎", weight: 25, score: clampScore(sideAverage) },
    { label: "引用證據可用度", weight: 25, score: clampScore(hasBasis ? 80 : 55) },
    { label: "內容覆蓋度", weight: 20, score: clampScore(Math.min(100, itemCount * 16 + actionCount * 8)) },
    { label: "答案信心", weight: 15, score: clampScore(confidenceAverage) },
    { label: "技術 SEO 基礎", weight: 15, score: clampScore(actionCount ? 74 : 58) },
  ];
  return {
    label: "GEO visibility score",
    items,
    total: clampScore(items.reduce((sum, item) => sum + item.score * (item.weight / 100), 0)),
  };
}

export default function SiInsightPage({ module, eyebrow, emptyTitle, iconMode }: ModuleConfig) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace.id;
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") || "overview";
  const querySiteId = Number(searchParams.get("site_id") || DEFAULT_SITE_ID);

  const [user, setUser] = useState<{ id: number; isDemo?: boolean } | null>(null);
  const [siteId, setSiteId] = useState(querySiteId || DEFAULT_SITE_ID);
  const [sites, setSites] = useState<SiSite[]>([]);
  const [summary, setSummary] = useState<SiSummary | null>(null);
  const [history, setHistory] = useState<SiSummary[]>([]);
  const [loadingSites, setLoadingSites] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [errorText, setErrorText] = useState("");
  const isDemo = Boolean(user?.isDemo);

  const moduleName = module === "aeo" ? "AI 回答能力" : "AI 能見度";
  const moduleDesc =
    module === "aeo"
      ? "判斷內容是否能清楚回答客戶問題，並找出下一個改善行動。"
      : "判斷品牌是否容易被 AI 看見與引用，並找出下一個改善行動。";
  const moduleIcon = iconMode === "aeo" ? Bot : Globe2;
  const ModuleIcon = moduleIcon;

  const loadSites = useCallback(async () => {
    try {
      setLoadingSites(true);
      const response = await fetch("/api/si/sites", {
        method: "GET",
        headers: workspaceHeaders(workspaceId),
        cache: "no-store",
      });
      const json = await parseJsonSafe<SiSitesResponse>(response);
      if (!response.ok || !json.ok) throw new Error(getErrorMessage(json, "讀取站點失敗。"));
      const nextSites = json.data || [];
      setSites(nextSites);
      if (!nextSites.some((site) => site.id === siteId) && nextSites[0]) setSiteId(nextSites[0].id);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "讀取站點失敗。");
    } finally {
      setLoadingSites(false);
    }
  }, [siteId, workspaceId]);

  const loadSummary = useCallback(
    async (nextSiteId: number, nextTab = tab) => {
      try {
        setLoadingSummary(true);
        setErrorText("");
        const response = await fetch(`/api/si/${module}/summary`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...workspaceHeaders(workspaceId),
          },
          body: JSON.stringify({ site_id: nextSiteId, tab: nextTab }),
          cache: "no-store",
        });
        const json = await parseJsonSafe<SiSummaryResponse>(response);
        if (!response.ok || !json.ok) throw new Error(getErrorMessage(json, `讀取 ${eyebrow} 分析失敗。`));
        setSummary(json.data || null);
      } catch (error) {
        setSummary(null);
        setErrorText(error instanceof Error ? error.message : `讀取 ${eyebrow} 分析失敗。`);
      } finally {
        setLoadingSummary(false);
      }
    },
    [eyebrow, module, tab, workspaceId]
  );

  const loadHistory = useCallback(
    async (nextSiteId: number, nextTab = tab) => {
      try {
        const response = await fetch(`/api/si/${module}/history`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...workspaceHeaders(workspaceId),
          },
          body: JSON.stringify({ site_id: nextSiteId, tab: nextTab, limit: 10 }),
          cache: "no-store",
        });
        const json = await parseJsonSafe<SiHistoryResponse>(response);
        if (response.ok && json.ok) setHistory(json.data || []);
      } catch {
        setHistory([]);
      }
    },
    [module, tab, workspaceId]
  );

  const generateSummary = useCallback(async () => {
    if (isDemo) return;
    try {
      setGenerating(true);
      setErrorText("");
      const response = await fetch(`/api/si/${module}/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...workspaceHeaders(workspaceId),
        },
        body: JSON.stringify({ site_id: siteId, tab }),
      });
      const json = await parseJsonSafe<SiSummaryResponse>(response);
      if (!response.ok || !json.ok) throw new Error(getErrorMessage(json, `產生 ${eyebrow} 分析失敗。`));
      setSummary(json.data || null);
      void loadHistory(siteId, tab);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : `產生 ${eyebrow} 分析失敗。`);
    } finally {
      setGenerating(false);
    }
  }, [eyebrow, isDemo, loadHistory, module, siteId, tab, workspaceId]);

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
    // Clear the previous Workspace's sites/summary/history immediately on
    // switch so stale content isn't shown while the new Workspace's sites and
    // analysis reload.
    setSites([]);
    setSummary(null);
    setHistory([]);
    setErrorText("");
  }, [workspaceId]);

  useEffect(() => {
    loadSites();
  }, [loadSites]);

  useEffect(() => {
    if (siteId) {
      void loadSummary(siteId, tab);
      void loadHistory(siteId, tab);
    }
  }, [loadHistory, loadSummary, siteId, tab]);

  const scoreBreakdown = summary ? buildScoreBreakdown(module, summary) : null;
  const topRecommendation =
    summary?.recommendation ||
    (module === "aeo"
      ? "先補齊常見問題、短答案與結構化內容，讓 AI 更容易摘用。"
      : "先補齊品牌介紹、引用來源與權威證據，提升 AI 搜尋能見度。");
  const decisionSummary =
    summary?.title ||
    (module === "aeo" ? "尚未產生 AI 回答能力分析" : "尚未產生 AI 能見度分析");
  const tabs = [
    { key: "overview", label: "總覽", href: `/si/${module}` },
    { key: "evidence", label: "證據", href: `/si/${module}?tab=evidence` },
    { key: "actions", label: "行動", href: `/si/${module}?tab=actions` },
  ];
  const activeTab = tabs.find((item) => item.key === tab) || tabs[0];

  return (
    <div className="space-y-6">
      <header className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-blue-700">
              <ModuleIcon className="h-3.5 w-3.5" />
              {eyebrow}
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950">{moduleName}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500">{moduleDesc}</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <select
              value={siteId}
              onChange={(event) => setSiteId(Number(event.target.value))}
              disabled={loadingSites || sites.length === 0}
              className="min-h-11 rounded-2xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-700"
            >
              {sites.length === 0 ? <option value={DEFAULT_SITE_ID}>{emptyTitle}</option> : null}
              {sites.map((site) => (
                <option key={site.id} value={site.id}>
                  {siteLabel(site)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void generateSummary()}
              disabled={generating || isDemo}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50"
            >
              <RotateCcw className={`h-4 w-4 ${generating ? "animate-spin" : ""}`} />
              {generating ? "分析中..." : "重新產生分析"}
            </button>
          </div>
        </div>
      </header>

      <nav className="flex flex-wrap gap-2">
        {tabs.map((item) => (
          <Link
            key={item.key}
            href={item.href}
            className={`rounded-2xl px-4 py-2 text-sm font-bold ${
              activeTab.key === item.key ? "bg-blue-600 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {errorText ? <Notice tone="error" text={errorText} /> : null}
      {loadingSummary ? <Notice text={`正在讀取 ${eyebrow} 分析...`} /> : null}

      {!loadingSummary && !summary ? (
        <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <FileQuestion className="mx-auto h-10 w-10 text-slate-300" />
          <h2 className="mt-4 text-xl font-black text-slate-950">{emptyTitle}</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-slate-500">
            尚未找到分析結果。請選擇站點後重新產生分析，系統會整理 AI Summary、Evidence、Recommendation 與 Action。
          </p>
          <button
            type="button"
            onClick={() => void generateSummary()}
            disabled={generating || isDemo}
            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            產生分析
          </button>
        </section>
      ) : null}

      {summary ? (
        <>
          <section className="grid gap-4 md:grid-cols-4">
            <ScoreCard title={scoreBreakdown?.label || "Score"} value={scoreBreakdown?.total ?? "-"} icon={<Radar className="h-5 w-5" />} />
            <ScoreCard title="證據項目" value={summary.items.length} icon={<Database className="h-5 w-5" />} />
            <ScoreCard title="建議行動" value={summary.actions.length} icon={<Target className="h-5 w-5" />} />
            <ScoreCard title="分析狀態" value={summary.meta?.status || "ready"} icon={<CheckCircle2 className="h-5 w-5" />} />
          </section>

          <section className="rounded-3xl border border-blue-100 bg-blue-50/70 p-6">
            <div className="flex gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-blue-700">AI Summary</p>
                <h2 className="mt-2 text-2xl font-black text-slate-950">{decisionSummary}</h2>
                <p className="mt-2 text-sm leading-7 text-slate-600">{summary.desc || `${moduleName} 分析已整理為可審查的判斷與證據。`}</p>
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
                <h2 className="mt-3 text-xl font-black text-slate-950">{topRecommendation}</h2>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  {module === "aeo"
                    ? "改善後可提高內容被 AI 摘用、直接回答與推薦的機會。"
                    : "改善後可增加品牌被 AI 搜尋看見、理解與引用的機會。"}
                </p>
              </div>
              <Link href={`/si/${module}?tab=actions`} className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-black text-white hover:bg-violet-700">
                查看行動
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </section>

          {activeTab.key === "overview" ? (
            <div className="grid gap-6 xl:grid-cols-2">
              <InfoCard title={scoreBreakdown?.label || "分數拆解"}>
                {scoreBreakdown ? (
                  <div className="space-y-3">
                    {scoreBreakdown.items.map((item) => (
                      <div key={item.label} className="rounded-2xl bg-slate-50 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-bold text-slate-700">{item.label}</span>
                          <span className="text-sm font-black text-slate-950">{item.score}</span>
                        </div>
                        <div className="mt-3 h-2 rounded-full bg-slate-200">
                          <div className="h-2 rounded-full bg-blue-600" style={{ width: `${item.score}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyText text="尚未產生分數拆解。" />
                )}
              </InfoCard>

              <InfoCard title="分析方法">
                {(() => {
                  const copy = methodologyCopy(module);
                  return (
                    <div className="space-y-3 text-sm leading-7 text-slate-600">
                      <p className="font-black text-slate-950">{copy.title}</p>
                      <p>{copy.desc}</p>
                      <p>{copy.cadence}</p>
                    </div>
                  );
                })()}
              </InfoCard>
            </div>
          ) : null}

          {activeTab.key === "evidence" ? (
            <div className="grid gap-6 xl:grid-cols-2">
              <InfoCard title={summary.panelTitle || "證據"}>
                {summary.items.length === 0 ? (
                  <EmptyText text="目前沒有證據項目。" />
                ) : (
                  <div className="space-y-3">
                    {summary.items.map((item) => (
                      <div key={`${item.title}-${item.meta || ""}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-black text-slate-950">{item.title}</h3>
                          {item.confidence ? <span className="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-black text-blue-700">{confidenceLabel(item.confidence)}</span> : null}
                        </div>
                        {item.meta ? <p className="mt-2 text-sm text-slate-500">{item.meta}</p> : null}
                        {item.basis ? <p className="mt-2 text-sm leading-6 text-slate-600">{item.basis}</p> : null}
                        {item.draft ? (
                          <div className="mt-3 rounded-xl border border-violet-100 bg-violet-50 p-3 text-sm leading-6 text-violet-900">
                            <span className="font-black">{draftModeLabel(item.draftMode)}：</span>
                            {item.draft}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </InfoCard>

              <InfoCard title={summary.sideTitle || "補充指標"}>
                {summary.sideItems.length === 0 ? (
                  <EmptyText text="目前沒有補充指標。" />
                ) : (
                  <div className="space-y-3">
                    {summary.sideItems.map((item) => (
                      <div key={item.name} className="rounded-2xl bg-slate-50 p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-slate-700">{item.name}</span>
                          <span className="text-sm font-black text-slate-950">{item.score}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </InfoCard>
            </div>
          ) : null}

          {activeTab.key === "actions" ? (
            <div className="grid gap-6 xl:grid-cols-2">
              <InfoCard title="建議行動">
                {summary.actions.length === 0 ? (
                  <EmptyText text="目前沒有建議行動。" />
                ) : (
                  <div className="space-y-3">
                    {summary.actions.map((action, index) => (
                      <div key={action} className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-black text-white">{index + 1}</div>
                        <p className="text-sm leading-6 text-slate-700">{action}</p>
                      </div>
                    ))}
                  </div>
                )}
              </InfoCard>

              <InfoCard title="歷史紀錄">
                {history.length === 0 ? (
                  <EmptyText text="尚無歷史分析。" />
                ) : (
                  <div className="space-y-3">
                    {history.map((item, index) => (
                      <div key={`${item.meta?.id || index}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center gap-2 text-xs font-black text-slate-500">
                          <History className="h-3.5 w-3.5" />
                          {formatAnalysisDate(item.meta?.analyzed_at || "")}
                        </div>
                        <p className="mt-2 text-sm font-bold text-slate-900">{item.title}</p>
                      </div>
                    ))}
                  </div>
                )}
              </InfoCard>
            </div>
          ) : null}

          <section className="rounded-3xl border border-amber-200 bg-amber-50/70 p-6">
            <div className="flex gap-3">
              <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-amber-700">Business Impact</p>
                <h2 className="mt-2 text-lg font-black text-slate-950">
                  {module === "aeo"
                    ? "回答覆蓋不足會讓高意圖問題的曝光機會流向競品。"
                    : "引用與權威訊號不足，可能讓競品優先出現在 AI 建議答案中。"}
                </h2>
              </div>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

function Notice({ text, tone = "default" }: { text: string; tone?: "default" | "error" }) {
  return (
    <div className={`rounded-3xl border p-6 text-sm font-semibold shadow-sm ${tone === "error" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-slate-200 bg-white text-slate-500"}`}>
      {text}
    </div>
  );
}

function ScoreCard({ title, value, icon }: { title: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm font-medium text-slate-500">{title}</div>
        <div className="text-slate-400">{icon}</div>
      </div>
      <div className="text-4xl font-bold tracking-tight text-slate-900">{value}</div>
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
        <Lightbulb className="h-5 w-5 text-blue-600" />
        {title}
      </div>
      {children}
    </section>
  );
}

function EmptyText({ text }: { text: string }) {
  return <div className="text-sm text-slate-500">{text}</div>;
}
