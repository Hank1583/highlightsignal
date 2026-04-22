import { ArrowUpRight, CheckCircle2, FileQuestion, Lightbulb } from "lucide-react";

const aeoTabs: Record<
  string,
  {
    title: string;
    desc: string;
    metrics: { label: string; value: string; note: string }[];
    panelTitle: string;
    items: { title: string; meta: string; status: string }[];
    actions: string[];
  }
> = {
  overview: {
    title: "問答總覽",
    desc: "整理答案引擎優化狀態，找出最值得補強的問答內容。",
    metrics: [
      { label: "可回答主題", value: "42", note: "+8 this week" },
      { label: "缺口問題", value: "16", note: "high intent" },
      { label: "摘要機會", value: "9", note: "ready to draft" },
    ],
    panelTitle: "高意圖問題",
    items: [
      {
        title: "Search Intelligence 適合哪些產業使用？",
        meta: "商業評估",
        status: "需要補上案例",
      },
      {
        title: "GA、SEO、ADS 數據要怎麼一起判讀？",
        meta: "解決方案比較",
        status: "可做精選摘要",
      },
      {
        title: "AEO 和 SEO 的差異是什麼？",
        meta: "教育型內容",
        status: "需要短答案",
      },
    ],
    actions: [
      "補上 3 題高意圖 FAQ 的 80 字標準答案",
      "把產品頁新增「適用情境」段落",
      "整理 GA、SI、ADS 的差異比較表",
    ],
  },
  faq: {
    title: "常見問題",
    desc: "整理使用者常問、追問，以及需要補上標準答案的主題。",
    metrics: [
      { label: "待整理問題", value: "28", note: "12 high priority" },
      { label: "已覆蓋主題", value: "64%", note: "+11%" },
      { label: "追問題型", value: "7", note: "clustered" },
    ],
    panelTitle: "FAQ 任務",
    items: [
      {
        title: "使用者會問：這套工具需要工程師設定嗎？",
        meta: "購買阻力",
        status: "補上設定流程與限制",
      },
      {
        title: "使用者會問：資料多久更新一次？",
        meta: "信任問題",
        status: "補上更新頻率",
      },
      {
        title: "使用者會問：GA 和 ADS 可以一起看嗎？",
        meta: "功能確認",
        status: "可放在產品 FAQ",
      },
    ],
    actions: [
      "先完成購買前最常問的 5 題",
      "每題控制在 60 到 100 字",
      "把答案連回對應功能頁",
    ],
  },
  snippet: {
    title: "精選摘要",
    desc: "規劃能被搜尋結果、AI 回答或摘要區直接引用的短答案。",
    metrics: [
      { label: "摘要候選", value: "12", note: "ready" },
      { label: "結構完整度", value: "71%", note: "+9%" },
      { label: "可引用段落", value: "18", note: "detected" },
    ],
    panelTitle: "摘要候選內容",
    items: [
      {
        title: "什麼是 Search Intelligence？",
        meta: "定義型摘要",
        status: "缺少 50 字短定義",
      },
      {
        title: "AEO 是什麼？",
        meta: "解釋型摘要",
        status: "可加入條列差異",
      },
      {
        title: "GEO 怎麼提升 AI 曝光？",
        meta: "方法型摘要",
        status: "需要步驟化",
      },
    ],
    actions: [
      "每個主題補一段直接答案",
      "加入清楚的小標與條列",
      "避免只寫宣傳句，先回答問題",
    ],
  },
  gap: {
    title: "內容缺口",
    desc: "找出目前網站尚未回答，但使用者搜尋意圖明確的問題。",
    metrics: [
      { label: "高價值缺口", value: "14", note: "urgent" },
      { label: "未覆蓋意圖", value: "31%", note: "search demand" },
      { label: "建議文章", value: "6", note: "brief ready" },
    ],
    panelTitle: "缺口清單",
    items: [
      {
        title: "GA 數據異常時該怎麼判斷？",
        meta: "操作型",
        status: "缺少教學內容",
      },
      {
        title: "廣告 ROAS 下降要先看哪些指標？",
        meta: "決策型",
        status: "可連到 ADS 模組",
      },
      {
        title: "AI 搜尋會引用哪些頁面？",
        meta: "新興需求",
        status: "適合做 GEO 內容",
      },
    ],
    actions: [
      "先補高轉換意圖的缺口內容",
      "每篇文章加入 FAQ 區塊",
      "把缺口內容串到 GA 或 ADS 報表",
    ],
  },
};

export default async function AeoPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const current = aeoTabs[tab || "overview"] || aeoTabs.overview;

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-bold uppercase tracking-wider text-blue-600">
          AEO
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
            <FileQuestion className="h-5 w-5 text-slate-500" />
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
                    {item.meta}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-500">{item.status}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            <h3 className="font-bold text-slate-900">下一步建議</h3>
          </div>
          <div className="space-y-3">
            {current.actions.map((item) => (
              <div key={item} className="flex gap-3 text-sm text-slate-600">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <span>{item}</span>
              </div>
            ))}
          </div>
          <button className="mt-5 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-bold text-white">
            產生內容任務
            <ArrowUpRight className="h-4 w-4" />
          </button>
        </div>
      </section>
    </div>
  );
}
