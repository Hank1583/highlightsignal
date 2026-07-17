import { getServerSession } from "@/lib/serverSession";
import { gaQuery } from "@/lib/ga/gaApi";
import { hasGaAccess } from "@/lib/subscription";
import { resolveWorkspaceContext } from "@/lib/workspaceServer";

type DateRange = {
  start: string;
  end: string;
};

type DailyRow = {
  date?: string;
  users?: number | string;
  sessions?: number | string;
  pageviews?: number | string;
  conversions?: number | string;
};

type SourceRow = {
  channel_group?: string;
  device?: string;
  sessions?: number | string;
  users?: number | string;
  conversions?: number | string;
};

type PageRow = {
  page_path?: string;
  page_title?: string;
  pageviews?: number | string;
  users?: number | string;
};

type ConversionRow = {
  conversion_name?: string;
  count?: number | string;
  value?: number | string;
};

function isValidDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function toNumber(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function sumRows<T>(rows: T[], key: keyof T) {
  return rows.reduce((sum, row) => sum + toNumber(row[key]), 0);
}

function pctChange(current: number, previous: number) {
  if (!previous) {
    return current ? 100 : 0;
  }

  return ((current - previous) / previous) * 100;
}

function formatPct(value: number) {
  const rounded = Math.round(value);
  return `${rounded > 0 ? "+" : ""}${rounded}%`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-TW").format(Math.round(value));
}

function parseDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getPreviousRange(range: DateRange): DateRange {
  const start = parseDate(range.start);
  const end = parseDate(range.end);
  const days = Math.max(
    1,
    Math.round((end.getTime() - start.getTime()) / 86400000) + 1
  );

  const prevEnd = new Date(start);
  prevEnd.setUTCDate(prevEnd.getUTCDate() - 1);

  const prevStart = new Date(prevEnd);
  prevStart.setUTCDate(prevStart.getUTCDate() - days + 1);

  return {
    start: formatDate(prevStart),
    end: formatDate(prevEnd),
  };
}

function getRangeEndingAt(endValue: string, days: number): DateRange {
  const safeDays = Math.max(1, days);
  const end = parseDate(endValue);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - safeDays + 1);

  return {
    start: formatDate(start),
    end: formatDate(end),
  };
}

function getRequestedRange(question: string, fallbackRange: DateRange): DateRange {
  const normalized = question.toLowerCase().replace(/\s+/g, "");
  const explicitDays = normalized.match(/(?:最近|近|過去)?(\d{1,3})(?:天|日|days?)/);

  if (explicitDays) {
    return getRangeEndingAt(fallbackRange.end, Number(explicitDays[1]));
  }

  if (
    normalized.includes("最近一週") ||
    normalized.includes("近一週") ||
    normalized.includes("這週") ||
    normalized.includes("本週") ||
    normalized.includes("thisweek") ||
    normalized.includes("last7")
  ) {
    return getRangeEndingAt(fallbackRange.end, 7);
  }

  if (
    normalized.includes("最近一個月") ||
    normalized.includes("近一個月") ||
    normalized.includes("這個月") ||
    normalized.includes("本月") ||
    normalized.includes("last30")
  ) {
    return getRangeEndingAt(fallbackRange.end, 30);
  }

  return fallbackRange;
}

function groupSources(rows: SourceRow[]) {
  const map = new Map<string, { name: string; sessions: number; conversions: number }>();

  rows.forEach((row) => {
    const name = row.channel_group || "Other";
    const current = map.get(name) || { name, sessions: 0, conversions: 0 };
    current.sessions += toNumber(row.sessions);
    current.conversions += toNumber(row.conversions);
    map.set(name, current);
  });

  return [...map.values()].sort((a, b) => b.sessions - a.sessions);
}

function groupPages(rows: PageRow[]) {
  const map = new Map<string, { path: string; title: string; pageviews: number; users: number }>();

  rows.forEach((row) => {
    const path = row.page_path || "/";
    const current = map.get(path) || {
      path,
      title: row.page_title || path,
      pageviews: 0,
      users: 0,
    };
    current.pageviews += toNumber(row.pageviews);
    current.users += toNumber(row.users);
    map.set(path, current);
  });

  return [...map.values()].sort((a, b) => b.pageviews - a.pageviews);
}

function getLargestDrop<T extends { name?: string; path?: string; sessions?: number; pageviews?: number; conversions?: number }>(
  currentRows: T[],
  previousRows: T[],
  getKey: (row: T) => string,
  getValue: (row: T) => number
) {
  const currentMap = new Map(currentRows.map((row) => [getKey(row), getValue(row)]));
  const previousMap = new Map(previousRows.map((row) => [getKey(row), getValue(row)]));

  return [...previousMap.entries()]
    .map(([key, previous]) => {
      const current = currentMap.get(key) || 0;
      return {
        key,
        current,
        previous,
        delta: current - previous,
        change: pctChange(current, previous),
      };
    })
    .sort((a, b) => a.delta - b.delta)[0];
}

function getIntent(question: string) {
  const normalized = question.toLowerCase();

  if (question.includes("轉換") || normalized.includes("conversion")) {
    return "conversions";
  }

  if (
    question.includes("頁面") ||
    question.includes("文章") ||
    question.includes("更新") ||
    normalized.includes("page")
  ) {
    return "pages";
  }

  return "traffic";
}

export async function POST(req: Request) {
  const session = await getServerSession();

  if (!session) {
    return Response.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  if (!hasGaAccess(session)) {
    return Response.json(
      { ok: false, message: "This account does not have GA access" },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => null);
  const question = String(body?.question || "").trim();
  const dateRange = body?.dashboardState?.dateRange as DateRange | undefined;
  const ids = body?.dashboardState?.selectedConnectionIds;

  if (
    !question ||
    !dateRange ||
    !isValidDate(dateRange.start) ||
    !isValidDate(dateRange.end) ||
    !Array.isArray(ids) ||
    ids.length === 0
  ) {
    return Response.json(
      { ok: false, message: "Missing question, date range, or GA property" },
      { status: 400 }
    );
  }

  const selectedIds = ids.map(Number).filter((id) => Number.isFinite(id));
  const analysisRange = getRequestedRange(question, dateRange);
  const previousRange = getPreviousRange(analysisRange);
  const intent = getIntent(question);

  try {
    const workspace = await resolveWorkspaceContext(req, session);
    const memberId = workspace.legacyOwnerMemberId;
    const [
      currentDaily,
      previousDaily,
      currentSources,
      previousSources,
      currentPages,
      previousPages,
      currentConversions,
      previousConversions,
    ] = await Promise.all([
      gaQuery(memberId, {
        type: "daily",
        ids: selectedIds,
        start: analysisRange.start,
        end: analysisRange.end,
      }) as Promise<DailyRow[]>,
      gaQuery(memberId, {
        type: "daily",
        ids: selectedIds,
        start: previousRange.start,
        end: previousRange.end,
      }) as Promise<DailyRow[]>,
      gaQuery(memberId, {
        type: "sources",
        ids: selectedIds,
        start: analysisRange.start,
        end: analysisRange.end,
      }) as Promise<SourceRow[]>,
      gaQuery(memberId, {
        type: "sources",
        ids: selectedIds,
        start: previousRange.start,
        end: previousRange.end,
      }) as Promise<SourceRow[]>,
      gaQuery(memberId, {
        type: "pages",
        ids: selectedIds,
        start: analysisRange.start,
        end: analysisRange.end,
      }) as Promise<PageRow[]>,
      gaQuery(memberId, {
        type: "pages",
        ids: selectedIds,
        start: previousRange.start,
        end: previousRange.end,
      }) as Promise<PageRow[]>,
      gaQuery(memberId, {
        type: "conversions",
        ids: selectedIds,
        start: analysisRange.start,
        end: analysisRange.end,
      }) as Promise<ConversionRow[]>,
      gaQuery(memberId, {
        type: "conversions",
        ids: selectedIds,
        start: previousRange.start,
        end: previousRange.end,
      }) as Promise<ConversionRow[]>,
    ]);

    const currentSessions = sumRows(currentDaily, "sessions");
    const previousSessions = sumRows(previousDaily, "sessions");
    const currentUsers = sumRows(currentDaily, "users");
    const previousUsers = sumRows(previousDaily, "users");
    const currentPageviews = sumRows(currentDaily, "pageviews");
    const previousPageviews = sumRows(previousDaily, "pageviews");
    const currentConversionCount = sumRows(currentConversions, "count");
    const previousConversionCount = sumRows(previousConversions, "count");

    const sourceDrop = getLargestDrop(
      groupSources(currentSources),
      groupSources(previousSources),
      (row) => row.name || "Other",
      (row) => row.sessions || 0
    );
    const pageDrop = getLargestDrop(
      groupPages(currentPages),
      groupPages(previousPages),
      (row) => row.path || "/",
      (row) => row.pageviews || 0
    );

    const sessionChange = pctChange(currentSessions, previousSessions);
    const userChange = pctChange(currentUsers, previousUsers);
    const pageviewChange = pctChange(currentPageviews, previousPageviews);
    const conversionChange = pctChange(currentConversionCount, previousConversionCount);

    const insights = [
      {
        title: "Sessions 變化",
        body: `${previousRange.start} - ${previousRange.end} 為 ${formatNumber(
          previousSessions
        )}，目前區間為 ${formatNumber(currentSessions)}，變化 ${formatPct(
          sessionChange
        )}。`,
        severity: sessionChange < -10 ? "warning" : sessionChange > 10 ? "success" : "info",
      },
      {
        title: "Users 與 Pageviews",
        body: `Users ${formatPct(userChange)}，Pageviews ${formatPct(
          pageviewChange
        )}。若 users 下降但 pageviews 穩定，通常代表新流量取得變弱；若兩者同步下降，要優先看來源與頁面。`,
        severity: userChange < -10 || pageviewChange < -10 ? "warning" : "info",
      },
      {
        title: "Conversions",
        body: `轉換由 ${formatNumber(previousConversionCount)} 變為 ${formatNumber(
          currentConversionCount
        )}，變化 ${formatPct(conversionChange)}。`,
        severity: conversionChange < -10 ? "warning" : conversionChange > 10 ? "success" : "info",
      },
    ];

    const actions = [
      {
        type: "setDateRange",
        label: "套用 AI 分析區間",
        dateRange: analysisRange,
      },
      {
        type: "navigate",
        label:
          intent === "pages"
            ? "查看頁面報表"
            : intent === "conversions"
              ? "查看轉換報表"
              : "查看流量來源",
        href:
          intent === "pages"
            ? "/ga/pages"
            : intent === "conversions"
              ? "/ga/conversions"
              : "/ga/traffic",
      },
    ] as any[];

    if (intent === "pages" && pageDrop) {
      actions.push({
        type: "highlight",
        label: `聚焦頁面 ${pageDrop.key}`,
        target: {
          type: "page",
          value: pageDrop.key,
        },
      });
    } else if (sourceDrop) {
      actions.push({
        type: "highlight",
        label: `聚焦來源 ${sourceDrop.key}`,
        target: {
          type: "channel",
          value: sourceDrop.key,
        },
      });
    }

    const pageSentence = pageDrop
      ? `頁面中影響最大的是 ${pageDrop.key}，pageviews 由 ${formatNumber(
          pageDrop.previous
        )} 變為 ${formatNumber(pageDrop.current)}，變化 ${formatPct(
          pageDrop.change
        )}。`
      : "目前沒有足夠頁面資料可比較。";

    const sourceSentence = sourceDrop
      ? `流量來源中變化最大的是 ${sourceDrop.key}，sessions 由 ${formatNumber(
          sourceDrop.previous
        )} 變為 ${formatNumber(sourceDrop.current)}，變化 ${formatPct(
          sourceDrop.change
        )}。`
      : "目前沒有足夠來源資料可比較。";

    const answer =
      intent === "pages"
        ? `${pageSentence} 建議先檢查該頁的標題、內容新鮮度、內部連結與 Search Console 查詢詞變化，再決定是否更新內容。`
        : intent === "conversions"
          ? `轉換變化為 ${formatPct(
              conversionChange
            )}。${sourceSentence} 建議接著比對高轉換來源是否流量下降，並確認 GA event 或 conversion 設定近期沒有異動。`
          : `${sourceSentence} ${pageSentence} 若這個變化集中在 Organic Search，下一步應合併 SEO/SI 資料檢查排名、索引與內容更新機會。`;

    return Response.json({
      ok: true,
      data: {
        summary:
          intent === "pages"
            ? "AI 已找出優先檢查的頁面"
            : intent === "conversions"
              ? "AI 已完成轉換變化歸因"
          : "AI 已完成流量變化分析",
        answer,
        insights,
        actions,
        meta: {
          intent,
          dateRange: analysisRange,
          previousRange,
        },
      },
    });
  } catch (error: any) {
    return Response.json(
      { ok: false, message: error?.message || "GA AI analysis failed" },
      { status: 500 }
    );
  }
}
