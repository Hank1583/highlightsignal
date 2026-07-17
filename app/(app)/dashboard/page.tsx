import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import DashboardWorkspace from "@/components/dashboard/DashboardWorkspace";
import { gaQuery, getGAConnections } from "@/lib/ga/gaApi";
import { phpGetSeoSummary, phpListSeoSites } from "@/lib/seo/seoApi";
import { getServerSession, type ServerSession } from "@/lib/serverSession";
import { hasGaAccess, hasSearchIntelligenceAccess } from "@/lib/subscription";
import { resolveWorkspaceContext } from "@/lib/workspaceServer";

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

type GaOverview = {
  enabled: boolean;
  connected: boolean;
  status: "ready" | "not_connected" | "error";
  users: number;
  sessions: number;
  pageviews: number;
  conversions: number;
  message: string;
  trend: { label: string; users: number; sessions: number }[];
};

type SeoOverview = {
  enabled: boolean;
  connected: boolean;
  status: "ready" | "not_connected" | "error";
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

function dateDaysAgo(days: number) {
  return dateOffset(today(), -days);
}

function today() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function numberValue(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dateLabel(value: string) {
  return value.slice(5, 10);
}

function dateOffset(start: string, index: number) {
  const [year, month, day] = start.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + index);
  return date.toISOString().slice(0, 10);
}

function trendDate(row: GaDailyRow, index: number, start: string) {
  const raw = row.date || row.day || row.event_date;
  return typeof raw === "string" && raw.length >= 10 ? raw.slice(0, 10) : dateOffset(start, index);
}

function buildTrendRows(dailyRows: GaDailyRow[], start: string, days: number) {
  const grouped = new Map<string, { users: number; sessions: number }>();

  dailyRows.forEach((row, index) => {
    const date = trendDate(row, index, start);
    const current = grouped.get(date) || { users: 0, sessions: 0 };
    current.users += numberValue(row.users);
    current.sessions += numberValue(row.sessions);
    grouped.set(date, current);
  });

  return Array.from({ length: days }, (_, index) => {
    const date = dateOffset(start, index);
    const values = grouped.get(date) || { users: 0, sessions: 0 };
    return { label: dateLabel(date), ...values };
  });
}

async function getGaOverview(session: ServerSession, memberId: number): Promise<GaOverview> {
  if (!hasGaAccess(session)) {
    return {
      enabled: false,
      connected: false,
      status: "not_connected",
      users: 0,
      sessions: 0,
      pageviews: 0,
      conversions: 0,
      message: "尚未啟用網站成效模組。",
      trend: [],
    };
  }

  try {
    const start = dateDaysAgo(29);
    const end = today();
    const connections = (await getGAConnections(memberId)) as GaConnection[];
    const ids = connections.map((item) => Number(item.id)).filter(Boolean);

    if (ids.length === 0) {
      return {
        enabled: true,
        connected: false,
        status: "not_connected",
        users: 0,
        sessions: 0,
        pageviews: 0,
        conversions: 0,
        message: "尚未連接 GA 資料來源。",
        trend: [],
      };
    }

    const [dailyRows, conversionRows] = await Promise.all([
      gaQuery(memberId, { type: "daily", ids, start, end }) as Promise<GaDailyRow[]>,
      gaQuery(memberId, { type: "conversions", ids, start, end }) as Promise<GaConversionRow[]>,
    ]);

    return {
      enabled: true,
      connected: true,
      status: "ready",
      users: dailyRows.reduce((sum, row) => sum + numberValue(row.users), 0),
      sessions: dailyRows.reduce((sum, row) => sum + numberValue(row.sessions), 0),
      pageviews: dailyRows.reduce((sum, row) => sum + numberValue(row.pageviews), 0),
      conversions: conversionRows.reduce((sum, row) => sum + numberValue(row.count), 0),
      message: `已連接 ${connections.length} 組 GA 資料來源。`,
      trend: buildTrendRows(dailyRows, start, 30),
    };
  } catch (error) {
    return {
      enabled: true,
      connected: false,
      status: "error",
      users: 0,
      sessions: 0,
      pageviews: 0,
      conversions: 0,
      message: error instanceof Error ? error.message : "GA API 讀取失敗。",
      trend: [],
    };
  }
}

async function getSeoOverview(session: ServerSession, memberId: number): Promise<SeoOverview> {
  if (!hasSearchIntelligenceAccess(session)) {
    return {
      enabled: false,
      connected: false,
      status: "not_connected",
      siteCount: 0,
      score: null,
      issues: 0,
      opportunities: 0,
      comparison: null,
      message: "尚未啟用搜尋與 AI 成效模組。",
    };
  }

  try {
    const sitesResponse = await phpListSeoSites(memberId);
    const sites = sitesResponse.ok ? sitesResponse.data || [] : [];

    if (sites.length === 0) {
      return {
        enabled: true,
        connected: false,
        status: "not_connected",
        siteCount: 0,
        score: null,
        issues: 0,
        opportunities: 0,
        comparison: null,
        message: "尚未新增 SEO 站點。",
      };
    }

    const summary = await phpGetSeoSummary(memberId, Number(sites[0].id));

    return {
      enabled: true,
      connected: true,
      status: "ready",
      siteCount: sites.length,
      score: summary.data?.health?.score ?? null,
      issues: summary.data?.technicalIssues?.length || 0,
      opportunities: summary.data?.topOpportunities?.length || 0,
      comparison: summary.data?.comparison
        ? {
            available: summary.data.comparison.available,
            scoreBefore: summary.data.comparison.health_score.before,
            scoreAfter: summary.data.comparison.health_score.after,
            issuesBefore: summary.data.comparison.issues.before,
            issuesAfter: summary.data.comparison.issues.after,
            fixed: summary.data.comparison.issues.fixed,
            added: summary.data.comparison.issues.added,
            remaining: summary.data.comparison.issues.remaining,
          }
        : null,
      message: `已新增 ${sites.length} 個 SEO 站點。`,
    };
  } catch (error) {
    return {
      enabled: true,
      connected: false,
      status: "error",
      siteCount: 0,
      score: null,
      issues: 0,
      opportunities: 0,
      comparison: null,
      message: error instanceof Error ? error.message : "SEO API 讀取失敗。",
    };
  }
}

export default async function DashboardPage() {
  const session = await getServerSession();
  if (!session) redirect("/auth/login");

  const selectedWorkspaceId = Number((await cookies()).get("hs_workspace_id")?.value || session.id);
  const contextRequest = new Request("http://internal/dashboard", {
    headers: { "X-Workspace-Id": String(selectedWorkspaceId) },
  });

  let dataMemberId = Number(session.id);
  try {
    const workspace = await resolveWorkspaceContext(contextRequest, session);
    dataMemberId = workspace.legacyOwnerMemberId;
  } catch {
    // A stale workspace cookie must not prevent the dashboard from loading.
  }

  const [ga, seo] = await Promise.all([
    getGaOverview(session, dataMemberId),
    getSeoOverview(session, dataMemberId),
  ]);

  return (
    <DashboardWorkspace
      ga={ga}
      seo={seo}
      rangeLabel={`${dateDaysAgo(29)} - ${today()}`}
      updatedAt={new Date().toISOString()}
    />
  );
}
