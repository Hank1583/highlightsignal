"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  HeartPulse,
  Info,
  LineChart,
  ListChecks,
  Loader2,
  MessageSquareText,
  RotateCcw,
  Search,
  Send,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import OnboardingChecklist from "@/components/dashboard/OnboardingChecklist";
import { useWorkspace } from "@/components/workspace/WorkspaceProvider";

type Lens = "overview" | "traffic" | "priority" | "seo" | "visibility";
type PresetId = "traffic_drop" | "daily_priority" | "seo_score" | "aeo_geo_visibility";
type Tone = "green" | "amber" | "rose" | "blue";

type Props = {
  ga: {
    enabled: boolean;
    connected: boolean;
    status?: "ready" | "not_connected" | "error";
    users: number;
    sessions: number;
    pageviews: number;
    conversions: number;
    message: string;
    trend?: { label: string; users: number; sessions: number }[];
  };
  seo: {
    enabled: boolean;
    connected: boolean;
    status?: "ready" | "not_connected" | "error";
    siteCount: number;
    score: number | null;
    issues: number;
    opportunities: number;
    message: string;
    comparison: {
      available: boolean;
      scoreBefore: number;
      scoreAfter: number;
      issuesBefore: number;
      issuesAfter: number;
      fixed: number;
      added: number;
      remaining: number;
    } | null;
  };
  rangeLabel: string;
  updatedAt: string;
};

type AiBlock =
  | { type: "narrative"; eyebrow: string; text: string }
  | {
      type: "metrics";
      columns?: 3 | 4;
      items: { label: string; value: string; sub?: string; tone?: Tone | string }[];
    }
  | {
      type: "metricHero";
      label: string;
      value: string;
      sub?: string;
      badge?: string;
      badgeTone?: Tone | string;
      asideValue?: string;
      asideLabel?: string;
    }
  | {
      type: "chart";
      title: string;
      sub?: string;
      highlightIndex?: number;
      bars: { label: string; value: number }[];
    }
  | {
      type: "trendChart";
      title: string;
      sub?: string;
      series: { label: string; tone?: Tone | string; data: { label: string; value: number }[] }[];
    }
  | {
      type: "issues";
      title: string;
      items: { severity?: "high" | "mid" | "low" | string; name: string; status?: string; impact?: string; href?: string }[];
    }
  | {
      type: "action";
      urgent?: boolean;
      num?: number;
      title: string;
      desc?: string;
      href?: string;
      tags?: { text: string; tone?: "time" | "impact" | "warn" | string }[];
    }
  | {
      type: "scoreBreakdown";
      title: string;
      items: { label: string; value: number; tone?: Tone | string }[];
    };

type WorkflowData = {
  context_key?: string;
  recommendation: { status?: string; title?: string; description?: string } | null;
  decision: { decision?: "accepted" | "skipped" } | null;
  task: {
    id: number;
    status?: string;
    steps?: { id: number; title: string; status: "pending" | "completed" }[];
  } | null;
  outcome: {
    status?: string;
    result?: Record<string, { before: number; after: number; change: number; change_percent: number | null }> | null;
    measured_at?: string | null;
  } | null;
};

const lensOptions: { id: Lens; label: string; preset?: PresetId }[] = [
  { id: "overview", label: "總覽" },
  { id: "traffic", label: "流量診斷", preset: "traffic_drop" },
  { id: "priority", label: "今日優先", preset: "daily_priority" },
  { id: "seo", label: "SEO 分數", preset: "seo_score" },
  { id: "visibility", label: "AI 能見度", preset: "aeo_geo_visibility" },
];

const presetPrompts: { id: PresetId; label: string; question: string }[] = [
  { id: "traffic_drop", label: "流量下滑", question: "最近流量是否有異常下滑？" },
  { id: "daily_priority", label: "今日優先事項", question: "今天最需要優先處理什麼？" },
  { id: "seo_score", label: "SEO 分數", question: "SEO 分數代表什麼風險？" },
  { id: "aeo_geo_visibility", label: "AI 能見度", question: "AEO / GEO 目前有哪些可改善的地方？" },
];

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-TW").format(value);
}

function formatDateTime(value: string) {
  try {
    return new Intl.DateTimeFormat("zh-TW", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function toneClass(tone?: Tone | string) {
  if (tone === "green") return "bg-emerald-50 text-emerald-700";
  if (tone === "amber") return "bg-amber-50 text-amber-700";
  if (tone === "rose") return "bg-rose-50 text-rose-700";
  return "bg-blue-50 text-blue-700";
}

function barColor(tone?: Tone | string) {
  if (tone === "green") return "bg-emerald-500";
  if (tone === "amber") return "bg-amber-500";
  if (tone === "rose") return "bg-rose-500";
  return "bg-blue-600";
}

function softBarColor(tone?: Tone | string) {
  if (tone === "green") return "bg-emerald-300";
  if (tone === "amber") return "bg-amber-300";
  if (tone === "rose") return "bg-rose-300";
  return "bg-blue-300";
}

function buildDefaultRecommendation(ga: Props["ga"], seo: Props["seo"]) {
  if (!ga.enabled && !seo.enabled) {
    return {
      summary: "目前尚未啟用可分析的資料模組。",
      recommendation: "先啟用網站成效或搜尋與 AI 成效，讓決策中心取得基礎訊號。",
      impact: "資料不足時，AI 只能提供一般建議，無法排序真正重要的行動。",
      href: "/account",
      contextKey: "dashboard:setup_modules",
      reason: "GA 與 SEO 模組都尚未啟用，沒有足夠資料可以產生可靠排序。",
    };
  }

  if (!ga.connected) {
    return {
      summary: "網站成效資料尚未連接。",
      recommendation: "先連接 GA 資料來源，建立流量、使用者與轉換的基準。",
      impact: "缺少 GA 後，決策中心無法判斷成效變化是否真的影響商業結果。",
      href: "/ga/account",
      contextKey: "dashboard:connect_ga",
      reason: "GA 是衡量流量與轉換的主要來源；未連接時，其他建議缺少成效驗證。",
    };
  }

  if (!seo.connected) {
    return {
      summary: "搜尋資料尚未建立完整基準。",
      recommendation: "新增 SEO 站點並產生 summary，讓 AI 能比對搜尋健康度與內容機會。",
      impact: "缺少搜尋資料時，AI 無法判斷流量變化與搜尋能見度之間的關係。",
      href: "/si/seo",
      contextKey: "dashboard:create_seo_site",
      reason: "GA 已可用，但尚未有 SEO 健康度與技術問題資料，因此優先補齊搜尋基準。",
    };
  }

  if (seo.issues > 0) {
    return {
      summary: `目前有 ${seo.issues} 個 SEO 技術問題需要處理。`,
      recommendation: "先處理高風險技術問題，再重新掃描確認分數與問題數是否改善。",
      impact: "技術問題會影響索引品質，也可能降低內容被 AI 搜尋理解與引用的機會。",
      href: "/si/seo?tab=technical",
      contextKey: "dashboard:fix_seo_issues",
      reason: "GA 與 SEO 都已接通，且 SEO 技術問題是目前最明確、可執行、可衡量的風險。",
    };
  }

  return {
    summary: "資料基礎已可用，下一步適合擴大搜尋與 AI 能見度。",
    recommendation: "檢查 AEO / GEO 分析，找出可被 AI 回答與引用的內容缺口。",
    impact: "當 GA 與 SEO 基準穩定後，AEO / GEO 能協助提高未來 AI 搜尋入口的曝光機會。",
    href: "/si/aeo",
    contextKey: "dashboard:expand_ai_visibility",
    reason: "基礎資料已完整且未見明顯 SEO 技術阻塞，下一個高槓桿方向是 AI 搜尋能見度。",
  };
}

function sanitizeBlocks(value: unknown): AiBlock[] {
  return Array.isArray(value) ? (value.filter(Boolean) as AiBlock[]) : [];
}

function getErrorMessage(json: any, fallback: string) {
  return json?.error?.message || json?.message || fallback;
}

function completedStepCount(workflow: WorkflowData | null) {
  return (workflow?.task?.steps || []).filter((step) => step.status === "completed").length;
}

function totalStepCount(workflow: WorkflowData | null) {
  return workflow?.task?.steps?.length || 0;
}

function taskProgress(workflow: WorkflowData | null) {
  const total = totalStepCount(workflow);
  if (!total) return 0;
  return Math.round((completedStepCount(workflow) / total) * 100);
}

export default function DashboardWorkspace({ ga, seo, rangeLabel, updatedAt }: Props) {
  const { currentWorkspace } = useWorkspace();
  const [activeLens, setActiveLens] = useState<Lens>("overview");
  const [question, setQuestion] = useState("");
  const [composedBlocks, setComposedBlocks] = useState<AiBlock[] | null>(null);
  const [aiError, setAiError] = useState("");
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [reviewDecision, setReviewDecision] = useState<"approve" | "revise" | "dismiss" | null>(null);
  const [workflow, setWorkflow] = useState<WorkflowData | null>(null);
  const [workflowBusy, setWorkflowBusy] = useState(false);
  const [workflowError, setWorkflowError] = useState("");
  const [isPending, startTransition] = useTransition();

  const recommendation = useMemo(() => buildDefaultRecommendation(ga, seo), [ga, seo]);
  const trend = useMemo(() => {
    const grouped = new Map<string, { label: string; users: number; sessions: number }>();
    for (const item of ga.trend || []) {
      const current = grouped.get(item.label) || { label: item.label, users: 0, sessions: 0 };
      current.users += item.users;
      current.sessions += item.sessions;
      grouped.set(item.label, current);
    }
    return Array.from(grouped.values());
  }, [ga.trend]);

  const confidence = useMemo(() => {
    const base = 42 + (ga.enabled ? 8 : 0) + (ga.connected ? 16 : 0) + (seo.enabled ? 8 : 0) + (seo.connected ? 18 : 0);
    return clamp(base - Math.min(seo.issues * 2, 16), 35, 95);
  }, [ga.connected, ga.enabled, seo.connected, seo.enabled, seo.issues]);

  const progress = taskProgress(workflow);
  const completedSteps = completedStepCount(workflow);
  const totalSteps = totalStepCount(workflow);
  const visibilityRisk = seo.connected ? clamp(seo.issues * 4, 6, 32) : 18;
  const seoScore = seo.score ?? (seo.connected ? 62 : 0);

  const localBlocks = useMemo<AiBlock[]>(() => {
    const chartBars = trend.length
      ? trend.slice(-30).map((item) => ({ label: item.label, value: item.sessions }))
      : [
          { label: "Users", value: ga.users },
          { label: "Sessions", value: ga.sessions },
          { label: "Conversions", value: ga.conversions },
        ];

    if (activeLens === "traffic") {
      return [
        {
          type: "narrative",
          eyebrow: "AI 流量診斷",
          text: ga.connected
            ? "流量問題不能只看總使用者數，應先比對工作階段、轉換與 SEO 健康度，確認波動是否來自搜尋入口頁或來源品質。"
            : "目前 GA 尚未連接，流量診斷缺少最重要的基準資料。",
        },
        {
          type: "metricHero",
          label: "近 30 天工作階段",
          value: formatNumber(ga.sessions),
          sub: ga.connected ? "可用於來源品質與轉換診斷" : ga.message,
          badge: ga.connected ? "資料就緒" : "缺少資料來源",
          badgeTone: ga.connected ? "green" : "rose",
          asideValue: formatNumber(ga.conversions),
          asideLabel: "轉換事件",
        },
        { type: "chart", title: "流量脈衝", sub: "用最近趨勢判斷是否需要下鑽來源或頁面層級資料。", bars: chartBars },
      ];
    }

    if (activeLens === "priority") {
      return [
        {
          type: "narrative",
          eyebrow: "AI 優先順序",
          text: recommendation.reason,
        },
        {
          type: "action",
          urgent: seo.connected && seo.issues > 0,
          num: 1,
          title: recommendation.recommendation,
          desc: recommendation.impact,
          href: recommendation.href,
          tags: [
            { text: "高影響", tone: "impact" },
            { text: "可衡量", tone: "time" },
            { text: `${confidence}% 信心度`, tone: confidence >= 70 ? "impact" : "warn" },
          ],
        },
        {
          type: "metrics",
          columns: 3,
          items: [
            { label: "AI 信心度", value: `${confidence}%`, sub: "依資料完整度與風險計算", tone: "blue" },
            { label: "SEO 問題", value: String(seo.issues), sub: "技術風險", tone: seo.issues ? "rose" : "green" },
            { label: "任務進度", value: workflow?.task ? `${progress}%` : "未建立", sub: "人工確認後追蹤", tone: workflow?.task ? "green" : "amber" },
          ],
        },
      ];
    }

    if (activeLens === "seo") {
      return [
        {
          type: "narrative",
          eyebrow: "AI SEO 風險分析",
          text: seo.connected
            ? "SEO 健康度的重點不是分數本身，而是哪些底層問題會阻礙索引、Schema 理解與 AI 摘要引用。"
            : "目前缺少 SEO 站點，無法建立健康分數、索引覆蓋或 Schema 完整度。",
        },
        {
          type: "metricHero",
          label: "SEO 健康分數",
          value: seo.score === null ? "-" : String(seo.score),
          sub: seo.connected ? `偵測到 ${seo.issues} 個技術問題` : seo.message,
          badge: seo.connected ? "可分析" : "尚未設定",
          badgeTone: seo.connected && seo.issues > 0 ? "amber" : "green",
          asideValue: String(seo.opportunities),
          asideLabel: "內容機會",
        },
        {
          type: "scoreBreakdown",
          title: "SEO 就緒度拆解",
          items: [
            { label: "內容覆蓋", value: seo.connected ? 82 : 0, tone: "blue" },
            { label: "技術 SEO", value: seo.connected ? clamp(92 - seo.issues * 8, 25, 92) : 0, tone: seo.issues ? "rose" : "green" },
            { label: "Schema 就緒度", value: seo.connected ? 64 : 0, tone: "amber" },
            { label: "AI 理解度", value: seo.connected ? clamp(seoScore - 8, 20, 90) : 0, tone: "blue" },
          ],
        },
        {
          type: "issues",
          title: "AI 排序的 SEO 問題",
          items: [
            {
              severity: seo.issues > 0 ? "high" : "low",
              name: seo.issues > 0 ? "影響搜尋理解的技術問題" : "未偵測到重大技術問題",
              status: seo.issues > 0 ? "需要處理" : "持續觀察",
              impact: seo.issues > 0 ? `-${visibilityRisk}%` : "穩定",
              href: "/si/seo",
            },
          ],
        },
      ];
    }

    if (activeLens === "visibility") {
      return [
        {
          type: "narrative",
          eyebrow: "AI 能見度編排",
          text: seo.connected
            ? "SEO 基礎資料已可用，下一步應檢查內容是否能被 AI 搜尋摘要、問答與引用場景正確理解。"
            : "AEO / GEO 依賴 SEO 站點資料。請先建立站點，再產生 AI 能見度分析。",
        },
        {
          type: "metricHero",
          label: "AI 能見度就緒度",
          value: seo.connected ? "可分析" : "受阻",
          sub: seo.connected ? "可以開始 AEO / GEO 分析" : "需要 SEO 資料基準",
          badge: seo.connected ? "建議產生" : "需要設定",
          badgeTone: seo.connected ? "green" : "amber",
          asideValue: String(seo.opportunities),
          asideLabel: "回答機會",
        },
        {
          type: "metrics",
          columns: 3,
          items: [
            { label: "AEO", value: seo.connected ? "可分析" : "-", sub: "問答內容優化", tone: "blue" },
            { label: "GEO", value: seo.connected ? "可分析" : "-", sub: "AI 引用就緒度", tone: "green" },
            { label: "驗證資料", value: ga.connected ? "GA 已連接" : "缺少 GA", sub: "追蹤成效影響", tone: ga.connected ? "green" : "amber" },
          ],
        },
      ];
    }

    return [
      {
        type: "trendChart",
        title: "流量趨勢",
        sub: "使用者與工作階段趨勢，用於判斷是否需要下鑽來源或頁面。",
        series: [
          { label: "Users", tone: "blue", data: trend.slice(-30).map((item) => ({ label: item.label, value: item.users })) },
          { label: "Sessions", tone: "green", data: trend.slice(-30).map((item) => ({ label: item.label, value: item.sessions })) },
        ],
      },
    ];
  }, [activeLens, confidence, ga, progress, recommendation, seo, seoScore, trend, visibilityRisk, workflow?.task]);

  const visibleBlocks = composedBlocks ?? localBlocks;

  const workflowRequest = async (body: Record<string, unknown>) => {
    const response = await fetch(`/api/workspaces/${currentWorkspace.id}/dashboard/workflow`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        context_key: recommendation.contextKey,
        ...body,
      }),
    });
    const json = await response.json();
    if (!response.ok || !json?.ok || !json?.data) {
      throw new Error(getErrorMessage(json, "Dashboard workflow failed."));
    }
    setWorkflow(json.data);
    return json.data as WorkflowData;
  };

  const loadWorkflow = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/workspaces/${currentWorkspace.id}/dashboard/workflow?context_key=${encodeURIComponent(recommendation.contextKey)}`,
        { cache: "no-store" }
      );
      const json = await response.json();
      if (!response.ok || !json?.ok || !json?.data) return;
      setWorkflow(json.data as WorkflowData);
      if (json.data?.decision?.decision === "accepted") setReviewDecision("approve");
      if (json.data?.decision?.decision === "skipped") setReviewDecision("dismiss");
    } catch {
      // The dashboard can still render live signals if workflow history is unavailable.
    }
  }, [currentWorkspace.id, recommendation.contextKey]);

  useEffect(() => {
    // Clear the previous Workspace's task/decision state immediately on switch so
    // it never renders while the new Workspace's workflow is still loading.
    setWorkflow(null);
    setReviewDecision(null);
    setWorkflowError("");
    setComposedBlocks(null);
  }, [currentWorkspace.id]);

  useEffect(() => {
    void loadWorkflow();
  }, [loadWorkflow]);

  const approveRecommendation = async () => {
    setReviewDecision("approve");
    setWorkflowBusy(true);
    setWorkflowError("");

    try {
      await workflowRequest({
        action: "create_task",
        title: recommendation.recommendation,
        description: `${recommendation.summary}\n\n${recommendation.impact}`,
        steps: [
          { title: "確認目前資料與判斷", description: recommendation.summary },
          { title: "執行建議行動", description: recommendation.recommendation },
          { title: "回到決策中心檢查結果", description: "完成後重新查看指標、任務與後續成效。" },
        ],
        baseline: {
          sessions: ga.sessions,
          conversions: ga.conversions,
          seo_score: seo.score ?? 0,
          seo_issues: seo.issues,
        },
      });
    } catch (error) {
      setWorkflowError(error instanceof Error ? error.message : "建立行動任務失敗。");
    } finally {
      setWorkflowBusy(false);
    }
  };

  const skipRecommendation = async () => {
    setReviewDecision("dismiss");
    setWorkflowBusy(true);
    setWorkflowError("");

    try {
      await workflowRequest({
        action: "save_decision",
        decision: "skipped",
        title: recommendation.recommendation,
        description: recommendation.impact,
      });
    } catch (error) {
      setWorkflowError(error instanceof Error ? error.message : "儲存略過狀態失敗。");
    } finally {
      setWorkflowBusy(false);
    }
  };

  const measureOutcome = async () => {
    setWorkflowBusy(true);
    setWorkflowError("");

    try {
      await workflowRequest({
        action: "measure_outcome",
        title: recommendation.recommendation,
        description: recommendation.impact,
        metrics: {
          sessions: ga.sessions,
          conversions: ga.conversions,
          seo_score: seo.score ?? 0,
          seo_issues: seo.issues,
        },
      });
    } catch (error) {
      setWorkflowError(error instanceof Error ? error.message : "更新成果衡量失敗。");
    } finally {
      setWorkflowBusy(false);
    }
  };

  const askAi = (presetId?: PresetId, presetQuestion?: string) => {
    const finalQuestion = (presetQuestion || question).trim();
    if (!finalQuestion) return;

    setAiError("");
    startTransition(async () => {
      try {
        const response = await fetch("/api/dashboard/ai-compose", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: finalQuestion, presetId }),
        });
        const json = await response.json();
        if (!response.ok || !json?.ok) {
          throw new Error(json?.message || "AI 分析失敗，請稍後再試。");
        }
        setComposedBlocks(sanitizeBlocks(json.blocks));
        if (json.lens && lensOptions.some((item) => item.id === json.lens)) {
          setActiveLens(json.lens);
        }
        setQuestion(finalQuestion);
      } catch (error) {
        setAiError(error instanceof Error ? error.message : "AI 分析失敗，請稍後再試。");
      }
    });
  };

  const handleAskSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    askAi();
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-slate-950 p-6 text-white shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-wide text-blue-100">
              <Sparkles className="h-3.5 w-3.5" />
              決策中心
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight md:text-4xl">今日決策中心</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
              先確認今天最值得處理的問題，再把決策轉成任務並衡量實際成果。
            </p>
          </div>
          <div className="grid gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm text-slate-200 sm:grid-cols-2 lg:min-w-[360px]">
            <MiniStat label="分析區間" value={rangeLabel} />
            <MiniStat label="更新" value={formatDateTime(updatedAt)} />
            <MiniStat label="AI 信心度" value={`${confidence}%`} />
            <MiniStat label="資料就緒" value={`${[ga.connected, seo.connected].filter(Boolean).length} / 2`} />
          </div>
        </div>
      </section>

      <OnboardingChecklist ga={ga} seo={seo} />

      <DecisionProgress
        hasData={ga.connected || seo.connected}
        decision={workflow?.decision?.decision}
        hasTask={Boolean(workflow?.task)}
        progress={progress}
        outcomeStatus={workflow?.outcome?.status}
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-black text-blue-700">
              <Target className="h-4 w-4" />
              今日建議
            </div>
            <h2 className="mt-2 text-2xl font-black text-slate-950">今天最值得處理的事項</h2>
          </div>
          <button
            type="button"
            onClick={() => setEvidenceOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-black text-slate-700 hover:border-blue-300 hover:text-blue-700"
          >
            <Info className="h-4 w-4" />
            查看分析依據
          </button>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-5">
            <div className="border-l-4 border-blue-600 pl-4">
              <p className="text-xs font-black text-blue-700">AI 判讀</p>
              <h3 className="mt-2 text-xl font-black leading-8 text-slate-950">{recommendation.summary}</h3>
              <p className="mt-2 text-sm leading-7 text-slate-600">{recommendation.impact}</p>
            </div>
            <div className="border-t border-slate-100 pt-5">
              <p className="text-sm font-black text-slate-500">建議行動</p>
              <p className="mt-2 text-lg font-black leading-8 text-slate-950">{recommendation.recommendation}</p>
              <Link href={recommendation.href} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-black text-white hover:bg-blue-700">
                前往處理
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
            {!workflow?.task ? (
              <>
                <p className="text-xs font-black text-slate-500">人工確認</p>
                <h3 className="mt-2 text-lg font-black text-slate-950">你是否同意這個優先順序？</h3>
                {workflow?.decision?.decision === "skipped" ? (
                  <p className="mt-2 text-sm leading-6 text-amber-700">這項建議已略過；需要時仍可重新建立行動任務。</p>
                ) : null}
                <div className="mt-4 grid gap-2">
                  <ReviewButton
                    active={reviewDecision === "approve"}
                    disabled={workflowBusy}
                    onClick={() => void approveRecommendation()}
                    icon={workflowBusy && reviewDecision === "approve" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    label={workflowBusy && reviewDecision === "approve" ? "建立中..." : "同意，建立行動"}
                  />
                  <ReviewButton
                    active={reviewDecision === "revise"}
                    disabled={workflowBusy}
                    onClick={() => setReviewDecision("revise")}
                    icon={<RotateCcw className="h-4 w-4" />}
                    label="需要調整"
                  />
                  <ReviewButton
                    active={reviewDecision === "dismiss"}
                    disabled={workflowBusy}
                    onClick={() => void skipRecommendation()}
                    icon={<Search className="h-4 w-4" />}
                    label={workflowBusy && reviewDecision === "dismiss" ? "儲存中..." : "先略過"}
                  />
                </div>
                {reviewDecision === "revise" ? (
                  <p className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-700">
                    可在下方「問 AI」補充條件，再重新判斷。
                  </p>
                ) : null}
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 text-xs font-black text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  {workflow.outcome?.status === "measured" ? "成果已更新" : progress === 100 ? "任務已完成" : "任務執行中"}
                </div>
                <div className="mt-3 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-3xl font-black text-slate-950">{progress}%</p>
                    <p className="mt-1 text-sm text-slate-500">{completedSteps} / {totalSteps} 個步驟完成</p>
                  </div>
                  <span className="text-xs font-bold text-slate-400">執行進度</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-600">
                  {workflow.outcome?.status === "measured"
                    ? "最新 GA 與 SEO 指標已和建立任務時的基準完成比較。"
                    : progress === 100
                      ? "執行已完成，現在可以更新最新指標並衡量實際成果。"
                      : "到任務進度頁勾選已完成步驟；全部完成後即可衡量成果。"}
                </p>
                <div className="mt-4 grid gap-2">
                  {progress === 100 && workflow.outcome?.status !== "measured" ? (
                    <button
                      type="button"
                      onClick={() => void measureOutcome()}
                      disabled={workflowBusy}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-60"
                    >
                      {workflowBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LineChart className="h-4 w-4" />}
                      {workflowBusy ? "更新中..." : "更新成果衡量"}
                    </button>
                  ) : null}
                  <Link href="/dashboard/tasks" className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-black text-slate-700 hover:border-blue-300 hover:text-blue-700">
                    <ListChecks className="h-4 w-4" />
                    {workflow.outcome?.status === "measured" ? "查看成果與任務" : "查看任務進度"}
                  </Link>
                </div>
              </>
            )}
            {workflowError ? <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">{workflowError}</p> : null}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeader title="資料基礎" description="本次判斷採用的近 30 天 GA 與最新 SEO 資料。" />
        <div className="grid gap-4 md:grid-cols-4">
          <MetricCard title="使用者" value={formatNumber(ga.users)} sub={ga.connected ? "GA 已連接" : ga.message} />
          <MetricCard title="工作階段" value={formatNumber(ga.sessions)} sub="近 30 天" />
          <MetricCard title="轉換事件" value={formatNumber(ga.conversions)} sub="GA 轉換事件" />
          <MetricCard title="SEO 分數" value={seo.score === null ? "-" : seo.score} sub={seo.connected ? `${seo.issues} 個問題` : seo.message} />
        </div>
      </section>

      <section className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex min-w-0 flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0 md:max-w-sm">
              <SectionHeader title="深入分析" description="需要更多細節時，再切換主題查看；總覽只保留一次流量趨勢。" />
            </div>
            <div className="flex max-w-full shrink-0 gap-2 overflow-x-auto pb-1" role="tablist" aria-label="分析主題">
              {lensOptions.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={activeLens === item.id}
                  onClick={() => {
                    setActiveLens(item.id);
                    setComposedBlocks(null);
                  }}
                  className={`whitespace-nowrap rounded-lg border px-3 py-2 text-sm font-bold transition ${
                    activeLens === item.id
                      ? "border-blue-200 bg-blue-50 text-blue-700"
                      : "border-slate-200 text-slate-600 hover:border-blue-200 hover:bg-blue-50"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 flex items-center gap-2 text-xs font-bold text-slate-400">
            <span className="h-2 w-2 rounded-full bg-blue-600" />
            {composedBlocks ? `AI 已更新 ${visibleBlocks.length} 個分析區塊` : `${visibleBlocks.length} 個分析區塊`}
          </div>
          <div className="mt-4 space-y-4">
            {visibleBlocks.map((block, index) => (
              <AiBlockView key={`${block.type}-${index}`} block={block} />
            ))}
          </div>
        </section>

        <aside className="min-w-0">
          <section className="sticky top-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-black text-slate-900">
              <MessageSquareText className="h-4 w-4 text-blue-600" />
              問 AI
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {presetPrompts.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => askAi(preset.id, preset.question)}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:border-blue-300 hover:text-blue-700"
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <form onSubmit={handleAskSubmit} className="mt-4 flex gap-2">
              <input
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="問 AI 要分析什麼..."
                className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
              />
              <button
                type="submit"
                disabled={isPending || !question.trim()}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white disabled:opacity-50"
                aria-label="送出 AI 問題"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </form>
            {aiError ? <p className="mt-3 text-sm font-semibold text-rose-600">{aiError}</p> : null}
          </section>
        </aside>
      </section>

      {evidenceOpen ? (
        <EvidenceDrawer
          ga={ga}
          seo={seo}
          confidence={confidence}
          recommendation={recommendation}
          workflow={workflow}
          onClose={() => setEvidenceOpen(false)}
        />
      ) : null}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 font-black text-white">{value}</p>
    </div>
  );
}

function DecisionProgress({
  hasData,
  decision,
  hasTask,
  progress,
  outcomeStatus,
}: {
  hasData: boolean;
  decision?: "accepted" | "skipped";
  hasTask: boolean;
  progress: number;
  outcomeStatus?: string;
}) {
  type StepStatus = "done" | "current" | "pending";
  const decisionMade = decision === "accepted" || decision === "skipped";
  const measured = outcomeStatus === "measured";
  const steps: { number: number; title: string; description: string; status: StepStatus }[] = [
    {
      number: 1,
      title: "讀取資料",
      description: hasData ? "分析訊號已就緒" : "等待資料來源",
      status: hasData ? "done" : "current",
    },
    {
      number: 2,
      title: "確認建議",
      description: decision === "skipped" ? "本次建議已略過" : decision === "accepted" ? "已同意執行" : "等待人工確認",
      status: decisionMade ? "done" : hasData ? "current" : "pending",
    },
    {
      number: 3,
      title: "執行任務",
      description: progress === 100 ? "所有步驟已完成" : hasTask ? `目前完成 ${progress}%` : "尚未建立任務",
      status: progress === 100 ? "done" : hasTask ? "current" : "pending",
    },
    {
      number: 4,
      title: "衡量成果",
      description: measured ? "成效比較已更新" : progress === 100 ? "可更新最新成果" : "完成任務後進行",
      status: measured ? "done" : progress === 100 ? "current" : "pending",
    },
  ];

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-label="決策進度">
      <div className="grid divide-y divide-slate-200 md:grid-cols-4 md:divide-x md:divide-y-0">
        {steps.map((step) => (
          <div key={step.number} className={`flex min-h-24 gap-3 p-4 ${step.status === "current" ? "bg-blue-50/70" : ""}`}>
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black ${
                step.status === "done"
                  ? "bg-emerald-600 text-white"
                  : step.status === "current"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-100 text-slate-400"
              }`}
            >
              {step.status === "done" ? <Check className="h-4 w-4" /> : step.number}
            </span>
            <div className="min-w-0">
              <h2 className={`font-black ${step.status === "pending" ? "text-slate-400" : "text-slate-950"}`}>{step.title}</h2>
              <p className="mt-1 text-sm leading-5 text-slate-500">{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col gap-1">
      <h2 className="text-xl font-black text-slate-950">{title}</h2>
      <p className="text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

function MetricCard({ title, value, sub }: { title: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-bold text-slate-500">{title}</p>
      <p className="mt-3 text-3xl font-black text-slate-950">{value}</p>
      {sub ? <p className="mt-2 text-xs leading-5 text-slate-400">{sub}</p> : null}
    </div>
  );
}

function EvidenceItem({ label, value, sub }: { label: string; value: string | number; sub: string }) {
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
  disabled,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold disabled:opacity-60 ${
        active ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-300 bg-white text-slate-700 hover:border-blue-300 hover:text-blue-700"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function AiBlockView({ block }: { block: AiBlock }) {
  if (block.type === "narrative") {
    return (
      <div className="rounded-3xl border border-blue-100 bg-blue-50 p-5">
        <p className="text-xs font-black uppercase tracking-wide text-blue-700">{block.eyebrow}</p>
        <p className="mt-2 text-sm leading-7 text-slate-700">{block.text}</p>
      </div>
    );
  }

  if (block.type === "metricHero") {
    return (
      <div className="flex flex-col gap-5 rounded-3xl border border-slate-200 bg-white p-5 md:flex-row md:items-center">
        <div className="flex-1">
          <p className="text-sm font-black text-slate-500">{block.label}</p>
          <p className="mt-3 text-4xl font-black text-slate-950">{block.value}</p>
          {block.sub ? <p className="mt-2 text-sm text-slate-500">{block.sub}</p> : null}
          {block.badge ? <p className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-bold ${toneClass(block.badgeTone)}`}>{block.badge}</p> : null}
        </div>
        {block.asideValue ? (
          <div className="rounded-2xl bg-slate-50 p-4 text-left md:text-right">
            <p className="text-2xl font-black text-slate-950">{block.asideValue}</p>
            <p className="mt-1 text-xs font-semibold text-slate-400">{block.asideLabel}</p>
          </div>
        ) : null}
      </div>
    );
  }

  if (block.type === "metrics") {
    const columns = block.columns === 4 ? "repeat(4, minmax(0, 1fr))" : "repeat(3, minmax(0, 1fr))";
    return (
      <div className="grid gap-3 overflow-x-auto" style={{ gridTemplateColumns: columns }}>
        {block.items.map((item) => (
          <EvidenceItem key={item.label} label={item.label} value={item.value} sub={item.sub || ""} />
        ))}
      </div>
    );
  }

  if (block.type === "chart") {
    const bars = block.bars || [];
    const max = Math.max(...bars.map((item) => Math.max(0, item.value)), 1);
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-black text-slate-950">{block.title}</p>
            {block.sub ? <p className="mt-1 text-sm text-slate-500">{block.sub}</p> : null}
          </div>
          <LineChart className="h-5 w-5 text-blue-600" />
        </div>
        <div className="mt-6 flex h-44 items-end gap-2">
          {bars.map((item, index) => (
            <div key={`${item.label}-${index}`} className="flex min-w-8 flex-1 flex-col items-center gap-2">
              <div
                className={`w-full rounded-t ${block.highlightIndex === index ? "bg-blue-700" : "bg-blue-300"}`}
                style={{ height: `${Math.max(8, (Math.max(0, item.value) / max) * 150)}px` }}
              />
              <span className="text-[10px] font-bold text-slate-400">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (block.type === "trendChart") {
    const labels = Array.from(new Set(block.series.flatMap((serie) => serie.data.map((point) => point.label))));
    const max = Math.max(...block.series.flatMap((serie) => serie.data.map((point) => Math.max(0, point.value))), 1);
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="font-black text-slate-950">{block.title}</p>
            {block.sub ? <p className="mt-1 text-sm text-slate-500">{block.sub}</p> : null}
          </div>
          <div className="flex flex-wrap gap-3">
            {block.series.map((serie) => (
              <span key={serie.label} className="inline-flex items-center gap-2 text-xs font-bold text-slate-500">
                <span className={`h-2.5 w-2.5 rounded-full ${barColor(serie.tone)}`} />
                {serie.label}
              </span>
            ))}
          </div>
        </div>
        <div className="mt-6 flex h-52 items-end gap-2 overflow-x-auto pb-2">
          {labels.map((label, index) => (
            <div key={`${label}-${index}`} className="flex min-w-10 flex-1 flex-col items-center gap-2">
              <div className="flex h-44 w-full items-end justify-center gap-1">
                {block.series.map((serie) => {
                  const value = serie.data.find((point) => point.label === label)?.value || 0;
                  return <div key={serie.label} className={`w-3 rounded-t ${softBarColor(serie.tone)}`} style={{ height: `${Math.max(8, (value / max) * 160)}px` }} />;
                })}
              </div>
              <span className="text-[10px] font-bold text-slate-400">{label}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (block.type === "issues") {
    return (
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-5 py-3">
          <ListChecks className="h-4 w-4 text-slate-500" />
          <h3 className="font-black text-slate-800">{block.title}</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {block.items.map((item, index) => (
            <Link key={`${item.name}-${index}`} href={item.href || "/dashboard"} className="grid gap-3 px-5 py-4 transition hover:bg-blue-50 md:grid-cols-[1fr_120px_90px]">
              <div className="flex items-center gap-3">
                <span className={`h-2.5 w-2.5 rounded-full ${item.severity === "high" ? "bg-rose-500" : item.severity === "mid" ? "bg-amber-500" : "bg-emerald-500"}`} />
                <span className="font-bold text-slate-950">{item.name}</span>
              </div>
              <span className="text-sm font-bold text-slate-500">{item.status || "待確認"}</span>
              <span className="text-sm font-black text-rose-600">{item.impact || "-"}</span>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  if (block.type === "scoreBreakdown") {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2">
          <HeartPulse className="h-5 w-5 text-blue-600" />
          <h3 className="font-black text-slate-950">{block.title}</h3>
        </div>
        <div className="mt-5 grid gap-3">
          {block.items.map((item, index) => (
            <div key={`${item.label}-${index}`} className="grid grid-cols-[120px_1fr_42px] items-center gap-3">
              <p className="text-sm font-bold text-slate-600">{item.label}</p>
              <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full ${barColor(item.tone)}`} style={{ width: `${clamp(item.value, 0, 100)}%` }} />
              </div>
              <p className="text-right text-sm font-black text-slate-800">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <Link href={block.href || "/dashboard"} className={`flex gap-4 rounded-3xl border bg-white p-5 shadow-sm transition hover:bg-blue-50 ${block.urgent ? "border-rose-200" : "border-blue-100"}`}>
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black ${block.urgent ? "bg-rose-100 text-rose-700" : "bg-blue-100 text-blue-700"}`}>
        {block.num || 1}
      </div>
      <div className="flex-1">
        <h3 className="font-black text-slate-950">{block.title}</h3>
        {block.desc ? <p className="mt-1 text-sm leading-6 text-slate-500">{block.desc}</p> : null}
        {block.tags?.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {block.tags.map((tag, index) => (
              <span key={`${tag.text}-${index}`} className={`rounded px-2 py-1 text-xs font-bold ${tag.tone === "impact" ? "bg-emerald-50 text-emerald-700" : tag.tone === "warn" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-600"}`}>
                {tag.text}
              </span>
            ))}
          </div>
        ) : null}
      </div>
      <ArrowRight className="mt-1 h-4 w-4 text-slate-400" />
    </Link>
  );
}

function EvidenceDrawer({
  ga,
  seo,
  confidence,
  recommendation,
  workflow,
  onClose,
}: {
  ga: Props["ga"];
  seo: Props["seo"];
  confidence: number;
  recommendation: ReturnType<typeof buildDefaultRecommendation>;
  workflow: WorkflowData | null;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/30 p-4 backdrop-blur-sm"
      role="presentation"
      onClick={onClose}
    >
      <aside
        className="ml-auto flex h-full max-w-xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <div>
            <p className="text-xs font-black text-blue-600">判斷證據</p>
            <h2 className="mt-1 text-xl font-black text-slate-950">分析依據</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100" aria-label="關閉分析依據">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <EvidenceSection
            title="推薦排序原因"
            items={[
              ["目前建議", recommendation.recommendation],
              ["判斷理由", recommendation.reason],
              ["預期影響", recommendation.impact],
              ["AI 信心度", `${confidence}%`],
            ]}
          />
          <EvidenceSection
            title="資料來源"
            items={[
              ["GA 狀態", ga.connected ? "已連接" : ga.enabled ? "已啟用但未連接" : "未啟用"],
              ["GA Users", formatNumber(ga.users)],
              ["GA Sessions", formatNumber(ga.sessions)],
              ["GA Conversions", formatNumber(ga.conversions)],
              ["SEO 狀態", seo.connected ? `${seo.siteCount} 個站點` : seo.enabled ? "已啟用但未建立站點" : "未啟用"],
              ["SEO Score", seo.score === null ? "-" : String(seo.score)],
              ["SEO Issues", String(seo.issues)],
              ["SEO Opportunities", String(seo.opportunities)],
            ]}
          />
          <EvidenceSection
            title="判斷規則"
            items={[
              ["資料不足", "若 GA 與 SEO 都未啟用，優先補齊資料模組。"],
              ["缺少 GA", "若沒有 GA，優先建立流量與轉換基準。"],
              ["缺少 SEO", "若 GA 已接通但沒有 SEO，優先建立搜尋健康度基準。"],
              ["SEO 問題", "若 SEO issues 大於 0，優先修復技術問題。"],
              ["基礎完整", "若 GA 與 SEO 已接通且無明顯技術阻塞，轉向 AEO / GEO 能見度。"],
            ]}
          />
          <EvidenceSection
            title="決策狀態"
            items={[
              ["人工確認", workflow?.decision?.decision === "accepted" ? "已同意" : workflow?.decision?.decision === "skipped" ? "已略過" : "尚未決策"],
              ["任務", workflow?.task ? "已建立" : "尚未建立"],
              ["完成度", workflow?.task ? `${taskProgress(workflow)}%` : "-"],
              ["成果衡量", workflow?.outcome?.status === "measured" ? "已衡量" : "等待衡量"],
            ]}
          />
        </div>
      </aside>
    </div>
  );
}

function EvidenceSection({ title, items }: { title: string; items: [string, string][] }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="font-black text-slate-950">{title}</h3>
      <div className="mt-3 divide-y divide-slate-100">
        {items.map(([label, value]) => (
          <div key={label} className="grid gap-2 py-3 text-sm sm:grid-cols-[130px_1fr]">
            <span className="font-bold text-slate-500">{label}</span>
            <span className="leading-6 text-slate-700">{value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
