"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  Check,
  CheckCircle2,
  Circle,
  Loader2,
  RefreshCw,
  Target,
} from "lucide-react";
import { useWorkspace } from "@/components/workspace/WorkspaceProvider";

type WorkflowStep = {
  id: number;
  title: string;
  status: "pending" | "completed";
};

type WorkflowItem = {
  context_key: string;
  recommendation: {
    title: string;
    description?: string;
    status?: string;
    updated_at?: string;
  } | null;
  decision: { decision?: "accepted" | "skipped"; created_at?: string } | null;
  task: {
    id: number;
    title?: string;
    description?: string;
    status?: string;
    steps?: WorkflowStep[];
  } | null;
  outcome: {
    status?: string;
    baseline?: Record<string, number>;
    measured?: Record<string, number> | null;
    result?: Record<string, { before: number; after: number; change: number; change_percent: number | null }> | null;
    measured_at?: string | null;
  } | null;
};

const workflowContexts = [
  { key: "dashboard:setup_modules", label: "啟用資料模組" },
  { key: "dashboard:connect_ga", label: "連接 GA" },
  { key: "dashboard:create_seo_site", label: "建立 SEO 站點" },
  { key: "dashboard:fix_seo_issues", label: "修復 SEO 問題" },
  { key: "dashboard:expand_ai_visibility", label: "擴大 AI 能見度" },
];

const outcomeMetricLabels: Record<string, string> = {
  sessions: "工作階段",
  conversions: "轉換事件",
  seo_score: "SEO 分數",
  seo_issues: "SEO 問題數",
};

function getErrorMessage(json: any, fallback: string) {
  return json?.error?.message || json?.message || fallback;
}

function statusLabel(status?: string) {
  if (status === "completed") return "已完成";
  if (status === "in_progress") return "進行中";
  if (status === "cancelled") return "已取消";
  if (status === "accepted") return "已同意";
  if (status === "skipped") return "已略過";
  return "待處理";
}

function outcomeLabel(status?: string) {
  if (status === "measured") return "已衡量";
  if (status === "awaiting_measurement") return "待衡量";
  if (status === "awaiting_execution") return "待執行";
  return "尚未建立";
}

function completedCount(item: WorkflowItem) {
  return (item.task?.steps || []).filter((step) => step.status === "completed").length;
}

function totalSteps(item: WorkflowItem) {
  return item.task?.steps?.length || 0;
}

function progressPercent(item: WorkflowItem) {
  const total = totalSteps(item);
  if (!total) return 0;
  return Math.round((completedCount(item) / total) * 100);
}

function signedValue(value: number) {
  return `${value > 0 ? "+" : ""}${value}`;
}

export default function DashboardTasksPage() {
  const { currentWorkspace } = useWorkspace();
  const [items, setItems] = useState<WorkflowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyStep, setBusyStep] = useState("");
  const [errorText, setErrorText] = useState("");

  const visibleItems = useMemo(
    () => items.filter((item) => item.recommendation || item.task || item.decision),
    [items]
  );
  const taskItems = visibleItems.filter((item) => item.task);
  const completedTasks = taskItems.filter((item) => progressPercent(item) === 100).length;
  const measuredTasks = taskItems.filter((item) => item.outcome?.status === "measured");
  const latestMeasuredTask = [...measuredTasks].sort((a, b) =>
    String(b.outcome?.measured_at || "").localeCompare(String(a.outcome?.measured_at || ""))
  )[0] || null;
  const latestResult = latestMeasuredTask?.outcome?.result || null;
  const sessionsChange = latestResult?.sessions?.change ?? 0;
  const conversionsChange = latestResult?.conversions?.change ?? 0;
  const seoChange = latestResult?.seo_score?.change ?? 0;
  const issueImprovement = -(latestResult?.seo_issues?.change ?? 0);

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      setErrorText("");
      const loaded = await Promise.all(
        workflowContexts.map(async (context) => {
          const response = await fetch(
            `/api/workspaces/${currentWorkspace.id}/dashboard/workflow?context_key=${encodeURIComponent(context.key)}`,
            { cache: "no-store" }
          );
          const json = await response.json();
          if (!response.ok || !json?.ok) {
            throw new Error(getErrorMessage(json, "讀取任務進度失敗。"));
          }
          return json.data as WorkflowItem;
        })
      );
      setItems(loaded);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "讀取任務進度失敗。");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace.id]);

  const toggleStep = async (item: WorkflowItem, step: WorkflowStep) => {
    if (!item.task) return;
    const busyKey = `${item.context_key}:${step.id}`;
    try {
      setBusyStep(busyKey);
      setErrorText("");
      const response = await fetch(`/api/workspaces/${currentWorkspace.id}/dashboard/workflow`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          context_key: item.context_key,
          action: "update_step",
          title: item.recommendation?.title || item.task.title || "Dashboard task",
          description: item.recommendation?.description || item.task.description || "",
          task_id: item.task.id,
          step_id: step.id,
          completed: step.status !== "completed",
        }),
      });
      const json = await response.json();
      if (!response.ok || !json?.ok || !json?.data) {
        throw new Error(getErrorMessage(json, "更新任務步驟失敗。"));
      }
      setItems((current) =>
        current.map((candidate) =>
          candidate.context_key === item.context_key ? (json.data as WorkflowItem) : candidate
        )
      );
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "更新任務步驟失敗。");
    } finally {
      setBusyStep("");
    }
  };

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" />
            回到決策中心
          </Link>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">任務進度</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            追蹤已同意的決策、執行步驟與後續成效衡量。
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadTasks()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          重新整理
        </button>
      </div>

      {errorText ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">
          {errorText}
        </div>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black text-emerald-600">成果衡量</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">做完之後，真的有改善嗎？</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              目前比較 GA 流量、轉換事件與 SEO 健康變化；AEO / GEO 將於資料接通後加入。
            </p>
          </div>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-black text-slate-700">
            {measuredTasks.length} / {taskItems.length} 個任務已衡量
          </span>
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-3">
          <OutcomeCard
            label="執行結果"
            value={`${taskItems.reduce((sum, item) => sum + completedCount(item), 0)} / ${taskItems.reduce((sum, item) => sum + totalSteps(item), 0)} 個步驟完成`}
            sub="確認工作是否完成"
          />
          <OutcomeCard
            label="指標變化"
            value={latestResult ? `工作階段 ${signedValue(sessionsChange)}` : "等待成果衡量"}
            sub={latestResult ? `轉換事件 ${signedValue(conversionsChange)}` : "完成任務後回決策中心更新"}
          />
          <OutcomeCard
            label="搜尋影響"
            value={latestResult ? `SEO 分數 ${signedValue(seoChange)}` : "尚無比較結果"}
            sub={latestResult ? `SEO 問題改善 ${signedValue(issueImprovement)}` : "衡量後顯示 SEO 變化"}
          />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="任務總數" value={taskItems.length} />
        <SummaryCard label="已完成" value={completedTasks} />
        <SummaryCard label="待處理步驟" value={taskItems.reduce((sum, item) => sum + totalSteps(item) - completedCount(item), 0)} />
      </section>

      <section className="space-y-4">
        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm font-bold text-slate-500">
            正在載入任務...
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <Target className="mx-auto h-10 w-10 text-slate-300" />
            <h2 className="mt-4 text-xl font-black text-slate-950">尚未建立任務</h2>
            <p className="mt-2 text-sm text-slate-500">回到決策中心按下「同意，建立行動」後，任務會出現在這裡。</p>
          </div>
        ) : (
          visibleItems.map((item) => (
            <TaskCard
              key={item.context_key}
              item={item}
              busyStep={busyStep}
              onToggleStep={toggleStep}
            />
          ))
        )}
      </section>
    </div>
  );
}

function OutcomeCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
      <Circle className="h-4 w-4 text-emerald-600" />
      <p className="mt-5 text-xs font-black uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 text-lg font-black text-slate-950">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{sub}</p>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-black text-slate-950">{value}</p>
    </div>
  );
}

function TaskCard({
  item,
  busyStep,
  onToggleStep,
}: {
  item: WorkflowItem;
  busyStep: string;
  onToggleStep: (item: WorkflowItem, step: WorkflowStep) => Promise<void>;
}) {
  const steps = item.task?.steps || [];
  const percent = progressPercent(item);
  const label = workflowContexts.find((context) => context.key === item.context_key)?.label || item.context_key;

  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">{label}</span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
              {statusLabel(item.task?.status || item.recommendation?.status)}
            </span>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
              {outcomeLabel(item.outcome?.status)}
            </span>
          </div>
          <h2 className="mt-3 text-xl font-black text-slate-950">
            {item.recommendation?.title || item.task?.title || "未命名任務"}
          </h2>
          {item.recommendation?.description || item.task?.description ? (
            <p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-500">
              {item.recommendation?.description || item.task?.description}
            </p>
          ) : null}
        </div>
        <div className="min-w-36 rounded-2xl bg-slate-50 p-4 text-center">
          <p className="text-3xl font-black text-slate-950">{percent}%</p>
          <p className="mt-1 text-xs font-bold text-slate-500">完成度</p>
        </div>
      </div>

      {steps.length > 0 ? (
        <div className="mt-5 space-y-2">
          {steps.map((step) => {
            const busy = busyStep === `${item.context_key}:${step.id}`;
            const done = step.status === "completed";
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => void onToggleStep(item, step)}
                disabled={busy}
                className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm font-bold transition disabled:opacity-60 ${
                  done
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50"
                }`}
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : done ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {step.title}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="mt-5 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
          這筆決策尚未建立任務步驟。
        </p>
      )}

      {item.outcome?.status === "awaiting_measurement" ? (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
          任務已完成。回到決策中心讀取最新 GA 與 SEO 指標，即可產生成果比較。
        </div>
      ) : null}

      {item.outcome?.status === "measured" && item.outcome.result ? (
        <div className="mt-5 overflow-hidden rounded-2xl border border-emerald-200">
          <div className="border-b border-emerald-100 bg-emerald-50 px-4 py-3">
            <p className="text-sm font-black text-emerald-800">成果比較</p>
          </div>
          <div className="grid gap-px bg-slate-200 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(item.outcome.result).map(([key, result]) => (
              <div key={key} className="bg-white p-4">
                <p className="text-xs font-bold text-slate-500">{outcomeMetricLabels[key] || key}</p>
                <p className="mt-2 text-lg font-black text-slate-950">{signedValue(result.change)}</p>
                <p className="mt-1 text-xs text-slate-400">{result.before} → {result.after}</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        <Link
          href="/dashboard"
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-black text-white ${
            item.outcome?.status === "awaiting_measurement" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-slate-950 hover:bg-slate-800"
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          {item.outcome?.status === "awaiting_measurement" ? "回決策中心更新成果" : "回決策中心"}
        </Link>
      </div>
    </article>
  );
}
