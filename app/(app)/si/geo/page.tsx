import { Bot, CheckCircle2, Globe2, Radar } from "lucide-react";

const geoTabs: Record<
  string,
  {
    title: string;
    desc: string;
    metrics: { label: string; value: string; note: string }[];
    panelTitle: string;
    items: { title: string; source: string; tags: string[] }[];
    sideTitle: string;
    sideItems: { name: string; score: number }[];
    recommendation: string;
  }
> = {
  overview: {
    title: "GEO 總覽",
    desc: "整理品牌在生成式搜尋與 AI 回答中的曝光狀態。",
    metrics: [
      { label: "AI 曝光率", value: "38%", note: "+6%" },
      { label: "品牌提及", value: "24", note: "7 days" },
      { label: "引用頁面", value: "11", note: "indexed" },
    ],
    panelTitle: "AI 回答監測",
    items: [
      {
        title: "推薦適合中小企業的行銷數據工具",
        source: "AI Overview",
        tags: ["正向", "曝光高"],
      },
      {
        title: "如何整合 GA 與廣告成效？",
        source: "ChatGPT",
        tags: ["中性", "曝光中"],
      },
      {
        title: "SEO 和 AEO 可以一起做嗎？",
        source: "Perplexity",
        tags: ["正向", "曝光中"],
      },
    ],
    sideTitle: "競品曝光比較",
    sideItems: [
      { name: "Competitor A", score: 74 },
      { name: "Highlight Signal", score: 68 },
      { name: "Competitor B", score: 52 },
    ],
    recommendation: "增加「整合 GA 與廣告成效」相關內容，提高 AI 引用機率。",
  },
  citations: {
    title: "AI 引用監測",
    desc: "追蹤 AI 回答引用哪些頁面、品牌是否被正確提及。",
    metrics: [
      { label: "有效引用", value: "11", note: "+3" },
      { label: "錯誤描述", value: "4", note: "needs fix" },
      { label: "未引用頁", value: "7", note: "candidate" },
    ],
    panelTitle: "引用來源",
    items: [
      {
        title: "/ga - GA 數據分析首頁",
        source: "被 5 個回答引用",
        tags: ["正確", "高權重"],
      },
      {
        title: "/si/seo - SEO 管理中心",
        source: "被 3 個回答引用",
        tags: ["需補描述", "中權重"],
      },
      {
        title: "/ads - ADS 廣告成效",
        source: "被 2 個回答引用",
        tags: ["正確", "低頻"],
      },
    ],
    sideTitle: "引用品質",
    sideItems: [
      { name: "正確描述", score: 82 },
      { name: "品牌名稱一致", score: 76 },
      { name: "功能描述完整", score: 61 },
    ],
    recommendation: "補強 SI 頁面的產品定義，避免 AI 只把它描述成傳統 SEO 工具。",
  },
  visibility: {
    title: "品牌曝光",
    desc: "觀察品牌在不同問題情境下的出現頻率與描述方式。",
    metrics: [
      { label: "品牌提及", value: "24", note: "+5" },
      { label: "正向語境", value: "71%", note: "stable" },
      { label: "未命中主題", value: "9", note: "opportunity" },
    ],
    panelTitle: "曝光情境",
    items: [
      {
        title: "中小企業行銷數據工具推薦",
        source: "商業評估",
        tags: ["高曝光", "正向"],
      },
      {
        title: "GA4 報表自動化工具",
        source: "功能比較",
        tags: ["中曝光", "中性"],
      },
      {
        title: "AI 搜尋優化平台",
        source: "新興需求",
        tags: ["低曝光", "可補強"],
      },
    ],
    sideTitle: "曝光分布",
    sideItems: [
      { name: "行銷數據", score: 86 },
      { name: "搜尋優化", score: 64 },
      { name: "廣告成效", score: 58 },
    ],
    recommendation: "把 Search Intelligence 的 SEO/AEO/GEO 架構寫進首頁與產品頁。",
  },
  competitors: {
    title: "競品比較",
    desc: "比較品牌與競品在 AI 回答中的定位、優勢與缺口。",
    metrics: [
      { label: "領先主題", value: "5", note: "strong" },
      { label: "落後主題", value: "8", note: "watch" },
      { label: "差異機會", value: "13", note: "content gap" },
    ],
    panelTitle: "競品差異",
    items: [
      {
        title: "Competitor A 在「自動報表」被更多提及",
        source: "功能定位",
        tags: ["落後", "需補案例"],
      },
      {
        title: "Highlight Signal 在「GA + ADS 整合」描述更清楚",
        source: "品牌優勢",
        tags: ["領先", "可放大"],
      },
      {
        title: "Competitor B 在「SEO 教學」內容覆蓋較多",
        source: "內容覆蓋",
        tags: ["落後", "補文章"],
      },
    ],
    sideTitle: "競品分數",
    sideItems: [
      { name: "Competitor A", score: 74 },
      { name: "Highlight Signal", score: 68 },
      { name: "Competitor B", score: 52 },
    ],
    recommendation: "優先補「自動報表」與「SEO 教學」內容，縮小競品差距。",
  },
};

export default async function GeoPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const current = geoTabs[tab || "overview"] || geoTabs.overview;

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wider text-blue-600">
          GEO
        </p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
          {current.title}
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
          {current.desc}
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {current.metrics.map((item) => (
          <div
            key={item.label}
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm font-semibold text-slate-500">{item.label}</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{item.value}</p>
            <p className="mt-2 text-xs font-semibold text-emerald-600">
              {item.note}
            </p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Bot className="h-5 w-5 text-slate-500" />
            <h3 className="font-bold text-slate-900">{current.panelTitle}</h3>
          </div>
          <div className="space-y-3">
            {current.items.map((item) => (
              <div
                key={item.title}
                className="rounded-lg border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <p className="font-semibold text-slate-900">{item.title}</p>
                  <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500 ring-1 ring-slate-200">
                    {item.source}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-blue-50 px-3 py-1 text-blue-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Radar className="h-5 w-5 text-blue-500" />
            <h3 className="font-bold text-slate-900">{current.sideTitle}</h3>
          </div>
          <div className="space-y-4">
            {current.sideItems.map((item) => (
              <div key={item.name}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-semibold text-slate-700">{item.name}</span>
                  <span className="font-bold text-slate-900">{item.score}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-slate-900"
                    style={{ width: `${item.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
            <div className="mb-2 flex items-center gap-2 font-bold text-slate-900">
              <Globe2 className="h-4 w-4" />
              優先補強
            </div>
            <div className="flex gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <span>{current.recommendation}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
