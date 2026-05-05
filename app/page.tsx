import {
  ArrowRight,
  BarChart3,
  Bot,
  CheckCircle2,
  FileSearch,
  LineChart,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const products = [
  {
    title: "GA4 流量分析",
    href: "/ga",
    tag: "Analytics",
    description:
      "整合網站流量、來源、頁面與轉換事件，讓團隊快速看出哪些渠道帶來有效訪客，以及哪些頁面需要優化。",
    icon: BarChart3,
    color: "text-sky-700",
    bg: "bg-sky-50",
    points: ["流量來源與裝置分析", "頁面成效比較", "轉換與事件追蹤"],
  },
  {
    title: "Search Intelligence",
    href: "/si",
    tag: "SEO / AEO / GEO",
    description:
      "把 SEO 技術檢查、AEO 問題機會與 GEO AI 可見度放在同一個工作台，協助品牌規劃可被搜尋與 AI 引用的內容。",
    icon: Search,
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    points: ["SEO 技術問題檢查", "FAQ 與短答案建議", "AI 引用來源規劃"],
  },
  {
    title: "廣告成效判讀",
    href: "/ads",
    tag: "Performance",
    description:
      "彙整廣告投放與網站成效訊號，協助行銷團隊判斷預算、受眾、素材與轉換路徑的優先調整方向。",
    icon: Target,
    color: "text-rose-700",
    bg: "bg-rose-50",
    points: ["投放成效追蹤", "ROAS 與轉換觀察", "AI 優化建議"],
  },
];

const workflow = [
  {
    title: "連接資料",
    description: "串接 GA4、Search Console 與網站頁面，建立可信的分析來源。",
  },
  {
    title: "辨識問題",
    description: "找出缺少 metadata、canonical、H1、內容結構與搜尋意圖落差。",
  },
  {
    title: "產生建議",
    description: "輸出 SEO、AEO、GEO 優先順序，包含短答案、FAQ 與案例內容方向。",
  },
  {
    title: "追蹤改善",
    description: "用流量、曝光、點擊與 AI 引用測試回頭驗證內容是否有效。",
  },
];

const faqs = [
  {
    question: "Highlight Signal 適合哪些企業使用？",
    answer:
      "Highlight Signal 適合需要同時管理網站流量、SEO 成效、內容能見度與 AI 搜尋曝光的品牌、電商、B2B 服務與行銷團隊。",
  },
  {
    question: "AEO 和 GEO 分析能解決什麼問題？",
    answer:
      "AEO 協助整理使用者會問的問題與短答案，GEO 則協助補強服務定義、案例證據與引用來源，讓 AI 搜尋更容易理解品牌內容。",
  },
  {
    question: "導入前需要準備哪些資料？",
    answer:
      "建議先準備網站網址、GA4 資源、Search Console 權限與主要服務頁。資料越完整，關鍵字、FAQ 與內容建議會越接近真實需求。",
  },
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Highlight Signal",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  url: "https://highlightsignal.com/",
  description:
    "Highlight Signal 整合 GA4、SEO、AEO 與 GEO 分析，協助品牌看懂流量、搜尋關鍵字、AI 引用機會與內容優化優先順序。",
  offers: {
    "@type": "Offer",
    availability: "https://schema.org/InStock",
  },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
};

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#f6f8f5] text-zinc-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <section className="border-b border-zinc-200 bg-[linear-gradient(135deg,#f6f8f5_0%,#e8f4ee_48%,#fff6dc_100%)]">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-8 sm:px-6 sm:py-12 md:min-h-[84vh] md:grid-cols-[1.04fr_0.96fr] md:py-16 lg:px-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-3 rounded-full border border-zinc-200 bg-white/85 px-4 py-2 text-sm font-semibold text-zinc-700 shadow-sm">
              <Image
                src="/logo-hl.png"
                alt="Highlight Signal"
                width={28}
                height={28}
                className="h-7 w-7 object-contain"
                priority
              />
              AI traffic and search intelligence
            </div>

            <h1 className="mt-5 max-w-3xl text-3xl font-black leading-tight tracking-normal text-zinc-950 sm:text-4xl md:text-3xl">
              Highlight Signal 幫品牌看懂流量、搜尋與 AI 曝光機會
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-700 sm:text-lg md:mt-6 md:leading-8">
              Highlight Signal 是給行銷與成長團隊使用的分析平台，整合 GA4、SEO、AEO
              與 GEO 訊號，把網站流量、關鍵字、內容缺口與 AI 引用機會轉成清楚的優化待辦。
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:mt-9 sm:flex-row">
              <Link
                href="/enter"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-950 px-5 py-3.5 text-base font-bold text-white shadow-lg shadow-zinc-950/15 transition hover:bg-zinc-800 sm:w-auto sm:px-6 sm:py-4"
              >
                進入系統
                <ArrowRight size={18} />
              </Link>

              <Link
                href="#products"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-5 py-3.5 text-base font-bold text-zinc-900 transition hover:border-zinc-950 sm:w-auto sm:px-6 sm:py-4"
              >
                查看核心功能
                <FileSearch size={18} />
              </Link>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-2xl shadow-zinc-900/10">
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-zinc-100 pb-4">
              <div>
                <p className="text-sm font-semibold text-zinc-500">Today overview</p>
                <p className="text-2xl font-black text-zinc-950">Growth Signal</p>
              </div>
              <div className="shrink-0 rounded-lg bg-amber-100 p-3 text-amber-700">
                <Sparkles size={24} />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["SEO issues", "3"],
                ["AEO ready", "60%"],
                ["GEO visibility", "Low"],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-zinc-100 bg-zinc-50 p-4">
                  <p className="text-sm font-semibold text-zinc-500">{label}</p>
                  <p className="mt-2 break-words text-2xl font-black text-zinc-950">
                    {value}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-lg bg-zinc-950 p-5 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-zinc-300">Recommended action</p>
                  <p className="mt-1 text-xl font-black">補齊可被搜尋與 AI 引用的內容</p>
                </div>
                <LineChart className="text-emerald-300" size={34} />
              </div>

              <div className="mt-5 flex h-24 items-end gap-2">
                {[34, 55, 46, 72, 62, 86, 78].map((height) => (
                  <div
                    key={height}
                    className="flex-1 rounded-t bg-emerald-300"
                    style={{ height }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="max-w-3xl text-base leading-7 text-zinc-700">
            短答案：Highlight Signal
            協助品牌把流量分析、搜尋優化與 AI 可見度檢查整合成一套決策流程，適合想提升自然搜尋、內容品質、轉換效率與 AI 搜尋曝光的團隊。
          </p>
        </div>
      </section>

      <section id="products" className="px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 max-w-3xl sm:mb-10">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">
              Core Products
            </p>
            <h2 className="mt-3 text-2xl font-black leading-tight tracking-normal text-zinc-950 sm:text-3xl md:text-4xl">
              從流量診斷到搜尋內容規劃，建立可追蹤的成長工作台
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {products.map((product) => {
              const Icon = product.icon;

              return (
                <article
                  key={product.title}
                  className="group flex min-h-[380px] flex-col rounded-lg border border-zinc-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-zinc-300 hover:shadow-xl hover:shadow-zinc-900/10"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className={`rounded-lg ${product.bg} p-3 ${product.color}`}>
                      <Icon size={28} />
                    </div>
                    <span className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
                      {product.tag}
                    </span>
                  </div>

                  <h3 className="mt-6 text-2xl font-black text-zinc-950">
                    {product.title}
                  </h3>
                  <p className="mt-3 text-base leading-7 text-zinc-600">
                    {product.description}
                  </p>

                  <ul className="mt-6 space-y-3">
                    {product.points.map((point) => (
                      <li
                        key={point}
                        className="flex items-center gap-2 text-sm font-semibold text-zinc-700"
                      >
                        <CheckCircle2 size={17} className="shrink-0 text-emerald-600" />
                        {point}
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={product.href}
                    className="mt-auto inline-flex items-center gap-2 pt-8 text-sm font-black text-zinc-950 transition group-hover:gap-3"
                  >
                    前往功能
                    <ArrowRight size={17} />
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-y border-zinc-200 bg-white px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">
              Workflow
            </p>
            <h2 className="mt-3 text-2xl font-black leading-tight tracking-normal text-zinc-950 sm:text-3xl">
              讓 SEO、AEO、GEO 建議能落到實際執行
            </h2>
            <p className="mt-4 text-base leading-7 text-zinc-600">
              系統不只列出問題，也會把修復順序、內容位置、FAQ 題型與短答案草稿整理成可以交付給行銷、內容與工程團隊的下一步。
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {workflow.map((item, index) => (
              <div key={item.title} className="rounded-lg border border-zinc-200 bg-[#f6f8f5] p-5">
                <div className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-950 text-sm font-black text-white">
                  {index + 1}
                </div>
                <h3 className="text-lg font-black text-zinc-950">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex items-center gap-3">
            <Bot className="text-emerald-700" size={28} />
            <h2 className="text-2xl font-black tracking-normal text-zinc-950 sm:text-3xl">
              常見問題
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {faqs.map((item) => (
              <article key={item.question} className="rounded-lg border border-zinc-200 bg-white p-6">
                <h3 className="text-lg font-black leading-7 text-zinc-950">
                  {item.question}
                </h3>
                <p className="mt-3 text-sm leading-7 text-zinc-600">{item.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 pb-14 sm:px-6 sm:pb-20 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 rounded-lg bg-zinc-950 p-6 text-white sm:p-8 md:flex-row md:items-center md:p-10">
          <div>
            <p className="flex items-center gap-2 text-sm font-bold text-emerald-300">
              <ShieldCheck size={18} />
              Ready for better signals
            </p>
            <h2 className="mt-2 max-w-3xl text-2xl font-black leading-tight tracking-normal sm:text-3xl">
              先從首頁與核心服務頁補齊搜尋引擎和 AI 都看得懂的內容。
            </h2>
          </div>
          <Link
            href="/enter"
            className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-white px-5 py-3.5 font-black text-zinc-950 transition hover:bg-emerald-100 sm:w-auto sm:px-6 sm:py-4"
          >
            登入 / 註冊
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </main>
  );
}
