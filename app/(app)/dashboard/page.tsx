import Link from "next/link";
import { redirect } from "next/navigation";
import { BarChart3, Megaphone, Search, Signal } from "lucide-react";
import { gaQuery, getGAConnections } from "@/lib/ga/gaApi";
import { phpGetSeoSummary, phpListSeoSites } from "@/lib/seo/seoApi";
import { getServerSession, type ServerSession } from "@/lib/serverSession";

type GaConnection = {
  id: number | string;
  property_id?: string;
  account_name?: string;
};

type GaDailyRow = {
  users?: number | string;
  sessions?: number | string;
  pageviews?: number | string;
  events?: number | string;
};

type GaConversionRow = {
  count?: number | string;
  conversion_name?: string;
};

const cardClass = "rounded-lg border border-slate-200 bg-white p-6 shadow-sm";

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

function hasProduct(session: ServerSession, product: "ga" | "si" | "ads") {
  if (product === "si" && session.enabledProducts.includes("seo")) {
    return true;
  }

  return session.enabledProducts.includes(product);
}

async function getGaOverview(session: ServerSession) {
  if (!hasProduct(session, "ga")) {
    return {
      enabled: false,
      connected: false,
      connections: [] as GaConnection[],
      users: 0,
      sessions: 0,
      pageviews: 0,
      conversions: 0,
      message: "尚未啟用 GA 模組",
    };
  }

  try {
    const connections = (await getGAConnections(Number(session.id))) as GaConnection[];
    const ids = connections.map((item) => Number(item.id)).filter(Boolean);

    if (ids.length === 0) {
      return {
        enabled: true,
        connected: false,
        connections,
        users: 0,
        sessions: 0,
        pageviews: 0,
        conversions: 0,
        message: "尚未串接 GA 資料來源",
      };
    }

    const [dailyRows, conversionRows] = await Promise.all([
      gaQuery(Number(session.id), {
        type: "daily",
        ids,
        start: dateDaysAgo(30),
        end: today(),
      }) as Promise<GaDailyRow[]>,
      gaQuery(Number(session.id), {
        type: "conversions",
        ids,
        start: dateDaysAgo(30),
        end: today(),
      }) as Promise<GaConversionRow[]>,
    ]);

    return {
      enabled: true,
      connected: true,
      connections,
      users: dailyRows.reduce((sum, row) => sum + numberValue(row.users), 0),
      sessions: dailyRows.reduce((sum, row) => sum + numberValue(row.sessions), 0),
      pageviews: dailyRows.reduce((sum, row) => sum + numberValue(row.pageviews), 0),
      conversions: conversionRows.reduce((sum, row) => sum + numberValue(row.count), 0),
      message: `${connections.length} 個 GA 資料來源`,
    };
  } catch (error) {
    return {
      enabled: true,
      connected: false,
      connections: [] as GaConnection[],
      users: 0,
      sessions: 0,
      pageviews: 0,
      conversions: 0,
      message: error instanceof Error ? error.message : "GA API 讀取失敗",
    };
  }
}

async function getSeoOverview(session: ServerSession) {
  if (!hasProduct(session, "si")) {
    return {
      enabled: false,
      connected: false,
      siteCount: 0,
      score: null as number | null,
      issues: 0,
      opportunities: 0,
      message: "尚未啟用 Search Intelligence 模組",
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
        score: null as number | null,
        issues: 0,
        opportunities: 0,
        message: "尚未新增 SEO 網站",
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
      message: `目前追蹤 ${sites.length} 個網站`,
    };
  } catch (error) {
    return {
      enabled: true,
      connected: false,
      siteCount: 0,
      score: null as number | null,
      issues: 0,
      opportunities: 0,
      message: error instanceof Error ? error.message : "SEO API 讀取失敗",
    };
  }
}

function getAdsOverview(session: ServerSession) {
  const subscription = session.subscribedApps.find(
    (item) => item.app_id === "highlightsignal-ads"
  );

  return {
    enabled: hasProduct(session, "ads"),
    expireAt: subscription?.expire_at,
    message: hasProduct(session, "ads")
      ? "ADS 模組已啟用，成效 API 尚未串接"
      : "尚未啟用 ADS 模組",
  };
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
  const ads = getAdsOverview(session);

  const modules = [
    {
      title: "GA 數據分析",
      href: "/ga",
      icon: BarChart3,
      enabled: ga.enabled,
      status: ga.connected ? "已串接" : ga.enabled ? "待設定" : "未啟用",
      desc: ga.message,
      metrics: [
        { label: "使用者", value: formatNumber(ga.users) },
        { label: "工作階段", value: formatNumber(ga.sessions) },
        { label: "瀏覽量", value: formatNumber(ga.pageviews) },
        { label: "轉換", value: formatNumber(ga.conversions) },
      ],
    },
    {
      title: "Search Intelligence",
      href: "/si/seo",
      icon: Search,
      enabled: seo.enabled,
      status: seo.connected ? "已串接" : seo.enabled ? "待設定" : "未啟用",
      desc: seo.message,
      metrics: [
        { label: "網站數", value: formatNumber(seo.siteCount) },
        { label: "健康分數", value: seo.score === null ? "-" : String(seo.score) },
        { label: "技術問題", value: formatNumber(seo.issues) },
        { label: "機會字", value: formatNumber(seo.opportunities) },
      ],
    },
    {
      title: "ADS 廣告成效",
      href: "/ads",
      icon: Megaphone,
      enabled: ads.enabled,
      status: ads.enabled ? "已啟用" : "未啟用",
      desc: ads.message,
      metrics: [
        { label: "API 狀態", value: "待串接" },
        { label: "訂閱到期", value: ads.expireAt || "-" },
      ],
    },
  ];

  const enabledCount = modules.filter((item) => item.enabled).length;
  const connectedCount = [ga.connected, seo.connected].filter(Boolean).length;

  return (
    <div className="space-y-8">
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-blue-600">
            Dashboard
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            關鍵訊號總覽
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            這裡會從已串接的 GA、SEO 與訂閱資料整理目前可用的行銷訊號。
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className={cardClass}>
          <p className="text-sm font-semibold text-slate-500">已啟用核心模組</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">
            {enabledCount} / 3
          </p>
        </div>
        <div className={cardClass}>
          <p className="text-sm font-semibold text-slate-500">已串接資料來源</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">
            {connectedCount} / 2
          </p>
          <p className="mt-2 text-xs text-slate-500">GA 與 SEO 目前支援資料串接</p>
        </div>
        <div className={cardClass}>
          <p className="text-sm font-semibold text-slate-500">資料區間</p>
          <p className="mt-3 text-3xl font-bold text-slate-900">30 天</p>
          <p className="mt-2 text-xs text-slate-500">
            {dateDaysAgo(30)} - {today()}
          </p>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        {modules.map((module) => {
          const Icon = module.icon;

          return (
            <div key={module.title} className={cardClass}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-blue-50 p-3 text-blue-600">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-900">{module.title}</h2>
                    <p className="mt-1 text-sm text-slate-500">{module.desc}</p>
                  </div>
                </div>
                <span
                  className={[
                    "shrink-0 rounded-full px-3 py-1 text-xs font-bold",
                    module.enabled
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-500",
                  ].join(" ")}
                >
                  {module.status}
                </span>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {module.metrics.map((metric) => (
                  <div key={metric.label} className="rounded-lg bg-slate-50 p-4">
                    <p className="text-xs font-semibold text-slate-500">
                      {metric.label}
                    </p>
                    <p className="mt-1 break-words text-xl font-bold text-slate-900">
                      {metric.value}
                    </p>
                  </div>
                ))}
              </div>

              <Link
                href={module.href}
                className="mt-6 inline-flex text-sm font-bold text-blue-600 hover:text-blue-700"
              >
                開啟模組
              </Link>
            </div>
          );
        })}
      </section>

      <section className={cardClass}>
        <div className="flex items-center gap-3">
          <Signal className="h-6 w-6 text-blue-600" />
          <h2 className="text-lg font-bold text-slate-900">接下來可以優先處理</h2>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {[
            ga.connected
              ? "查看 GA 近 30 天轉換與高流量頁面。"
              : "先完成 GA 資料來源串接。",
            seo.connected
              ? "處理 SEO 技術問題與機會關鍵字。"
              : "先新增 SEO 網站並產生健檢摘要。",
            ads.enabled
              ? "ADS 已啟用，下一步可規劃廣告成效 API。"
              : "如需廣告總覽，先到商城啟用 ADS 模組。",
          ].map((item) => (
            <div key={item} className="rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
              {item}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
