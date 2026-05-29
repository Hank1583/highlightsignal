"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  HeartPulse,
  LineChart,
  ListChecks,
  MessageSquareText,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import OnboardingChecklist from "@/components/dashboard/OnboardingChecklist";

type Lens = "overview" | "traffic" | "priority" | "seo" | "visibility";
type PresetId = "traffic_drop" | "daily_priority" | "seo_score" | "aeo_geo_visibility";

const presetPrompts: {
  id: PresetId;
  question: string;
}[] = [
  { id: "traffic_drop", question: "流量為什麼下降？" },
  { id: "daily_priority", question: "今天優先做什麼？" },
  { id: "seo_score", question: "SEO 分數為什麼這樣？" },
  { id: "aeo_geo_visibility", question: "AEO / GEO 能見度如何？" },
];

type Props = {
  ga: {
    enabled: boolean;
    connected: boolean;
    users: number;
    sessions: number;
    pageviews: number;
    conversions: number;
    message: string;
    trend?: {
      label: string;
      users: number;
      sessions: number;
    }[];
  };
  seo: {
    enabled: boolean;
    connected: boolean;
    siteCount: number;
    score: number | null;
    issues: number;
    opportunities: number;
    message: string;
  };
  rangeLabel: string;
};

type NarrativeBlock = {
  type: "narrative";
  eyebrow: string;
  text: string;
};

type MetricHeroBlock = {
  type: "metricHero";
  label: string;
  value: string;
  sub: string;
  badge: string;
  badgeTone: "green" | "amber" | "rose" | "blue";
  asideValue: string;
  asideLabel: string;
};

type MetricsBlock = {
  type: "metrics";
  columns: 3 | 4;
  items: {
    label: string;
    value: string;
    sub: string;
    tone?: "green" | "amber" | "rose" | "blue";
  }[];
};

type ChartBlock = {
  type: "chart";
  title: string;
  sub: string;
  highlightIndex?: number;
  bars: { label: string; value: number }[];
};

type TrendChartBlock = {
  type: "trendChart";
  title: string;
  sub: string;
  series: {
    label: string;
    tone: "blue" | "green" | "amber" | "rose";
    data: { label: string; value: number }[];
  }[];
};

type ActionBlock = {
  type: "action";
  urgent?: boolean;
  num: number;
  title: string;
  desc: string;
  href: string;
  tags: { text: string; tone: "time" | "impact" | "warn" }[];
};

type IssueBlock = {
  type: "issues";
  title: string;
  items: {
    severity: "high" | "mid" | "low";
    name: string;
    status: string;
    impact: string;
    href: string;
  }[];
};

type ScoreBlock = {
  type: "scoreBreakdown";
  title: string;
  items: { label: string; value: number; tone: "blue" | "green" | "amber" | "rose" }[];
};

type BlockTone = "green" | "amber" | "rose" | "blue";
type ActionTone = "time" | "impact" | "warn";
type IssueSeverity = "high" | "mid" | "low";

type AIBlock =
  | NarrativeBlock
  | MetricHeroBlock
  | MetricsBlock
  | ChartBlock
  | TrendChartBlock
  | ActionBlock
  | IssueBlock
  | ScoreBlock;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function textValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function numberValue(value: unknown, fallback = 0) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function sanitizeTone(value: unknown): BlockTone {
  return value === "green" || value === "amber" || value === "rose" || value === "blue"
    ? value
    : "blue";
}

function sanitizeActionTone(value: unknown): ActionTone {
  return value === "impact" || value === "warn" || value === "time" ? value : "time";
}

function sanitizeSeverity(value: unknown): IssueSeverity {
  if (value === "high" || value === "mid" || value === "low") return value;
  if (value === "medium") return "mid";
  return "mid";
}

function sanitizeBlocks(value: unknown): AIBlock[] | null {
  if (!Array.isArray(value)) return null;

  const blocks = value
    .map((block): AIBlock | null => {
      if (!isRecord(block) || typeof block.type !== "string") return null;

      if (block.type === "narrative") {
        return {
          type: "narrative",
          eyebrow: textValue(block.eyebrow, "AI 分析"),
          text: textValue(block.text, "AI 已完成資料判讀，但回傳內容不完整。"),
        };
      }

      if (block.type === "metricHero") {
        return {
          type: "metricHero",
          label: textValue(block.label, "核心指標"),
          value: textValue(block.value, "-"),
          sub: textValue(block.sub),
          badge: textValue(block.badge, "AI 判斷"),
          badgeTone: sanitizeTone(block.badgeTone),
          asideValue: textValue(block.asideValue, "-"),
          asideLabel: textValue(block.asideLabel, "補充指標"),
        };
      }

      if (block.type === "metrics") {
        const items = Array.isArray(block.items)
          ? block.items.filter(isRecord).map((item) => ({
              label: textValue(item.label, "Metric"),
              value: textValue(item.value, "-"),
              sub: textValue(item.sub),
              tone: sanitizeTone(item.tone),
            }))
          : [];

        if (items.length === 0) return null;

        return {
          type: "metrics",
          columns: block.columns === 4 ? 4 : 3,
          items,
        };
      }

      if (block.type === "chart") {
        const bars = Array.isArray(block.bars)
          ? block.bars.filter(isRecord).map((bar) => ({
              label: textValue(bar.label, "Data"),
              value: clamp(numberValue(bar.value), 0, 100),
            }))
          : [];

        if (bars.length === 0) return null;

        return {
          type: "chart",
          title: textValue(block.title, "AI 趨勢圖"),
          sub: textValue(block.sub),
          highlightIndex:
            typeof block.highlightIndex === "number" ? block.highlightIndex : undefined,
          bars,
        };
      }

      if (block.type === "trendChart") {
        const series = Array.isArray(block.series)
          ? block.series.filter(isRecord).map((serie) => ({
              label: textValue(serie.label, "Series"),
              tone: sanitizeTone(serie.tone),
              data: Array.isArray(serie.data)
                ? serie.data.filter(isRecord).map((point) => ({
                    label: textValue(point.label, "Data"),
                    value: numberValue(point.value),
                  }))
                : [],
            }))
          : [];

        if (series.length === 0 || series.every((serie) => serie.data.length === 0)) {
          return null;
        }

        return {
          type: "trendChart",
          title: textValue(block.title, "趨勢圖"),
          sub: textValue(block.sub),
          series,
        };
      }

      if (block.type === "action") {
        const tags = Array.isArray(block.tags)
          ? block.tags.filter(isRecord).map((tag) => ({
              text: textValue(tag.text, "建議"),
              tone: sanitizeActionTone(tag.tone),
            }))
          : [];

        return {
          type: "action",
          urgent: Boolean(block.urgent),
          num: numberValue(block.num, 1),
          title: textValue(block.title, "AI 建議行動"),
          desc: textValue(block.desc, "請查看相關分析後再執行。"),
          href: textValue(block.href, "/dashboard"),
          tags,
        };
      }

      if (block.type === "issues") {
        const items = Array.isArray(block.items)
          ? block.items.filter(isRecord).map((item) => ({
              severity: sanitizeSeverity(item.severity),
              name: textValue(item.name, "待確認項目"),
              status: textValue(item.status, "待確認"),
              impact: textValue(item.impact, "-"),
              href: textValue(item.href, "/dashboard"),
            }))
          : [];

        if (items.length === 0) return null;

        return {
          type: "issues",
          title: textValue(block.title, "AI 偵測問題"),
          items,
        };
      }

      if (block.type === "scoreBreakdown") {
        const items = Array.isArray(block.items)
          ? block.items.filter(isRecord).map((item) => ({
              label: textValue(item.label, "Score"),
              value: clamp(numberValue(item.value), 0, 100),
              tone: sanitizeTone(item.tone),
            }))
          : [];

        if (items.length === 0) return null;

        return {
          type: "scoreBreakdown",
          title: textValue(block.title, "AI 評分拆解"),
          items,
        };
      }

      return null;
    })
    .filter((block): block is AIBlock => block !== null);

  return blocks.length > 0 ? blocks : null;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-TW").format(value);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function inferLens(question: string): Lens {
  const text = question.toLowerCase();

  if (text.includes("流量") || text.includes("traffic") || text.includes("下降")) {
    return "traffic";
  }

  if (text.includes("優先") || text.includes("先做") || text.includes("priority")) {
    return "priority";
  }

  if (text.includes("seo") || text.includes("修復") || text.includes("問題")) {
    return "seo";
  }

  if (text.includes("aeo") || text.includes("geo") || text.includes("曝光") || text.includes("visibility")) {
    return "visibility";
  }

  return "overview";
}

function toneClass(tone?: "green" | "amber" | "rose" | "blue") {
  if (tone === "green") return "bg-emerald-50 text-emerald-700";
  if (tone === "amber") return "bg-amber-50 text-amber-700";
  if (tone === "rose") return "bg-rose-50 text-rose-700";
  return "bg-blue-50 text-blue-700";
}

function barColor(tone: "blue" | "green" | "amber" | "rose") {
  if (tone === "green") return "bg-emerald-500";
  if (tone === "amber") return "bg-amber-500";
  if (tone === "rose") return "bg-rose-500";
  return "bg-blue-600";
}

function softBarColor(tone: "blue" | "green" | "amber" | "rose") {
  if (tone === "green") return "bg-emerald-300";
  if (tone === "amber") return "bg-amber-300";
  if (tone === "rose") return "bg-rose-300";
  return "bg-blue-300";
}

function dateLabel(value: string) {
  return value.slice(5, 10);
}

function dateOffset(start: string, index: number) {
  const date = new Date(`${start}T00:00:00`);
  date.setDate(date.getDate() + index);
  return date.toISOString().slice(0, 10);
}

export default function DashboardWorkspace({
  ga: initialGa,
  seo: initialSeo,
  rangeLabel: initialRangeLabel,
}: Props) {
  const [askOpen, setAskOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [lens, setLens] = useState<Lens>("overview");
  const [stageReady, setStageReady] = useState(true);
  const [composedBlocks, setComposedBlocks] = useState<AIBlock[] | null>(null);
  const [askMessage, setAskMessage] = useState("");
  const [ga, setGa] = useState(initialGa);
  const [seo, setSeo] = useState(initialSeo);
  const [rangeLabel, setRangeLabel] = useState(initialRangeLabel);

  const confidence = useMemo(() => {
    const base = 48 + (ga.connected ? 16 : 0) + (seo.connected ? 18 : 0);
    return clamp(base - Math.min(seo.issues, 8), 42, 92);
  }, [ga.connected, seo.connected, seo.issues]);

  const chartBars = useMemo(() => {
    if (ga.trend?.length) {
      return ga.trend.map((item) => ({
        label: item.label,
        value: item.users,
      }));
    }

    const base = ga.connected ? clamp(Math.round(ga.users / 16), 18, 86) : 24;
    const start = rangeLabel.split(" - ")[0] || "";
    const days = rangeLabel.includes(" - ") ? 30 : 7;
    const ratios = [0.44, 0.68, 0.58, 0.83, 0.74, 1, 0.81];

    return Array.from({ length: days }, (_, index) => ({
      label: start ? dateLabel(dateOffset(start, index)) : `${index + 1}`,
      // Fallback only applies before GA daily data is available.
      value: clamp(Math.round(base * ratios[index % ratios.length] + index * 2), 12, 96),
    }));
  }, [ga.connected, ga.trend, ga.users, rangeLabel]);

  const blocks = useMemo<AIBlock[]>(() => {
    const seoScore = seo.score ?? (seo.connected ? 62 : 0);
    const visibilityRisk = seo.connected ? clamp(seo.issues * 4, 8, 28) : 18;

    if (lens === "traffic") {
      return [
        {
          type: "narrative",
          eyebrow: "AI 流量診斷",
          text: ga.connected
            ? "AI 判斷：流量問題不能只看總使用者數，應先比對工作階段、轉換與 SEO 健康度，確認波動是否來自搜尋入口頁或來源品質。"
            : "AI 判斷：目前 GA 尚未連接，流量診斷缺少最重要的基準資料。",
        },
        {
          type: "metricHero",
          label: "近 30 天工作階段",
          value: formatNumber(ga.sessions),
          sub: ga.connected ? "可用於來源品質與轉換診斷" : ga.message,
          badge: ga.connected ? "資料就緒" : "缺少資料來源",
          badgeTone: ga.connected ? "green" : "rose",
          asideValue: formatNumber(ga.conversions),
          asideLabel: "轉換數",
        },
        {
          type: "chart",
          title: "流量脈衝",
          sub: "AI 會用這個趨勢判斷是否需要下鑽來源或頁面層級資料。",
          highlightIndex: ga.connected ? 5 : undefined,
          bars: chartBars,
        },
        {
          type: "metrics",
          columns: 4,
          items: [
            { label: "使用者", value: formatNumber(ga.users), sub: "近 30 天", tone: "blue" },
            { label: "工作階段", value: formatNumber(ga.sessions), sub: "流量基準", tone: "green" },
            { label: "瀏覽量", value: formatNumber(ga.pageviews), sub: "互動訊號" },
            { label: "轉換", value: formatNumber(ga.conversions), sub: "品質檢查", tone: ga.conversions ? "green" : "amber" },
          ],
        },
      ];
    }

    if (lens === "priority") {
      return [
        {
          type: "narrative",
          eyebrow: "AI 優先順序編排",
          text: seo.connected
            ? "AI 判斷：今天最值得先處理的是會影響搜尋理解的技術問題，而不是先看更多報表。修復後可提升後續 AEO / GEO 分析可信度。"
            : "AI 判斷：優先事項是建立資料基準。沒有 SEO 站點時，AI 無法判斷搜尋與 AI 能見度風險。",
        },
        {
          type: "action",
          urgent: true,
          num: 1,
          title: seo.connected ? "修復 SEO 技術問題" : "建立第一個 SEO 站點",
          desc: seo.connected
            ? "此問題正在影響索引品質與 AI 搜尋對內容的理解，建議優先修復。"
            : "建立站點後才能產生 SEO health、technical issue 與內容機會。",
          href: "/si/seo",
          tags: [
            { text: "高影響", tone: "impact" },
            { text: "約 30 分鐘", tone: "time" },
            { text: seo.connected ? `-${visibilityRisk}% 能見度風險` : "需要資料基準", tone: "warn" },
          ],
        },
        {
          type: "action",
          num: 2,
          title: ga.connected ? "檢查流量品質" : "連接 GA 資料來源",
          desc: ga.connected
            ? "用 GA 驗證搜尋修復是否帶來流量與轉換變化。"
            : "補齊 GA 後，AI 才能把搜尋改善連到商業成效。",
          href: ga.connected ? "/ga" : "/ga/account",
          tags: [
            { text: "成效量測", tone: "time" },
            { text: ga.connected ? "資料就緒" : "缺少資料", tone: ga.connected ? "impact" : "warn" },
          ],
        },
        {
          type: "metrics",
          columns: 3,
          items: [
            { label: "AI 信心度", value: `${confidence}%`, sub: "決策品質", tone: "blue" },
            { label: "SEO 問題", value: String(seo.issues), sub: "技術風險", tone: seo.issues ? "rose" : "green" },
            { label: "優化機會", value: String(seo.opportunities), sub: "內容成長空間", tone: "green" },
          ],
        },
      ];
    }

    if (lens === "seo") {
      return [
        {
          type: "narrative",
          eyebrow: "AI SEO 風險分析",
          text: seo.connected
            ? "AI 判斷：SEO 健康度的重點不是分數本身，而是哪些底層問題會阻礙索引、Schema 理解與 AI 摘要引用。"
            : "AI 判斷：目前缺少 SEO 站點，無法建立健康分數、索引覆蓋或 Schema 完整度。",
        },
        {
          type: "metricHero",
          label: "SEO 健康分數",
          value: seo.score === null ? "-" : String(seo.score),
          sub: seo.connected ? `偵測到 ${seo.issues} 個技術問題` : seo.message,
          badge: seo.connected ? "需要檢查" : "尚未設定",
          badgeTone: seo.connected && seo.issues > 0 ? "amber" : "rose",
          asideValue: String(seo.opportunities),
          asideLabel: "內容機會",
        },
        {
          type: "scoreBreakdown",
          title: "SEO 就緒度拆解",
          items: [
            { label: "內容覆蓋", value: seo.connected ? 86 : 0, tone: "blue" },
            { label: "技術 SEO", value: seo.connected ? clamp(92 - seo.issues * 8, 25, 92) : 0, tone: seo.issues ? "rose" : "green" },
            { label: "Schema 就緒度", value: seo.connected ? 62 : 0, tone: "amber" },
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
            {
              severity: seo.opportunities > 0 ? "mid" : "low",
              name: "適合問答型頁面的內容機會",
              status: seo.opportunities > 0 ? "建議處理" : "持續觀察",
              impact: seo.opportunities > 0 ? `+${clamp(seo.opportunities * 3, 3, 18)}%` : "Low",
              href: "/si/seo",
            },
          ],
        },
      ];
    }

    if (lens === "visibility") {
      return [
        {
          type: "narrative",
          eyebrow: "AI 能見度編排",
          text: seo.connected
            ? "AI 判斷：SEO 基礎資料已可用，下一步應檢查內容是否能被 AI 搜尋摘要、問答與引用場景正確理解。"
            : "AI 判斷：AEO / GEO 依賴 SEO 站點資料。請先建立站點，再產生 AI 能見度分析。",
        },
        {
          type: "metricHero",
          label: "AI 能見度就緒度",
          value: seo.connected ? "可分析" : "受阻",
          sub: seo.connected ? "可以開始 AEO / GEO 分析" : "需要 SEO 資料基準",
          badge: seo.connected ? "建議產生" : "需要設定",
          badgeTone: seo.connected ? "green" : "amber",
          asideValue: `${seo.opportunities}`,
          asideLabel: "Answer opportunities",
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
        {
          type: "action",
          num: 1,
          title: seo.connected ? "產生 AEO 分析" : "先建立 SEO 站點",
          desc: seo.connected
            ? "檢查內容是否能回答使用者問題，並補足 FAQ / snippet / answer-ready structure。"
            : "AEO / GEO 需要站點資料作為分析基礎。",
          href: seo.connected ? "/si/aeo" : "/si/seo",
          tags: [
            { text: "AI 搜尋", tone: "impact" },
            { text: "下一步", tone: "time" },
          ],
        },
      ];
    }

    return [
      {
        type: "narrative",
        eyebrow: "AI 高階摘要",
        text: "AI 判斷：這不是單一數字的 dashboard。決策順序應該是資料完整度、SEO 技術風險、AI 能見度擴展，最後才看一般流量報表。",
      },
      {
        type: "metrics",
        columns: 4,
        items: [
          { label: "使用者", value: formatNumber(ga.users), sub: ga.connected ? "GA 已連接" : ga.message, tone: ga.connected ? "blue" : "amber" },
          { label: "工作階段", value: formatNumber(ga.sessions), sub: "近 30 天基準", tone: "green" },
          { label: "轉換", value: formatNumber(ga.conversions), sub: "品質訊號", tone: ga.conversions ? "green" : "amber" },
          { label: "SEO 健康度", value: seo.score === null ? "-" : String(seo.score), sub: seo.connected ? `${seo.issues} 個問題` : seo.message, tone: seo.connected ? "blue" : "rose" },
        ],
      },
      {
        type: "chart",
        title: "流量脈衝",
        sub: "近期趨勢會作為 AI 決策的輔助證據。",
        bars: chartBars,
      },
      {
        type: "issues",
        title: "決策阻礙",
        items: [
          {
            severity: seo.connected ? (seo.issues > 0 ? "high" : "low") : "high",
            name: seo.connected ? "SEO 技術風險" : "缺少搜尋資料基準",
            status: seo.connected && seo.issues === 0 ? "持續觀察" : "需要處理",
            impact: seo.connected ? `${seo.issues} 個問題` : "受阻",
            href: "/si/seo",
          },
          {
            severity: ga.connected ? "low" : "mid",
            name: ga.connected ? "流量驗證已就緒" : "缺少 GA 資料來源",
            status: ga.connected ? "資料就緒" : "需要處理",
            impact: ga.connected ? `${formatNumber(ga.sessions)} 次工作階段` : "缺少資料",
            href: ga.connected ? "/ga" : "/ga/account",
          },
        ],
      },
    ];
  }, [chartBars, confidence, ga, lens, seo]);

  const visibleBlocks = composedBlocks ?? blocks;

  async function askAi(nextQuestion: string, presetId?: PresetId) {
    const trimmed = nextQuestion.trim();
    if (!trimmed) return;

    const nextLens = inferLens(trimmed);
    setStageReady(false);
    setLens(nextLens);
    setAskOpen(false);
    setQuestion("");
    setAskMessage("");

    try {
      const response = await fetch("/api/dashboard/ai-compose", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question: trimmed,
          presetId,
          context: {
            rangeLabel,
            ga,
            seo,
          },
        }),
      });

      const data = (await response.json()) as {
        lens?: Lens;
        blocks?: unknown;
        context?: Partial<Props>;
        message?: string;
        quota?: {
          used: number;
          limit: number;
          remaining: number;
        };
      };

      if (!response.ok) {
        throw new Error(data.message || "AI compose API failed");
      }

      if (data.context?.ga) setGa(data.context.ga);
      if (data.context?.seo) setSeo(data.context.seo);
      if (data.context?.rangeLabel) setRangeLabel(data.context.rangeLabel);
      setLens(data.lens || nextLens);
      setComposedBlocks(sanitizeBlocks(data.blocks));
      if (data.quota) {
        setAskMessage(
          `今日 AI 分析額度：${data.quota.used} / ${data.quota.limit}，剩餘 ${data.quota.remaining} 次。`
        );
      }
    } catch (error) {
      setAskMessage(
        error instanceof Error
          ? error.message
          : "AI 暫時無法產生新的版面，已保留目前的規則式分析。"
      );
      setComposedBlocks(null);
    } finally {
      window.setTimeout(() => setStageReady(true), 160);
    }
  }

  function handleAskSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    askAi(question);
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)] space-y-5 p-6 pb-28 lg:p-8">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-blue-600">
              AI 區塊編排器
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
              智能決策中心
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              AI 會依照問題組裝摘要、指標、圖表、行動與問題清單，而不是只切換視窗。
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {[
              ["分析區間", rangeLabel],
              ["分析模式", lens],
              ["AI 信心度", `${confidence}%`],
              ["啟用產品", `${[ga.enabled, seo.enabled].filter(Boolean).length} / 2`],
              ["資料就緒", `${[ga.connected, seo.connected].filter(Boolean).length} / 2`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg bg-slate-50 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                  {label}
                </p>
                <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <OnboardingChecklist ga={ga} seo={seo} />

      {askMessage && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          {askMessage}
        </div>
      )}

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-black uppercase tracking-wider text-slate-400">
          讓 AI 組裝分析區塊
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            ["overview", "總覽"],
            ["traffic", "流量為什麼下降？"],
            ["priority", "今天優先做什麼？"],
            ["seo", "SEO 分數為什麼這樣？"],
            ["visibility", "AEO / GEO 能見度如何？"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setStageReady(false);
                setLens(key as Lens);
                setComposedBlocks(null);
                window.setTimeout(() => setStageReady(true), 160);
              }}
              className={[
                "rounded-full border px-4 py-2 text-sm font-bold transition",
                lens === key
                  ? "border-blue-200 bg-blue-50 text-blue-700"
                  : "border-slate-200 text-slate-600 hover:border-blue-200 hover:bg-blue-50",
              ].join(" ")}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <main className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
          <span className="h-2 w-2 rounded-full bg-blue-600" />
          {stageReady ? `已組裝 ${visibleBlocks.length} 個分析區塊` : "AI 正在組裝分析區塊..."}
        </div>

        <div className={stageReady ? "space-y-3" : "space-y-3 opacity-40"}>
          {visibleBlocks.map((block, index) => (
            <div
              key={`${block.type}-${index}`}
              className="animate-[blockin_0.28s_ease_both]"
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <BlockRenderer block={block} />
            </div>
          ))}
        </div>
      </main>

      <button
        type="button"
        onClick={() => setAskOpen(true)}
        className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-4 text-sm font-black text-white shadow-2xl shadow-slate-950/25 transition hover:bg-slate-800"
      >
        <Bot className="h-5 w-5" />
        詢問 AI
      </button>

      {askOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/30 p-4 backdrop-blur-sm">
          <div className="ml-auto flex h-full max-w-md flex-col rounded-lg bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-blue-600">
                  AI 助理
                </p>
                <h2 className="mt-1 text-xl font-black text-slate-950">
                  組裝一份分析答案
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setAskOpen(false)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="關閉詢問 AI"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 space-y-3 p-5">
              {presetPrompts.map((prompt) => (
                <button
                  key={prompt.id}
                  type="button"
                  onClick={() => askAi(prompt.question, prompt.id)}
                  className="flex w-full items-center gap-3 rounded-lg border border-slate-200 p-4 text-left text-sm font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50"
                >
                  <MessageSquareText className="h-4 w-4 text-blue-600" />
                  {prompt.question}
                </button>
              ))}
            </div>

            <form onSubmit={handleAskSubmit} className="border-t border-slate-100 p-5">
              <div className="flex gap-2">
                <input
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder="問 AI 要組裝哪種分析..."
                  className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-3 text-sm font-semibold outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                />
                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 text-white hover:bg-blue-700"
                  aria-label="送出問題"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes blockin {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

function BlockRenderer({ block }: { block: AIBlock }) {
  if (block.type === "narrative") {
    return (
      <section className="flex gap-3 rounded-lg border border-blue-100 bg-blue-50 p-4">
        <Sparkles className="mt-1 h-5 w-5 shrink-0 text-blue-700" />
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-blue-700">
            {block.eyebrow}
          </p>
          <p className="mt-2 text-sm leading-7 text-slate-800">{block.text}</p>
        </div>
      </section>
    );
  }

  if (block.type === "metricHero") {
    return (
      <section className="flex flex-col gap-5 rounded-lg border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-center">
        <div className="flex-1">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            {block.label}
          </p>
          <p className="mt-2 text-5xl font-black tracking-tight text-slate-950">
            {block.value}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-500">{block.sub}</p>
        </div>
        <div className="text-left md:text-right">
          <p className="text-2xl font-black text-slate-950">{block.asideValue}</p>
          <p className="mt-1 text-xs font-semibold text-slate-400">{block.asideLabel}</p>
          <span className={`mt-3 inline-flex rounded-md px-3 py-1 text-xs font-bold ${toneClass(block.badgeTone)}`}>
            {block.badge}
          </span>
        </div>
      </section>
    );
  }

  if (block.type === "metrics") {
    const items = Array.isArray(block.items) ? block.items : [];

    if (items.length === 0) return null;

    return (
      <section
        className="grid gap-3"
        style={{ gridTemplateColumns: `repeat(${block.columns}, minmax(0, 1fr))` }}
      >
        {items.map((item) => (
          <div key={item.label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              {item.label}
            </p>
            <p className="mt-2 text-2xl font-black text-slate-950">{item.value}</p>
            <p className={`mt-1 text-xs font-bold ${item.tone ? toneClass(item.tone) : "text-slate-500 bg-transparent"} inline-flex rounded px-2 py-0.5`}>
              {item.sub}
            </p>
          </div>
        ))}
      </section>
    );
  }

  if (block.type === "chart") {
    const bars = Array.isArray(block.bars) ? block.bars : [];

    if (bars.length === 0) return null;

    const maxValue = Math.max(...bars.map((bar) => Math.max(0, bar.value)), 1);

    if (bars.length <= 3) {
      return (
        <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-black text-slate-950">{block.title}</h2>
              <p className="mt-1 text-sm text-slate-500">
                {block.sub || "AI 將這組資料整理成指標比較。"}
              </p>
            </div>
            <LineChart className="h-6 w-6 text-blue-600" />
          </div>
          <div className="mt-6 space-y-4">
            {bars.map((bar, index) => {
              const width = clamp(
                Math.round((Math.max(0, bar.value) / maxValue) * 100),
                8,
                100
              );

              return (
                <div key={`${bar.label}-${index}`}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-bold text-slate-700">{bar.label}</span>
                    <span className="text-sm font-black text-slate-950">
                      {formatNumber(Math.round(bar.value))}
                    </span>
                  </div>
                  <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={[
                        "h-full rounded-full transition-all duration-500",
                        block.highlightIndex === index ? "bg-blue-700" : "bg-blue-500",
                      ].join(" ")}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      );
    }

    return (
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-950">{block.title}</h2>
            <p className="mt-1 text-sm text-slate-500">{block.sub}</p>
          </div>
          <LineChart className="h-6 w-6 text-blue-600" />
        </div>
        <div className="mt-8 flex h-56 items-end gap-3">
          {bars.map((bar, index) => (
            <div key={`${bar.label}-${index}`} className="flex flex-1 flex-col items-center gap-3">
              <div className="relative w-full">
                {block.highlightIndex === index && (
                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 rounded bg-slate-950 px-2 py-1 text-[10px] font-bold text-white">
                    AI 標記
                  </div>
                )}
                <div
                  className={[
                    "w-full rounded-t-lg transition-all duration-500",
                    block.highlightIndex === index ? "bg-blue-700" : "bg-blue-200",
                  ].join(" ")}
                  style={{
                    height: `${clamp(
                      Math.round((Math.max(0, bar.value) / maxValue) * 190),
                      18,
                      190
                    )}px`,
                  }}
                />
              </div>
              <span className="text-xs font-bold text-slate-400">{bar.label}</span>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (block.type === "trendChart") {
    const series = Array.isArray(block.series) ? block.series : [];
    const labels = Array.from(
      new Set(series.flatMap((serie) => serie.data.map((point) => point.label)))
    );
    const maxValue = Math.max(
      ...series.flatMap((serie) => serie.data.map((point) => Math.max(0, point.value))),
      1
    );

    if (labels.length === 0 || series.length === 0) return null;

    return (
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-950">{block.title}</h2>
            <p className="mt-1 text-sm text-slate-500">{block.sub}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {series.map((serie, index) => (
              <span key={`${serie.label}-${index}`} className="inline-flex items-center gap-2 text-xs font-bold text-slate-500">
                <span className={`h-2.5 w-2.5 rounded-full ${barColor(serie.tone)}`} />
                {serie.label}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-8 flex h-64 items-end gap-2 overflow-x-auto pb-2">
          {labels.map((label, index) => (
            <div key={`${label}-${index}`} className="flex min-w-10 flex-1 flex-col items-center gap-2">
              <div className="flex h-52 w-full items-end justify-center gap-1">
                {series.map((serie, serieIndex) => {
                  const point = serie.data.find((item) => item.label === label);
                  const value = point?.value || 0;
                  const height = clamp(Math.round((value / maxValue) * 190), 8, 190);

                  return (
                    <div
                      key={`${serie.label}-${serieIndex}`}
                      title={`${serie.label}: ${formatNumber(Math.round(value))}`}
                      className={`w-3 rounded-t transition-all duration-500 ${softBarColor(serie.tone)}`}
                      style={{ height: `${height}px` }}
                    />
                  );
                })}
              </div>
              <span className="text-[11px] font-bold text-slate-400">{label}</span>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (block.type === "action") {
    const tags = Array.isArray(block.tags) ? block.tags : [];

    return (
      <Link
        href={block.href}
        className={[
          "flex gap-4 rounded-lg border bg-white p-5 shadow-sm transition hover:bg-blue-50",
          block.urgent ? "border-rose-200" : "border-blue-100",
        ].join(" ")}
      >
        <div
          className={[
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black",
            block.urgent ? "bg-rose-100 text-rose-700" : "bg-blue-100 text-blue-700",
          ].join(" ")}
        >
          {block.num}
        </div>
        <div className="flex-1">
          <h3 className="font-black text-slate-950">{block.title}</h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">{block.desc}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {tags.map((tag, index) => (
              <span
                key={`${tag.text}-${index}`}
                className={[
                  "rounded px-2 py-1 text-xs font-bold",
                  tag.tone === "impact"
                    ? "bg-emerald-50 text-emerald-700"
                    : tag.tone === "warn"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-slate-100 text-slate-600",
                ].join(" ")}
              >
                {tag.text}
              </span>
            ))}
          </div>
        </div>
        <ArrowRight className="mt-1 h-4 w-4 text-slate-400" />
      </Link>
    );
  }

  if (block.type === "issues") {
    const items = Array.isArray(block.items) ? block.items : [];

    if (items.length === 0) return null;

    return (
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-5 py-3">
          <ListChecks className="h-4 w-4 text-slate-500" />
          <h2 className="font-black text-slate-800">{block.title}</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {items.map((item, index) => (
            <Link
              key={`${item.name}-${index}`}
              href={item.href}
              className="grid gap-3 px-5 py-4 transition hover:bg-blue-50 md:grid-cols-[1fr_140px_90px]"
            >
              <div className="flex items-center gap-3">
                <span
                  className={[
                    "h-2.5 w-2.5 rounded-full",
                    item.severity === "high"
                      ? "bg-rose-500"
                      : item.severity === "mid"
                        ? "bg-amber-500"
                        : "bg-emerald-500",
                  ].join(" ")}
                />
                <span className="font-bold text-slate-950">{item.name}</span>
              </div>
              <span className="text-sm font-bold text-slate-500">{item.status}</span>
              <span className="text-sm font-black text-rose-600">{item.impact}</span>
            </Link>
          ))}
        </div>
      </section>
    );
  }

  const items = Array.isArray(block.items) ? block.items : [];

  if (items.length === 0) return null;

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <HeartPulse className="h-5 w-5 text-blue-600" />
        <h2 className="font-black text-slate-950">{block.title}</h2>
      </div>
      <div className="mt-5 grid gap-3">
        {items.map((item, index) => (
          <div key={`${item.label}-${index}`} className="grid grid-cols-[150px_1fr_42px] items-center gap-3">
            <p className="text-sm font-bold text-slate-600">{item.label}</p>
            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full rounded-full ${barColor(item.tone)}`}
                style={{ width: `${item.value}%` }}
              />
            </div>
            <p className="text-right text-sm font-black text-slate-800">{item.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
