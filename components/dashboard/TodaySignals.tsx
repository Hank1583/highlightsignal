"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Loader2,
  Radar,
  ShieldQuestion,
} from "lucide-react";
import { useWorkspace } from "@/components/workspace/WorkspaceProvider";

// V10-06: Decision-first Dashboard. This is the real Signal -> Evidence ->
// Explanation -> Business Impact -> Recommendation -> Human Review -> Decision
// flow (spec section 11), wired against the actual V10-01~05 domain APIs --
// no detector/recommendation/permission rule is re-implemented here, this
// component only renders what the backend already computed and forwards the
// human's Decision back unchanged. GA/SEO/AEO/GEO's own pages remain the
// Evidence/raw-data drill-down (unchanged by this task).

type SignalStatus = "new" | "acknowledged" | "resolved" | "dismissed";

type Signal = {
  id: number;
  type: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  status: SignalStatus;
  source: string;
  title: string;
  summary: string;
  detected_at: string;
  last_seen_at: string;
  occurrence_count: number;
};

type SignalAnalysis = {
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

type RecommendationPriority = "critical" | "high" | "medium" | "low" | null;

type Recommendation = {
  title: string;
  priority: RecommendationPriority;
  confidence: number | null;
  expected_impact: string | null;
  suggested_action: string | null;
  reason: string | null;
  generator_type: string;
  revision: number;
  status: string;
} | null;

type Decision = {
  decision: DecisionOutcome;
  note?: string | null;
  expected_outcome?: string | null;
  actor_member_id?: number;
  created_at?: string;
} | null;

type WorkflowData = {
  recommendation: Recommendation;
  decision: Decision;
};

type DecisionOutcome = "accepted" | "modified" | "rejected" | "skipped" | "deferred" | "needs_more_evidence";

const OUTCOME_OPTIONS: { value: DecisionOutcome; label: string; tone: string }[] = [
  { value: "accepted", label: "同意採納", tone: "border-emerald-300 bg-emerald-50 text-emerald-700" },
  { value: "modified", label: "同意但需調整", tone: "border-blue-300 bg-blue-50 text-blue-700" },
  { value: "rejected", label: "不採納", tone: "border-rose-300 bg-rose-50 text-rose-700" },
  { value: "skipped", label: "先略過", tone: "border-slate-300 bg-slate-50 text-slate-600" },
  { value: "deferred", label: "延後決定", tone: "border-amber-300 bg-amber-50 text-amber-700" },
  { value: "needs_more_evidence", label: "需要更多證據", tone: "border-violet-300 bg-violet-50 text-violet-700" },
];

function outcomeLabel(value?: DecisionOutcome | null) {
  return OUTCOME_OPTIONS.find((item) => item.value === value)?.label || value || "";
}

function severityClass(severity: Signal["severity"]) {
  if (severity === "critical" || severity === "high") return "bg-rose-100 text-rose-700";
  if (severity === "medium") return "bg-amber-100 text-amber-700";
  return "bg-blue-100 text-blue-700";
}

function statusLabel(status: SignalStatus) {
  if (status === "new") return "新偵測";
  if (status === "acknowledged") return "已確認";
  if (status === "resolved") return "已解決";
  return "已忽略";
}

function priorityLabel(priority: RecommendationPriority) {
  if (priority === "critical") return "緊急";
  if (priority === "high") return "高";
  if (priority === "medium") return "中";
  if (priority === "low") return "低";
  return "-";
}

function impactDirectionLabel(direction: SignalAnalysis["business_impact"]["direction"]) {
  if (direction === "negative") return "負面影響";
  if (direction === "positive") return "正面影響";
  if (direction === "neutral") return "中性";
  return "尚無法判斷";
}

function formatDateTime(value?: string) {
  if (!value) return "-";
  try {
    return new Intl.DateTimeFormat("zh-TW", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
  } catch {
    return value;
  }
}

function newIdempotencyKey() {
  try {
    return crypto.randomUUID();
  } catch {
    return `idem-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

function getErrorMessage(json: any, fallback: string) {
  return json?.error?.message || json?.message || fallback;
}

async function parseJsonSafe<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) throw new Error(`API 回傳空內容。status=${res.status}`);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`API 未回傳有效 JSON。status=${res.status}`);
  }
}

export default function TodaySignals() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace.id;

  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [analysisById, setAnalysisById] = useState<Record<number, SignalAnalysis>>({});
  const [workflowById, setWorkflowById] = useState<Record<number, WorkflowData>>({});
  const [detailLoadingId, setDetailLoadingId] = useState<number | null>(null);
  const [detailError, setDetailError] = useState<Record<number, string>>({});
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [selectedOutcome, setSelectedOutcome] = useState<DecisionOutcome | null>(null);
  const [reason, setReason] = useState("");
  const [expectedOutcome, setExpectedOutcome] = useState("");
  const [submitBusyId, setSubmitBusyId] = useState<number | null>(null);
  const [submitError, setSubmitError] = useState<Record<number, string>>({});
  const [idempotencyKeyById, setIdempotencyKeyById] = useState<Record<number, string>>({});

  const contextKeyFor = useCallback((signalId: number) => `signal:${signalId}`, []);

  const loadSignals = useCallback(
    async (signal: AbortSignal) => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/workspaces/${workspaceId}/signals?per_page=50`, {
          cache: "no-store",
          signal,
        });
        const json = await parseJsonSafe<{ ok: boolean; data?: { items: Signal[] }; error?: { message?: string } }>(response);
        if (!response.ok || !json.ok || !json.data) throw new Error(getErrorMessage(json, "讀取今日 Signal 失敗。"));
        const openOnly = json.data.items.filter((item) => item.status === "new" || item.status === "acknowledged");
        setSignals(openOnly);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setSignals([]);
        setError(err instanceof Error ? err.message : "讀取今日 Signal 失敗。");
      } finally {
        setLoading(false);
      }
    },
    [workspaceId]
  );

  useEffect(() => {
    // Cancel any in-flight request from the previous Workspace and clear all
    // domain state immediately on switch, so a late response never renders
    // another tenant's Signal/Evidence/Decision content.
    const controller = new AbortController();
    setSignals([]);
    setExpandedId(null);
    setAnalysisById({});
    setWorkflowById({});
    setDetailError({});
    setSubmitError({});
    setReviewingId(null);
    setSelectedOutcome(null);
    setReason("");
    setExpectedOutcome("");
    setIdempotencyKeyById({});
    void loadSignals(controller.signal);
    return () => controller.abort();
  }, [workspaceId, loadSignals]);

  const loadDetail = useCallback(
    async (signal: Signal) => {
      setDetailLoadingId(signal.id);
      setDetailError((current) => ({ ...current, [signal.id]: "" }));
      const contextKey = contextKeyFor(signal.id);
      try {
        const [analysisResponse, refreshResponse] = await Promise.all([
          analysisById[signal.id]
            ? Promise.resolve(null)
            : fetch(`/api/workspaces/${workspaceId}/signals/${signal.id}/analysis`, { cache: "no-store" }),
          fetch(`/api/workspaces/${workspaceId}/dashboard/workflow`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              context_key: contextKey,
              action: "refresh_recommendation",
              title: signal.title,
              description: signal.summary,
              signal_context: { signal_id: signal.id },
            }),
          }),
        ]);

        if (analysisResponse) {
          const analysisJson = await parseJsonSafe<{ ok: boolean; data?: SignalAnalysis; error?: { message?: string } }>(analysisResponse);
          if (!analysisResponse.ok || !analysisJson.ok || !analysisJson.data) {
            throw new Error(getErrorMessage(analysisJson, "讀取 Evidence/Explanation/Impact 失敗。"));
          }
          setAnalysisById((current) => ({ ...current, [signal.id]: analysisJson.data! }));
        }

        const refreshJson = await parseJsonSafe<{ ok: boolean; data?: WorkflowData; error?: { message?: string } }>(refreshResponse);
        if (!refreshResponse.ok || !refreshJson.ok || !refreshJson.data) {
          throw new Error(getErrorMessage(refreshJson, "讀取 Recommendation 失敗。"));
        }
        setWorkflowById((current) => ({ ...current, [signal.id]: refreshJson.data! }));
      } catch (err) {
        setDetailError((current) => ({
          ...current,
          [signal.id]: err instanceof Error ? err.message : "讀取詳細分析失敗。",
        }));
      } finally {
        setDetailLoadingId(null);
      }
    },
    [analysisById, contextKeyFor, workspaceId]
  );

  const toggleExpand = useCallback(
    (signal: Signal) => {
      if (expandedId === signal.id) {
        setExpandedId(null);
        return;
      }
      setExpandedId(signal.id);
      setReviewingId(null);
      void loadDetail(signal);
    },
    [expandedId, loadDetail]
  );

  const startReview = useCallback((signalId: number) => {
    setReviewingId(signalId);
    setSelectedOutcome(null);
    setReason("");
    setExpectedOutcome("");
    setIdempotencyKeyById((current) => (current[signalId] ? current : { ...current, [signalId]: newIdempotencyKey() }));
  }, []);

  const submitDecision = useCallback(
    async (signal: Signal) => {
      if (!selectedOutcome) return;
      const contextKey = contextKeyFor(signal.id);
      const idempotencyKey = idempotencyKeyById[signal.id] || newIdempotencyKey();
      setSubmitBusyId(signal.id);
      setSubmitError((current) => ({ ...current, [signal.id]: "" }));
      try {
        const response = await fetch(`/api/workspaces/${workspaceId}/dashboard/workflow`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            context_key: contextKey,
            action: "save_decision",
            title: signal.title,
            description: signal.summary,
            decision: selectedOutcome,
            reason,
            expected_outcome: expectedOutcome,
            idempotency_key: idempotencyKey,
            signal_context: { signal_id: signal.id },
          }),
        });
        const json = await parseJsonSafe<{ ok: boolean; data?: WorkflowData; error?: { message?: string } }>(response);
        if (!response.ok || !json.ok || !json.data) throw new Error(getErrorMessage(json, "送出決策失敗。"));
        setWorkflowById((current) => ({ ...current, [signal.id]: json.data! }));
        setReviewingId(null);
        setSelectedOutcome(null);
        setReason("");
        setExpectedOutcome("");
        // A fresh idempotency key for the NEXT decision on this Recommendation
        // (append-only history -- this decision has already been recorded).
        setIdempotencyKeyById((current) => ({ ...current, [signal.id]: newIdempotencyKey() }));
      } catch (err) {
        setSubmitError((current) => ({ ...current, [signal.id]: err instanceof Error ? err.message : "送出決策失敗。" }));
      } finally {
        setSubmitBusyId(null);
      }
    },
    [contextKeyFor, expectedOutcome, idempotencyKeyById, reason, selectedOutcome, workspaceId]
  );

  const sortedSignals = useMemo(
    () =>
      [...signals].sort((a, b) => {
        const order = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
        return (order[a.severity] ?? 5) - (order[b.severity] ?? 5);
      }),
    [signals]
  );

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-black text-blue-700">
            <Radar className="h-4 w-4" />
            今日 Signal
          </div>
          <h2 className="mt-2 text-2xl font-black text-slate-950">系統偵測到的訊號與決策</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Signal → Evidence → Explanation → Business Impact → Recommendation → 人工確認決策，單一流程完成。
          </p>
        </div>
        {signals.length > 0 ? (
          <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">{signals.length} 筆待處理</span>
        ) : null}
      </div>

      <div className="mt-5 space-y-3">
        {loading ? (
          <EmptyState icon={<Loader2 className="h-5 w-5 animate-spin" />} text="正在讀取今日 Signal..." />
        ) : error ? (
          <EmptyState icon={<AlertCircle className="h-5 w-5 text-rose-500" />} text={error} tone="error" />
        ) : sortedSignals.length === 0 ? (
          <EmptyState
            icon={<ShieldQuestion className="h-5 w-5 text-slate-400" />}
            text="目前沒有需要處理的 Signal。系統偵測到新的問題時會顯示在這裡。"
          />
        ) : (
          sortedSignals.map((signal) => {
            const expanded = expandedId === signal.id;
            const analysis = analysisById[signal.id];
            const workflow = workflowById[signal.id];
            const recommendation = workflow?.recommendation;
            const decision = workflow?.decision;
            const reviewing = reviewingId === signal.id;

            return (
              <article key={signal.id} className="overflow-hidden rounded-2xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => toggleExpand(signal)}
                  className="flex w-full items-center justify-between gap-3 bg-slate-50 px-4 py-3 text-left"
                  aria-expanded={expanded}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-black uppercase ${severityClass(signal.severity)}`}>
                      {signal.severity}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-black text-slate-950">{signal.title}</p>
                      <p className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                        <Clock className="h-3 w-3" />
                        最近偵測：{formatDateTime(signal.last_seen_at)} · {statusLabel(signal.status)} · x{signal.occurrence_count}
                      </p>
                    </div>
                  </div>
                  {decision ? (
                    <span className="shrink-0 rounded-full bg-slate-200 px-2 py-1 text-[10px] font-black text-slate-700">
                      已決策：{outcomeLabel(decision.decision)}
                    </span>
                  ) : null}
                  {expanded ? <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" /> : <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />}
                </button>

                {expanded ? (
                  <div className="space-y-4 border-t border-slate-200 p-4">
                    {detailLoadingId === signal.id ? (
                      <EmptyState icon={<Loader2 className="h-4 w-4 animate-spin" />} text="正在讀取 Evidence / Explanation / Impact / Recommendation..." compact />
                    ) : detailError[signal.id] ? (
                      <EmptyState icon={<AlertCircle className="h-4 w-4 text-rose-500" />} text={detailError[signal.id]} tone="error" compact />
                    ) : (
                      <>
                        <DetailBlock title="Evidence" tone="border-slate-200 bg-slate-50">
                          {analysis ? (
                            <p className="text-sm text-slate-700">引用 {analysis.evidence_ids.length} 筆 Evidence（ID：{analysis.evidence_ids.join(", ") || "無"}）</p>
                          ) : (
                            <p className="text-sm text-slate-400">尚無資料。</p>
                          )}
                        </DetailBlock>

                        <DetailBlock title="Explanation" tone="border-blue-200 bg-blue-50">
                          {!analysis ? (
                            <p className="text-sm text-slate-400">尚無資料。</p>
                          ) : analysis.status === "insufficient_evidence" ? (
                            <p className="text-sm text-blue-900">尚無足夠 Evidence，無法產生解讀。</p>
                          ) : analysis.status === "failed" ? (
                            <p className="text-sm text-rose-700">產生解讀時發生錯誤，未產生結果。</p>
                          ) : (
                            <>
                              <p className="text-sm text-blue-900">{analysis.explanation.text}</p>
                              <p className="mt-1 text-xs text-blue-600">
                                信心度：{analysis.explanation.confidence ?? "-"}％ ·{" "}
                                {analysis.generator.type === "ai" ? `AI 生成（${analysis.generator.model || analysis.generator.provider || "未知模型"}）` : "規則式產生（非 AI）"}
                              </p>
                            </>
                          )}
                        </DetailBlock>

                        <DetailBlock title="Business Impact" tone="border-amber-200 bg-amber-50">
                          {!analysis || analysis.status !== "ok" ? (
                            <p className="text-sm text-amber-900">尚無法判斷商業影響。</p>
                          ) : (
                            <>
                              <p className="text-sm font-bold text-amber-900">
                                {impactDirectionLabel(analysis.business_impact.direction)}
                                {analysis.business_impact.magnitude ? `（${analysis.business_impact.magnitude}）` : ""}
                              </p>
                              <p className="mt-1 text-xs text-amber-700">依據：{analysis.business_impact.basis || "-"}</p>
                              <p className="mt-1 text-xs text-amber-600">限制：{analysis.business_impact.limitations || "-"}</p>
                            </>
                          )}
                        </DetailBlock>

                        <DetailBlock title="Recommendation" tone="border-violet-200 bg-violet-50">
                          {!recommendation ? (
                            <p className="text-sm text-violet-400">尚未產生正式 Recommendation。</p>
                          ) : (
                            <>
                              <p className="text-sm font-black text-violet-950">{recommendation.title}</p>
                              <p className="mt-1 text-xs text-violet-700">
                                優先度：{priorityLabel(recommendation.priority)} · 信心度：{recommendation.confidence ?? "-"}％ · 版本 v{recommendation.revision}
                              </p>
                              {recommendation.suggested_action ? <p className="mt-2 text-sm text-violet-900">建議行動：{recommendation.suggested_action}</p> : null}
                              {recommendation.expected_impact ? <p className="mt-1 text-xs text-violet-700">預期影響：{recommendation.expected_impact}</p> : null}
                            </>
                          )}
                        </DetailBlock>

                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                          <p className="text-xs font-black uppercase tracking-wide text-slate-500">人工審查與決策</p>

                          {decision ? (
                            <div className="mt-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                              <p>
                                最新決策：<span className="font-black">{outcomeLabel(decision.decision)}</span>
                                {decision.created_at ? ` · ${formatDateTime(decision.created_at)}` : ""}
                              </p>
                              {decision.note ? <p className="mt-1 text-xs text-slate-500">理由：{decision.note}</p> : null}
                              {decision.expected_outcome ? <p className="mt-1 text-xs text-slate-500">預期結果：{decision.expected_outcome}</p> : null}
                            </div>
                          ) : null}

                          {!reviewing ? (
                            <button
                              type="button"
                              onClick={() => startReview(signal.id)}
                              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-xs font-black text-white"
                            >
                              <Check className="h-3.5 w-3.5" />
                              {decision ? "重新提交決策" : "開始審查決策"}
                            </button>
                          ) : (
                            <div className="mt-3 space-y-3">
                              <div className="flex flex-wrap gap-2">
                                {OUTCOME_OPTIONS.map((option) => (
                                  <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setSelectedOutcome(option.value)}
                                    className={`rounded-xl border px-3 py-1.5 text-xs font-bold ${
                                      selectedOutcome === option.value ? option.tone : "border-slate-200 bg-white text-slate-600"
                                    }`}
                                  >
                                    {option.label}
                                  </button>
                                ))}
                              </div>
                              <textarea
                                value={reason}
                                onChange={(event) => setReason(event.target.value)}
                                placeholder="決策理由（選填，但建議填寫）"
                                rows={2}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                              />
                              <textarea
                                value={expectedOutcome}
                                onChange={(event) => setExpectedOutcome(event.target.value)}
                                placeholder="預期結果（選填）"
                                rows={2}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                              />
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  disabled={!selectedOutcome || submitBusyId === signal.id}
                                  onClick={() => void submitDecision(signal)}
                                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-black text-white disabled:opacity-50"
                                >
                                  {submitBusyId === signal.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                  {submitBusyId === signal.id ? "送出中..." : "確認送出決策"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setReviewingId(null)}
                                  disabled={submitBusyId === signal.id}
                                  className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-bold text-slate-600 disabled:opacity-50"
                                >
                                  取消
                                </button>
                              </div>
                            </div>
                          )}

                          {submitError[signal.id] ? <p className="mt-2 text-xs font-bold text-rose-600">{submitError[signal.id]}</p> : null}
                        </div>
                      </>
                    )}
                  </div>
                ) : null}
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

function DetailBlock({ title, tone, children }: { title: string; tone: string; children: React.ReactNode }) {
  return (
    <div className={`rounded-xl border p-3 ${tone}`}>
      <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">{title}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function EmptyState({
  icon,
  text,
  tone = "default",
  compact = false,
}: {
  icon: React.ReactNode;
  text: string;
  tone?: "default" | "error";
  compact?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border px-4 text-sm font-semibold ${compact ? "py-3" : "py-5"} ${
        tone === "error" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-slate-200 bg-slate-50 text-slate-500"
      }`}
    >
      {icon}
      {text}
    </div>
  );
}
