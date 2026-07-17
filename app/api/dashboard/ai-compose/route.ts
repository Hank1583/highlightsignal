import { NextResponse } from "next/server";
import { highlightPhpApiUrl } from "@/lib/config";
import { isDemoSession } from "@/lib/demo";
import { gaQuery, getGAConnections } from "@/lib/ga/gaApi";
import { phpGetSeoSummary, phpListSeoSites } from "@/lib/seo/seoApi";
import { getServerSession, phpAuthHeaders, type ServerSession } from "@/lib/serverSession";
import { hasGaAccess, hasSearchIntelligenceAccess } from "@/lib/subscription";
import { resolveWorkspaceContext } from "@/lib/workspaceServer";
import {
  checkDashboardAiQuota,
  recordDashboardAiUsage,
} from "@/lib/dashboardAiQuota";

type GaConnection = {
  id: number | string;
};

type GaDailyRow = {
  date?: string;
  day?: string;
  event_date?: string;
  users?: number | string;
  sessions?: number | string;
  pageviews?: number | string;
};

type GaConversionRow = {
  count?: number | string;
};

type SeoSummary = Awaited<ReturnType<typeof phpGetSeoSummary>>;

type ModuleId =
  | "ai_narrative"
  | "ga_kpi_summary"
  | "ga_trend_chart"
  | "ga_conversion_summary"
  | "seo_health_summary"
  | "seo_issue_list"
  | "seo_opportunity_list"
  | "ai_recommended_actions";

type ModulePlan = {
  id: ModuleId;
  title: string;
  dataSource: string;
  params?: Record<string, unknown>;
};

type PresetId = "traffic_drop" | "daily_priority" | "seo_score" | "aeo_geo_visibility";

type DashboardPlan = {
  intent: string;
  range?: {
    type?: string;
    days?: number;
  };
  narrative?: {
    title?: string;
    text?: string;
  };
  modules: ModulePlan[];
};

const ALLOWED_MODULES: ModuleId[] = [
  "ai_narrative",
  "ga_kpi_summary",
  "ga_trend_chart",
  "ga_conversion_summary",
  "seo_health_summary",
  "seo_issue_list",
  "seo_opportunity_list",
  "ai_recommended_actions",
];

const ALLOWED_PRESET_IDS: PresetId[] = [
  "traffic_drop",
  "daily_priority",
  "seo_score",
  "aeo_geo_visibility",
];

function dateDaysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function numberValue(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-TW").format(value);
}

function requestedDays(question: string) {
  const match = question.match(/(\d+)\s*(\u5929|\u65e5|days?)/i);
  if (!match) return null;

  const days = Number(match[1]);
  if (!Number.isFinite(days)) return null;

  return Math.min(Math.max(Math.round(days), 1), 365);
}

function presetPlan(presetId: PresetId | null, question: string): DashboardPlan | null {
  const days = requestedDays(question) || 30;

  if (presetId === "traffic_drop") {
    return {
      intent: "traffic_drop_analysis",
      range: { type: "relative", days },
      narrative: {
        title: "AI 流量診斷",
        text: "系統會先查看使用者與會話趨勢，再比對轉換摘要，判斷下降是否來自流量品質或轉換效率。",
      },
      modules: [
        { id: "ai_narrative", title: "AI 流量診斷", dataSource: "ai.narrative", params: {} },
        { id: "ga_trend_chart", title: "用戶與會話趨勢", dataSource: "ga.daily", params: { metrics: ["users", "sessions"] } },
        { id: "ga_kpi_summary", title: "GA 核心指標", dataSource: "ga.summary", params: { metrics: ["users", "sessions", "conversions"] } },
        { id: "ga_conversion_summary", title: "轉換摘要", dataSource: "ga.conversions", params: {} },
        { id: "ai_recommended_actions", title: "AI 建議行動", dataSource: "ai.actions", params: {} },
      ],
    };
  }

  if (presetId === "daily_priority") {
    return {
      intent: "daily_priority",
      range: { type: "relative", days },
      narrative: {
        title: "AI 今日優先事項",
        text: "系統會先檢查 SEO 風險與 GA 核心指標，整理今天最值得優先處理的事項。",
      },
      modules: [
        { id: "ai_narrative", title: "AI 今日優先事項", dataSource: "ai.narrative", params: {} },
        { id: "seo_issue_list", title: "SEO 待處理問題", dataSource: "seo.issues", params: {} },
        { id: "ga_kpi_summary", title: "GA 核心指標", dataSource: "ga.summary", params: { metrics: ["users", "sessions", "conversions"] } },
        { id: "ai_recommended_actions", title: "AI 建議行動", dataSource: "ai.actions", params: {} },
      ],
    };
  }

  if (presetId === "seo_score") {
    return {
      intent: "seo_score_explanation",
      range: { type: "relative", days },
      narrative: {
        title: "AI SEO 分數解讀",
        text: "系統會拆解 SEO 健康度、技術問題與優化機會，說明目前分數主要受哪些項目影響。",
      },
      modules: [
        { id: "ai_narrative", title: "AI SEO 分數解讀", dataSource: "ai.narrative", params: {} },
        { id: "seo_health_summary", title: "SEO 健康狀態", dataSource: "seo.summary", params: {} },
        { id: "seo_issue_list", title: "SEO 待處理問題", dataSource: "seo.issues", params: {} },
        { id: "seo_opportunity_list", title: "SEO 優化機會", dataSource: "seo.opportunities", params: {} },
      ],
    };
  }

  if (presetId === "aeo_geo_visibility") {
    return {
      intent: "aeo_geo_visibility",
      range: { type: "relative", days },
      narrative: {
        title: "AI AEO / GEO 能見度判斷",
        text: "系統會先以 SEO 健康度與內容機會作為基準，評估是否已具備 AEO / GEO 分析條件。",
      },
      modules: [
        { id: "ai_narrative", title: "AI AEO / GEO 能見度判斷", dataSource: "ai.narrative", params: {} },
        { id: "seo_health_summary", title: "SEO 健康狀態", dataSource: "seo.summary", params: {} },
        { id: "seo_opportunity_list", title: "AEO / GEO 內容機會", dataSource: "seo.opportunities", params: {} },
        { id: "ai_recommended_actions", title: "AI 建議行動", dataSource: "ai.actions", params: {} },
      ],
    };
  }

  return null;
}

function planDays(plan: DashboardPlan, question: string) {
  const fromQuestion = requestedDays(question);
  if (fromQuestion) return fromQuestion;

  const days = Number(plan.range?.days || 30);
  return Number.isFinite(days) ? Math.min(Math.max(Math.round(days), 1), 365) : 30;
}

function dateLabel(value: string) {
  return value.slice(5, 10);
}

function dateOffset(start: string, index: number) {
  const date = new Date(`${start}T00:00:00`);
  date.setDate(date.getDate() + index);
  return date.toISOString().slice(0, 10);
}

function trendLabel(row: GaDailyRow, index: number, start: string) {
  const raw = row.date || row.day || row.event_date;
  if (typeof raw === "string" && raw.length >= 10) {
    return dateLabel(raw);
  }

  return dateLabel(dateOffset(start, index));
}

function buildTrendRows(dailyRows: GaDailyRow[], start: string, days: number) {
  const rows = dailyRows.map((row, index) => ({
    label: trendLabel(row, index, start),
    users: numberValue(row.users),
    sessions: numberValue(row.sessions),
  }));

  if (rows.length >= days) {
    return rows.slice(0, days);
  }

  const existing = new Set(rows.map((row) => row.label));
  const padded = [...rows];

  for (let index = 0; index < days; index += 1) {
    const label = dateLabel(dateOffset(start, index));
    if (!existing.has(label)) {
      padded.push({ label, users: 0, sessions: 0 });
    }
  }

  return padded.slice(0, days);
}

function fallbackPlan(question: string): DashboardPlan {
  const days = requestedDays(question) || 30;
  const lower = question.toLowerCase();
  const modules: ModulePlan[] = [
    {
      id: "ai_narrative",
      title: "AI 分析方向",
      dataSource: "ai.narrative",
      params: {},
    },
    {
      id: "ga_kpi_summary",
      title: "GA 核心指標",
      dataSource: "ga.summary",
      params: { metrics: ["users", "sessions", "conversions"] },
    },
  ];

  if (lower.includes("seo")) {
    modules.push(
      {
        id: "seo_health_summary",
        title: "SEO 健康狀態",
        dataSource: "seo.summary",
        params: {},
      },
      {
        id: "seo_issue_list",
        title: "SEO 待處理問題",
        dataSource: "seo.issues",
        params: {},
      }
    );
  } else {
    modules.push({
      id: "ga_trend_chart",
      title: "用戶與會話趨勢",
      dataSource: "ga.daily",
      params: { metrics: ["users", "sessions"] },
    });
  }

  modules.push({
    id: "ai_recommended_actions",
    title: "AI 建議行動",
    dataSource: "ai.actions",
    params: {},
  });

  return {
    intent: "dashboard_analysis",
    range: { type: "relative", days },
    narrative: {
      title: "AI 分析方向",
      text: "AI 已選擇需要檢視的 dashboard 模塊，資料由系統即時查詢 GA 與 SEO 後呈現。",
    },
    modules,
  };
}

function sanitizePlan(value: unknown, question: string): DashboardPlan {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return fallbackPlan(question);
  }

  const raw = value as Partial<DashboardPlan>;
  const modules = Array.isArray(raw.modules)
    ? raw.modules
        .filter((module): module is ModulePlan => {
          return (
            Boolean(module) &&
            typeof module === "object" &&
            !Array.isArray(module) &&
            ALLOWED_MODULES.includes((module as ModulePlan).id)
          );
        })
        .map((module) => ({
          id: module.id,
          title: typeof module.title === "string" ? module.title : module.id,
          dataSource:
            typeof module.dataSource === "string" ? module.dataSource : module.id,
          params:
            module.params && typeof module.params === "object" && !Array.isArray(module.params)
              ? module.params
              : {},
        }))
    : [];

  if (modules.length === 0) {
    return fallbackPlan(question);
  }

  return {
    intent: typeof raw.intent === "string" ? raw.intent : "dashboard_analysis",
    range: {
      type: raw.range?.type || "relative",
      days: Number(raw.range?.days || requestedDays(question) || 30),
    },
    narrative: {
      title: raw.narrative?.title || "AI 分析方向",
      text:
        raw.narrative?.text ||
        "AI 已選擇需要檢視的 dashboard 模塊，資料由系統即時查詢後呈現。",
    },
    modules,
  };
}

async function requestPlan(question: string, sessionHeaders: HeadersInit) {
  try {
    const response = await fetch(highlightPhpApiUrl("dashboard/ai_plan.php"), {
      method: "POST",
      headers: sessionHeaders,
      body: JSON.stringify({ question }),
    });

    const json = (await response.json()) as { plan?: unknown; source?: string };
    return {
      plan: sanitizePlan(json.plan, question),
      source: json.source || "rules",
    };
  } catch {
    return {
      plan: fallbackPlan(question),
      source: "local_rules",
    };
  }
}

async function getGaData(
  memberId: number,
  session: ServerSession,
  start: string,
  end: string,
  days: number
) {
  if (!hasGaAccess(session)) {
    return {
      overview: {
        enabled: false,
        connected: false,
        users: 0,
        sessions: 0,
        pageviews: 0,
        conversions: 0,
        message: "尚未啟用 GA 數據分析。",
      },
      trend: [] as { label: string; users: number; sessions: number }[],
    };
  }

  try {
    const connections = (await getGAConnections(memberId)) as GaConnection[];
    const ids = connections.map((item) => Number(item.id)).filter(Boolean);

    if (ids.length === 0) {
      return {
        overview: {
          enabled: true,
          connected: false,
          users: 0,
          sessions: 0,
          pageviews: 0,
          conversions: 0,
          message: "尚未連接 GA 資料來源。",
        },
        trend: [] as { label: string; users: number; sessions: number }[],
      };
    }

    const [dailyRows, conversionRows] = await Promise.all([
      gaQuery(memberId, {
        type: "daily",
        ids,
        start,
        end,
      }) as Promise<GaDailyRow[]>,
      gaQuery(memberId, {
        type: "conversions",
        ids,
        start,
        end,
      }) as Promise<GaConversionRow[]>,
    ]);

    return {
      overview: {
        enabled: true,
        connected: true,
        users: dailyRows.reduce((sum, row) => sum + numberValue(row.users), 0),
        sessions: dailyRows.reduce((sum, row) => sum + numberValue(row.sessions), 0),
        pageviews: dailyRows.reduce((sum, row) => sum + numberValue(row.pageviews), 0),
        conversions: conversionRows.reduce((sum, row) => sum + numberValue(row.count), 0),
        message: `已連接 ${connections.length} 組 GA 資料來源。`,
      },
      trend: buildTrendRows(dailyRows, start, days),
    };
  } catch (error) {
    return {
      overview: {
        enabled: true,
        connected: false,
        users: 0,
        sessions: 0,
        pageviews: 0,
        conversions: 0,
        message: error instanceof Error ? error.message : "GA API 讀取失敗。",
      },
      trend: [] as { label: string; users: number; sessions: number }[],
    };
  }
}

async function getSeoData(memberId: number, session: ServerSession) {
  if (!hasSearchIntelligenceAccess(session)) {
    return {
      overview: {
        enabled: false,
        connected: false,
        siteCount: 0,
        score: null,
        issues: 0,
        opportunities: 0,
        message: "尚未啟用 Search Intelligence。",
      },
      summary: null as SeoSummary | null,
    };
  }

  try {
    const sitesResponse = await phpListSeoSites(memberId);
    const sites = sitesResponse.ok ? sitesResponse.data || [] : [];

    if (sites.length === 0) {
      return {
        overview: {
          enabled: true,
          connected: false,
          siteCount: 0,
          score: null,
          issues: 0,
          opportunities: 0,
          message: "尚未新增 SEO 站點。",
        },
        summary: null as SeoSummary | null,
      };
    }

    const summary = await phpGetSeoSummary(memberId, Number(sites[0].id));

    return {
      overview: {
        enabled: true,
        connected: true,
        siteCount: sites.length,
        score: summary.data?.health?.score ?? null,
        issues: summary.data?.technicalIssues?.length || 0,
        opportunities: summary.data?.topOpportunities?.length || 0,
        message: `已追蹤 ${sites.length} 個網站。`,
      },
      summary,
    };
  } catch (error) {
    return {
      overview: {
        enabled: true,
        connected: false,
        siteCount: 0,
        score: null,
        issues: 0,
        opportunities: 0,
        message: error instanceof Error ? error.message : "SEO API 讀取失敗。",
      },
      summary: null as SeoSummary | null,
    };
  }
}

function hydrateModule(
  module: ModulePlan,
  plan: DashboardPlan,
  rangeLabel: string,
  ga: Awaited<ReturnType<typeof getGaData>>,
  seo: Awaited<ReturnType<typeof getSeoData>>
) {
  if (module.id === "ai_narrative") {
    return {
      type: "narrative",
      eyebrow: plan.narrative?.title || module.title,
      text:
        plan.narrative?.text ||
        `AI 已依照 ${rangeLabel} 的資料需求組裝 dashboard。`,
    };
  }

  if (module.id === "ga_kpi_summary") {
    return {
      type: "metrics",
      columns: 3,
      items: [
        { label: "使用者", value: formatNumber(ga.overview.users), sub: rangeLabel, tone: "blue" },
        {
          label: "會話數",
          value: formatNumber(ga.overview.sessions),
          sub: "GA daily",
          tone: "green",
        },
        {
          label: "轉換數",
          value: formatNumber(ga.overview.conversions),
          sub: "GA conversions",
          tone: ga.overview.conversions > 0 ? "green" : "amber",
        },
      ],
    };
  }

  if (module.id === "ga_trend_chart") {
    return {
      type: "trendChart",
      title: module.title || "用戶與會話趨勢",
      sub: rangeLabel,
      series: [
        {
          label: "用戶數",
          tone: "blue",
          data: ga.trend.map((item) => ({ label: item.label, value: item.users })),
        },
        {
          label: "會話數",
          tone: "green",
          data: ga.trend.map((item) => ({ label: item.label, value: item.sessions })),
        },
      ],
    };
  }

  if (module.id === "ga_conversion_summary") {
    return {
      type: "metricHero",
      label: module.title || "轉換摘要",
      value: formatNumber(ga.overview.conversions),
      sub: `資料區間：${rangeLabel}`,
      badge: ga.overview.connected ? "GA 已連接" : "GA 待連接",
      badgeTone: ga.overview.connected ? "green" : "amber",
      asideValue: formatNumber(ga.overview.sessions),
      asideLabel: "會話數",
    };
  }

  if (module.id === "seo_health_summary") {
    return {
      type: "metricHero",
      label: module.title || "SEO 健康狀態",
      value: seo.overview.score === null ? "-" : String(seo.overview.score),
      sub: seo.overview.message,
      badge: seo.overview.connected ? "SI 已連接" : "SI 待設定",
      badgeTone: seo.overview.connected ? "blue" : "amber",
      asideValue: String(seo.overview.issues),
      asideLabel: "待處理問題",
    };
  }

  if (module.id === "seo_issue_list") {
    const issues = seo.summary?.data?.technicalIssues || [];
    return {
      type: "issues",
      title: module.title || "SEO 待處理問題",
      items:
        issues.length > 0
          ? issues.slice(0, 5).map((issue, index) => ({
              severity: index === 0 ? "high" : "mid",
              name: String(issue.message || issue.type || "SEO 技術問題"),
              status: "待處理",
              impact: issue.url ? String(issue.url) : "影響搜尋理解",
              href: "/si/seo",
            }))
          : [
              {
                severity: seo.overview.connected ? "low" : "mid",
                name: seo.overview.connected ? "目前沒有主要 SEO 問題" : "尚未取得 SEO 健檢資料",
                status: seo.overview.connected ? "穩定" : "待設定",
                impact: seo.overview.connected ? "Low" : "資料不足",
                href: "/si/seo",
              },
            ],
    };
  }

  if (module.id === "seo_opportunity_list") {
    const opportunities = seo.summary?.data?.topOpportunities || [];
    return {
      type: "issues",
      title: module.title || "SEO 機會清單",
      items:
        opportunities.length > 0
          ? opportunities.slice(0, 5).map((item) => ({
              severity: "mid",
              name: String(item.keyword || "SEO 優化機會"),
              status: "可優化",
              impact: String(item.recommendation || item.recommendations?.[0] || "提升搜尋曝光"),
              href: "/si/seo",
            }))
          : [
              {
                severity: "low",
                name: "目前沒有新的 SEO 機會",
                status: "穩定",
                impact: "Low",
                href: "/si/seo",
              },
            ],
    };
  }

  return {
    type: "action",
    num: 1,
    title: module.title || "AI 建議行動",
    desc: ga.overview.connected
      ? "先檢查流量趨勢與轉換摘要，再對照 SEO 健康狀態安排下一步。"
      : "先完成 GA 資料來源連接，AI 才能提供更完整的判斷。",
    href: ga.overview.connected ? "/ga" : "/ga/account",
    tags: [
      { text: "系統資料", tone: "impact" },
      { text: rangeLabel, tone: "time" },
    ],
  };
}

export async function POST(req: Request) {
  const session = await getServerSession();

  if (!session) {
    return NextResponse.json(
      { ok: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const question = String(body?.question || "").trim();

    if (!question) {
      return NextResponse.json(
        { ok: false, message: "question is required" },
        { status: 400 }
      );
    }

    if (question.length > 500) {
      return NextResponse.json(
        { ok: false, message: "question is too long" },
        { status: 400 }
      );
    }

    const quota = isDemoSession(session)
      ? { allowed: true, used: 0, limit: 999, remaining: 999 }
      : await checkDashboardAiQuota(session);

    if (!quota.allowed) {
      return NextResponse.json(
        {
          ok: false,
          message: "今日 AI 分析額度已用完，請明天再試或升級方案。",
          quota,
        },
        { status: 429 }
      );
    }

    const rawPresetId = typeof body?.presetId === "string" ? body.presetId : null;
    const presetId = ALLOWED_PRESET_IDS.includes(rawPresetId as PresetId)
      ? (rawPresetId as PresetId)
      : null;
    const preset = presetPlan(presetId, question);
    const { plan, source } = preset
      ? { plan: preset, source: "preset_rules" }
      : await requestPlan(question, phpAuthHeaders(session));
    const days = planDays(plan, question);
    const start = dateDaysAgo(days);
    const end = today();
    const rangeLabel = `${start} - ${end}`;
    const workspace = await resolveWorkspaceContext(req, session);
    const memberId = workspace.legacyOwnerMemberId;

    const [ga, seo] = await Promise.all([
      getGaData(memberId, session, start, end, days),
      getSeoData(memberId, session),
    ]);

    const blocks = plan.modules.map((module) =>
      hydrateModule(module, plan, rangeLabel, ga, seo)
    );

    const responsePayload = {
      ok: true,
      source,
      architecture: "plan_hydrate",
      quota: {
        ...quota,
        used: quota.used + 1,
        remaining: Math.max(0, quota.remaining - 1),
      },
      plan,
      context: {
        rangeLabel,
        ga: ga.overview,
        seo: seo.overview,
      },
      blocks,
    };

    if (!isDemoSession(session)) {
      await recordDashboardAiUsage(session, {
        question,
        lens: plan.intent || "overview",
        source,
        context: responsePayload.context,
        response: responsePayload.blocks,
      });
    }

    return NextResponse.json(responsePayload);
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        message:
          error instanceof Error && error.message
            ? error.message
            : "Dashboard AI compose failed",
      },
      { status: 500 }
    );
  }
}
