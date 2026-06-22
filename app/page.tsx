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
      "分析網站在 Google 與 AI 搜尋中的可見度，找出 SEO、AEO 與 GEO 優化機會。",
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
              Highlight Signal 幫品牌分析 SEO、AI 搜尋與流量成長機會
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-700 sm:text-lg md:mt-6 md:leading-8">
              整合 GA4、SEO、AEO 與 GEO 訊號，協助品牌找出搜尋問題、內容缺口與 AI 引用機會。
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:mt-9 sm:flex-row">
              <Link
                href="/enter"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-950 px-5 py-3.5 text-base font-bold text-white shadow-lg shadow-zinc-950/15 transition hover:bg-zinc-800 sm:w-auto sm:px-6 sm:py-4"
              >
                開始 AI 搜尋分析
                <ArrowRight size={18} />
              </Link>

              <Link
                href="#products"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-5 py-3.5 text-base font-bold text-zinc-900 transition hover:border-zinc-950 sm:w-auto sm:px-6 sm:py-4"
              >
                查看分析能力
                <FileSearch size={18} />
              </Link>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-2xl shadow-zinc-900/10">
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-zinc-100 pb-4">
              <div>
                <p className="text-sm font-semibold text-zinc-500">Today overview</p>
                <p className="text-2xl font-black text-zinc-950">Growth Signal</p>
                <p className="mt-1 text-sm font-medium text-zinc-500">
                  Monitor how AI search engines understand your website.
                </p>
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
            Highlight Signal 協助品牌分析 SEO、搜尋流量與 AI 可見度，建立可持續優化的搜尋成長流程。
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

                  {/* ADS（/ads）是獨立 worker，用 <a> 硬導航直接到 /ads/；其餘走 SPA Link */}
                  {product.href === "/ads" ? (
                    <a
                      href="/ads/"
                      className="mt-auto inline-flex items-center gap-2 pt-8 text-sm font-black text-zinc-950 transition group-hover:gap-3"
                    >
                      前往功能
                      <ArrowRight size={17} />
                    </a>
                  ) : (
                    <Link
                      href={product.href}
                      className="mt-auto inline-flex items-center gap-2 pt-8 text-sm font-black text-zinc-950 transition group-hover:gap-3"
                    >
                      前往功能
                      <ArrowRight size={17} />
                    </Link>
                  )}
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

      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl rounded-lg border border-zinc-200 bg-white p-8">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">
            Contact
          </p>
          <h2 className="mt-3 text-3xl font-black text-zinc-950">
            想了解產品、合作或網站分析？
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-zinc-600">
            歡迎直接聯絡 Hank，討論產品 Demo、網站 AI 可見度分析、SEO 顧問合作、系統整合或品牌搜尋成長規劃。
          </p>
          <div className="mt-8 flex flex-col gap-3">
            <a
              href="mailto:hank.highlight@gmail.com"
              className="text-lg font-bold text-zinc-950 hover:text-emerald-700"
            >
              hank.highlight@gmail.com
            </a>
            <a
              href="https://line.me/R/ti/p/@306rtpqm"
              target="_blank"
              rel="noreferrer"
              className="text-sm font-semibold text-zinc-600 hover:text-zinc-950"
            >
              LINE ID @306rtpqm
            </a>
            <a
              href="https://www.highlight.url.tw/"
              target="_blank"
              rel="noreferrer"
              className="text-sm font-semibold text-zinc-600 hover:text-zinc-950"
            >
              公司官網：亮點數位 Highlight Digital
            </a>
          </div>
        </div>
      </section>

      <section className="px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl rounded-lg bg-[#f6f8f5] p-8">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">
            About
          </p>
          <h2 className="mt-3 text-2xl font-black text-zinc-950">
            由亮點數位團隊打造
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-zinc-600">
            Highlight Signal 延伸亮點數位在 AI、Web、資料平台與數位產品開發的經驗，專注在 AI 可見度、SEO intelligence 與搜尋流量分析，協助台灣品牌面對 Google、AI 搜尋與答案型平台帶來的新搜尋環境。
          </p>
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
              開始檢查網站 AI 可見度，找出下一個搜尋成長機會。
            </h2>
          </div>
          <Link
            href="/enter"
            className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-white px-5 py-3.5 font-black text-zinc-950 transition hover:bg-emerald-100 sm:w-auto sm:px-6 sm:py-4"
          >
            開始 AI 搜尋分析
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <footer className="border-t border-zinc-200 px-4 py-8 text-sm text-zinc-500">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Highlight Signal</p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-zinc-950">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-zinc-950">
              Terms
            </Link>
            <a href="mailto:hank.highlight@gmail.com" className="hover:text-zinc-950">
              Contact
            </a>
            <a
              href="https://www.highlight.url.tw/"
              target="_blank"
              rel="noreferrer"
              className="hover:text-zinc-950"
            >
              Company
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
