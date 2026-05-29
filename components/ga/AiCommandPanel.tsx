"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Bot,
  CalendarClock,
  FileText,
  Loader2,
  Search,
  Sparkles,
} from "lucide-react";
import type { DateRange } from "@/app/(app)/ga/dataSource";

type DashboardAction =
  | {
      type: "setDateRange";
      label: string;
      dateRange: DateRange;
    }
  | {
      type: "navigate";
      label: string;
      href: string;
    }
  | {
      type: "highlight";
      label: string;
      target: {
        type: "channel" | "page" | "metric";
        value: string;
      };
    };

type AiInsight = {
  title: string;
  body: string;
  severity: "info" | "warning" | "success";
};

type AiResponse = {
  answer: string;
  summary: string;
  insights: AiInsight[];
  actions: DashboardAction[];
};

type Props = {
  dateRange: DateRange;
  selectedConnectionIds: number[];
  onDateRangeChange: (dateRange: DateRange) => void;
};

const quickPrompts = [
  {
    label: "分析最近流量變化",
    question: "分析最近 7 天流量變化，找出主要下降或成長原因",
    icon: Sparkles,
  },
  {
    label: "找出下降頁面",
    question: "找出最近表現下降、值得更新的頁面",
    icon: FileText,
  },
  {
    label: "分析轉換下降",
    question: "分析轉換下降原因，指出來源或頁面問題",
    icon: Search,
  },
];

function insightClass(severity: AiInsight["severity"]) {
  if (severity === "warning") {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }

  if (severity === "success") {
    return "border-emerald-200 bg-emerald-50 text-emerald-900";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

export default function AiCommandPanel({
  dateRange,
  selectedConnectionIds,
  onDateRangeChange,
}: Props) {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<AiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canAsk = selectedConnectionIds.length > 0 && !loading;

  const placeholder = useMemo(() => {
    if (!selectedConnectionIds.length) {
      return "請先選擇 GA property";
    }

    return "例如：為什麼這週流量下降？哪些頁面值得更新？";
  }, [selectedConnectionIds.length]);

  async function askAi(nextQuestion = question) {
    const trimmed = nextQuestion.trim();

    if (!trimmed || !selectedConnectionIds.length) {
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await fetch("/api/ga/ai-query", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: trimmed,
          dashboardState: {
            dateRange,
            selectedConnectionIds,
          },
        }),
      });

      const json = await res.json();

      if (!res.ok || !json?.ok) {
        throw new Error(json?.message || "AI analysis failed");
      }

      setQuestion(trimmed);
      setResult(json.data);
      const rangeAction = json.data?.actions?.find(
        (action: DashboardAction) => action.type === "setDateRange"
      );

      if (
        rangeAction?.type === "setDateRange" &&
        (rangeAction.dateRange.start !== dateRange.start ||
          rangeAction.dateRange.end !== dateRange.end)
      ) {
        onDateRangeChange(rangeAction.dateRange);
      }

    } catch (err: any) {
      setError(err?.message || "AI analysis failed");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  function applyAction(action: DashboardAction) {
    if (action.type === "setDateRange") {
      onDateRangeChange(action.dateRange);
      return;
    }

    if (action.type === "navigate") {
      router.push(action.href);
      return;
    }

    return;
  }

  return (
    <section className="relative overflow-hidden rounded-3xl border border-cyan-200 bg-gradient-to-br from-cyan-50 via-white to-blue-50 p-5 shadow-lg shadow-cyan-950/10 md:p-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500" />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-cyan-700">
            <Bot className="h-4 w-4" />
            GA AI Analyst
          </div>
          <h2 className="mt-2 text-xl font-black text-slate-900">
            用自然語言控制與解讀 Dashboard
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            AI 會依照目前日期與已選 GA property 分析資料，並提供可直接套用的畫面動作。
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
          <CalendarClock className="h-4 w-4" />
          {dateRange.start} - {dateRange.end}
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 lg:flex-row">
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              askAi();
            }
          }}
          placeholder={placeholder}
          disabled={!selectedConnectionIds.length}
          className="min-h-12 flex-1 rounded-2xl border border-cyan-100 bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100 disabled:bg-slate-50"
        />
        <button
          type="button"
          onClick={() => askAi()}
          disabled={!canAsk || !question.trim()}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-cyan-700 px-5 py-3 text-sm font-bold text-white shadow-sm shadow-cyan-900/20 transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          分析
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {quickPrompts.map((item) => {
          const Icon = item.icon;

          return (
            <button
              type="button"
              key={item.label}
              onClick={() => askAi(item.question)}
              disabled={!canAsk}
              className="inline-flex items-center gap-2 rounded-2xl border border-cyan-100 bg-white/90 px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:border-cyan-300 hover:bg-cyan-50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </div>

      {error ? (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      {result ? (
        <div className="mt-5 space-y-4">
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <div className="text-sm font-black text-blue-900">{result.summary}</div>
            <p className="mt-2 text-sm leading-6 text-blue-900/80">{result.answer}</p>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            {result.insights.map((insight) => (
              <div
                key={insight.title}
                className={`rounded-2xl border p-4 text-sm ${insightClass(insight.severity)}`}
              >
                <div className="font-black">{insight.title}</div>
                <p className="mt-2 leading-6">{insight.body}</p>
              </div>
            ))}
          </div>

          {result.actions.length ? (
            <div className="flex flex-wrap gap-2">
              {result.actions.map((action) => (
                <button
                  type="button"
                  key={`${action.type}-${action.label}`}
                  onClick={() => applyAction(action)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-700"
                >
                  {action.label}
                  <ArrowRight className="h-4 w-4" />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
