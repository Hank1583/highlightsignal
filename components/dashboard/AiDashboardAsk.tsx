"use client";

import Link from "next/link";
import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Gauge,
  LineChart,
  ScanSearch,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

type Props = {
  gaReady: boolean;
  seoReady: boolean;
  gaUsers: number;
  gaSessions: number;
  gaConversions: number;
  seoScore: number | null;
  seoIssues: number;
  seoOpportunities: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export default function AiDashboardAsk({
  gaReady,
  seoReady,
  gaUsers,
  gaSessions,
  gaConversions,
  seoScore,
  seoIssues,
  seoOpportunities,
}: Props) {
  const hasData = gaReady || seoReady;
  const confidence = hasData
    ? clamp(68 + (gaReady ? 8 : 0) + (seoReady ? 10 : 0) - Math.min(seoIssues, 8), 58, 92)
    : 42;
  const visibilityImpact = seoReady
    ? clamp(seoIssues * 4 + seoOpportunities * 2, 8, 28)
    : 18;
  const basedOn = gaReady
    ? `${gaUsers.toLocaleString("zh-TW")} users / ${gaSessions.toLocaleString("zh-TW")} sessions`
    : seoReady
      ? `${seoIssues + seoOpportunities} search signals`
      : "limited setup data";

  const priority = !seoReady
    ? {
        label: "Priority #1",
        title: "建立 Search Intelligence 站點",
        reason: "目前 AI 缺少網站結構、索引與內容訊號，無法判斷搜尋曝光風險。",
        impact: "Search Visibility 無法預測",
        primaryHref: "/si/seo",
        primaryLabel: "新增網站",
        secondaryHref: "/si/seo",
        secondaryLabel: "查看 SI",
      }
    : seoIssues > 0
      ? {
          label: "Priority #1",
          title: "修復 SEO technical issue",
          reason: "此問題正在影響索引品質與 AI 搜尋對內容的理解。",
          impact: `預估影響：-${visibilityImpact}% Search Visibility`,
          primaryHref: "/si/seo",
          primaryLabel: "立即修復",
          secondaryHref: "/si/seo?tab=technical",
          secondaryLabel: "查看影響頁面",
        }
      : !gaReady
        ? {
            label: "Priority #1",
            title: "連接 GA 資料來源",
            reason: "目前缺少流量與轉換資料，AI 無法驗證搜尋優化是否帶來商業成效。",
            impact: "Decision Confidence 降低",
            primaryHref: "/ga/account",
            primaryLabel: "連接 GA",
            secondaryHref: "/ga",
            secondaryLabel: "查看 GA",
          }
        : {
            label: "Priority #1",
            title: "產生 AEO / GEO 分析",
            reason: "目前 SEO 基礎訊號可用，下一步應檢查內容是否能被 AI 摘要與引用。",
            impact: "AI Visibility 可提升",
            primaryHref: "/si/aeo",
            primaryLabel: "產生分析",
            secondaryHref: "/si/geo",
            secondaryLabel: "查看 GEO",
          };

  const aiJudgement = !hasData
    ? "AI 判斷：目前最大問題不是流量，而是資料完整度不足。請先補齊 GA 或 Search Intelligence 資料來源，AI 才能建立可信的決策基準。"
    : seoIssues > 0
      ? "AI 判斷：目前最大問題不是流量，而是搜尋基礎結構。若先修復 Schema、索引與技術問題，預估 2~3 週內可恢復部分搜尋曝光。"
      : gaConversions === 0 && gaReady
        ? "AI 判斷：目前流量資料已建立，但轉換訊號不足。建議先檢查事件與轉換設定，再判斷內容或來源品質。"
        : "AI 判斷：目前資料基礎穩定，下一步應把 SEO 訊號延伸到 AEO / GEO，檢查品牌是否能被 AI 搜尋正確引用。";

  const why = seoReady
    ? [
        `Index and technical signals flagged ${seoIssues} issue${seoIssues === 1 ? "" : "s"}`,
        `${seoOpportunities} content opportunities can improve topical coverage`,
        seoScore === null ? "SEO health score is pending" : `SEO health score is ${seoScore}`,
      ]
    : [
        "Search Intelligence has no active site baseline",
        "AI cannot compare SEO, AEO, and GEO readiness yet",
        "Decision engine is operating with limited confidence",
      ];

  const timeline = [
    {
      label: "Yesterday",
      value: gaReady ? "Traffic baseline stable" : "Traffic baseline missing",
      icon: LineChart,
    },
    {
      label: "Today",
      value: seoIssues > 0 ? "Technical issue detected" : "Search data reviewed",
      icon: ScanSearch,
    },
    {
      label: "Prediction",
      value: seoIssues > 0 ? "Visibility may decline within 7 days" : "AI visibility can be expanded",
      icon: Sparkles,
    },
  ];

  return (
    <section className="rounded-lg border border-slate-900 bg-slate-950 p-6 text-white shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-cyan-200">
            <BrainCircuit className="h-4 w-4" />
            AI Command Center
          </div>
          <h2 className="mt-4 text-2xl font-black tracking-tight">
            AI Strategic Briefing
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            AI Copilot / AI Analyst / AI Decision Engine
          </p>
        </div>
        <div className="rounded-lg bg-white/10 p-3 text-cyan-200">
          <Gauge className="h-7 w-7" />
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-white/10 bg-white/[0.06] p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-cyan-200">
          今日 AI 判斷
        </p>
        <div className="mt-4 flex items-start gap-3">
          <ShieldAlert className="mt-1 h-6 w-6 shrink-0 text-amber-300" />
          <div>
            <p className="text-sm font-bold text-amber-200">{priority.label}</p>
            <h3 className="mt-1 text-2xl font-black leading-tight">
              {priority.title}
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-200">
              原因：{priority.reason}
            </p>
            <p className="mt-2 text-sm font-bold text-rose-200">
              {priority.impact}
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Link
            href={priority.primaryHref}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-300 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-cyan-200"
          >
            {priority.primaryLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href={priority.secondaryHref}
            className="inline-flex items-center justify-center rounded-lg border border-white/15 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10"
          >
            {priority.secondaryLabel}
          </Link>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-white/10 p-4">
          <p className="text-xs font-semibold text-slate-300">AI Confidence</p>
          <p className="mt-2 text-3xl font-black">{confidence}%</p>
        </div>
        <div className="rounded-lg bg-white/10 p-4">
          <p className="text-xs font-semibold text-slate-300">Based on</p>
          <p className="mt-2 text-lg font-black">{basedOn}</p>
        </div>
        <div className="rounded-lg bg-white/10 p-4">
          <p className="text-xs font-semibold text-slate-300">Prediction</p>
          <p className="mt-2 text-lg font-black">
            {seoIssues > 0 ? "Recovery in 21 days" : "Expansion ready"}
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.04] p-4">
        <p className="text-sm leading-7 text-slate-200">{aiJudgement}</p>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg bg-white/[0.04] p-4">
          <p className="text-sm font-black text-white">Why this matters</p>
          <div className="mt-3 grid gap-3">
            {why.map((item) => (
              <div key={item} className="flex gap-2 text-sm leading-6 text-slate-300">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg bg-white/[0.04] p-4">
          <p className="text-sm font-black text-white">AI Timeline</p>
          <div className="mt-3 grid gap-3">
            {timeline.map((item) => {
              const Icon = item.icon;

              return (
                <div key={item.label} className="flex gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-300/15 text-cyan-200">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                      {item.label}
                    </p>
                    <p className="text-sm font-semibold text-slate-200">
                      {item.value}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
