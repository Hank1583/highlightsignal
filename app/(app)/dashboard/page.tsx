import { redirect } from "next/navigation";
import DashboardWorkspace from "@/components/dashboard/DashboardWorkspace";
import { gaQuery, getGAConnections } from "@/lib/ga/gaApi";
import { phpGetSeoSummary, phpListSeoSites } from "@/lib/seo/seoApi";
import { getServerSession, type ServerSession } from "@/lib/serverSession";

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
  users: number;
  sessions: number;
  pageviews: number;
  conversions: number;
  message: string;
  trend: {
    label: string;
    users: number;
    sessions: number;
  }[];
};

type SeoOverview = {
  enabled: boolean;
  connected: boolean;
  siteCount: number;
  score: number | null;
  issues: number;
  opportunities: number;
  message: string;
};

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

function hasProduct(session: ServerSession, product: "ga" | "si") {
  if (product === "si" && session.enabledProducts.includes("seo")) {
    return true;
  }

  return session.enabledProducts.includes(product);
}

async function getGaOverview(session: ServerSession): Promise<GaOverview> {
  if (!hasProduct(session, "ga")) {
    return {
      enabled: false,
      connected: false,
      users: 0,
      sessions: 0,
      pageviews: 0,
      conversions: 0,
      message: "尚未啟用 GA 數據分析。",
      trend: [],
    };
  }

  try {
    const start = dateDaysAgo(30);
    const end = today();
    const connections = (await getGAConnections(Number(session.id))) as GaConnection[];
    const ids = connections.map((item) => Number(item.id)).filter(Boolean);

    if (ids.length === 0) {
      return {
        enabled: true,
        connected: false,
        users: 0,
        sessions: 0,
        pageviews: 0,
        conversions: 0,
        message: "尚未連接 GA 資料來源。",
        trend: [],
      };
    }

    const [dailyRows, conversionRows] = await Promise.all([
      gaQuery(Number(session.id), {
        type: "daily",
        ids,
        start,
        end,
      }) as Promise<GaDailyRow[]>,
      gaQuery(Number(session.id), {
        type: "conversions",
        ids,
        start,
        end,
      }) as Promise<GaConversionRow[]>,
    ]);

    return {
      enabled: true,
      connected: true,
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
      users: 0,
      sessions: 0,
      pageviews: 0,
      conversions: 0,
      message: error instanceof Error ? error.message : "GA API 讀取失敗。",
      trend: [],
    };
  }
}

async function getSeoOverview(session: ServerSession): Promise<SeoOverview> {
  if (!hasProduct(session, "si")) {
    return {
      enabled: false,
      connected: false,
      siteCount: 0,
      score: null,
      issues: 0,
      opportunities: 0,
      message: "尚未啟用 Search Intelligence。",
    };
  }

  try {
    const sitesResponse = await phpListSeoSites(Number(session.id));
    const sites = sitesResponse.ok ? sitesResponse.data || [] : [];

    if (sites.length === 0) {
      return {
        enabled: true,
        connected: false,
        siteCount: 0,
        score: null,
        issues: 0,
        opportunities: 0,
        message: "尚未新增 SEO 站點。",
      };
    }

    const summary = await phpGetSeoSummary(Number(session.id), Number(sites[0].id));

    return {
      enabled: true,
      connected: true,
      siteCount: sites.length,
      score: summary.data?.health?.score ?? null,
      issues: summary.data?.technicalIssues?.length || 0,
      opportunities: summary.data?.topOpportunities?.length || 0,
      message: `已追蹤 ${sites.length} 個網站。`,
    };
  } catch (error) {
    return {
      enabled: true,
      connected: false,
      siteCount: 0,
      score: null,
      issues: 0,
      opportunities: 0,
      message: error instanceof Error ? error.message : "SEO API 讀取失敗。",
    };
  }
}

export default async function DashboardPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/auth/login");
  }

  const [ga, seo] = await Promise.all([
    getGaOverview(session),
    getSeoOverview(session),
  ]);

  return (
    <DashboardWorkspace
      ga={ga}
      seo={seo}
      rangeLabel={`${dateDaysAgo(30)} - ${today()}`}
    />
  );
}
