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
    title: "Decision Center",
    href: "/enter",
    tag: "Workspace",
    description:
      "把每個 Workspace 的重要訊號整理成 AI Summary、Top Recommendation 與下一步，讓團隊先看決策，不先淹在報表裡。",
    icon: BarChart3,
    color: "text-sky-700",
    bg: "bg-sky-50",
    points: ["今日重要訊號", "優先建議排序", "Workspace 決策脈絡"],
  },
  {
    title: "Evidence Sources",
    href: "/si",
    tag: "GA / SEO / AEO / GEO",
    description:
      "GA4、SEO、AEO 與 GEO 不再只是分散工具，而是支撐 Recommendation 的證據來源，保留可追蹤的分析依據。",
    icon: Search,
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    points: ["流量與轉換證據", "搜尋健康檢查", "AI 可見度分析"],
  },
  {
    title: "Human Review",
    href: "/ga",
    tag: "Governance",
    description:
      "AI 提出解釋、商業影響與建議，但正式 Decision 由人完成審核，確保每個 Action 都有脈絡與責任歸屬。",
    icon: Target,
    color: "text-rose-700",
    bg: "bg-rose-50",
    points: ["建議審核", "商業影響判斷", "明確下一步"],
  },
];

const workflow = [
  {
    title: "Signal",
    description: "從網站流量、搜尋健康、AI 可見度與廣告成效中辨識需要注意的變化。",
  },
  {
    title: "Evidence",
    description: "保留 GA4、SEO、AEO、GEO 等來源資料，讓每個判斷都有可追蹤依據。",
  },
  {
    title: "Recommendation",
    description: "AI 說明發生什麼事、可能造成什麼商業影響，並提出優先處理建議。",
  },
  {
    title: "Human Review",
    description: "由人決定接受、修改、延後或拒絕建議，再把決策轉成任務或行動。",
  },
];

const faqs = [
  {
    question: "Highlight Signal 適合哪些企業使用？",
    answer:
      "Highlight Signal 適合需要把網站、搜尋、內容、廣告與 AI 可見度轉成可執行決策的品牌、電商、B2B 服務與行銷團隊。",
  },
  {
    question: "AI 會自動幫我做決策嗎？",
    answer:
      "不會。V1 採用 Human-in-the-loop，AI 負責偵測訊號、整理證據、提出解釋與建議；正式 Decision 與 Action 仍由人審核。",
  },
  {
    question: "導入前需要準備哪些資料？",
    answer:
      "建議先準備 Workspace 目標、網站網址、GA4 資源、Search Console 權限與主要服務頁。資料越完整，Recommendation 越接近真實商業情境。",
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
    "Highlight Signal 是 Workspace-centric、Human-in-the-loop 的 AI Decision Intelligence SaaS，協助團隊把 GA、SEO、AEO 與 GEO 訊號轉成可審核的商業建議。",
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
              AI Decision Intelligence
            </div>

            <h1 className="mt-5 max-w-3xl text-3xl font-black leading-tight tracking-normal text-zinc-950 sm:text-4xl md:text-3xl">
              Highlight Signal 把成長訊號轉成可審核的商業決策
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-700 sm:text-lg md:mt-6 md:leading-8">
              以 Workspace 為核心整合 GA4、SEO、AEO、GEO 與廣告訊號，讓 AI 先提出證據、影響與 Recommendation，再由人完成 Review 與 Decision。
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:mt-9 sm:flex-row">
              <Link
                href="/enter"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-950 px-5 py-3.5 text-base font-bold text-white shadow-lg shadow-zinc-950/15 transition hover:bg-zinc-800 sm:w-auto sm:px-6 sm:py-4"
              >
                進入 Decision Center
                <ArrowRight size={18} />
              </Link>

              <Link
                href="#products"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-300 bg-white px-5 py-3.5 text-base font-bold text-zinc-900 transition hover:border-zinc-950 sm:w-auto sm:px-6 sm:py-4"
              >
                查看決策流程
                <FileSearch size={18} />
              </Link>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-2xl shadow-zinc-900/10">
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-zinc-100 pb-4">
              <div>
                <p className="text-sm font-semibold text-zinc-500">Workspace overview</p>
                <p className="text-2xl font-black text-zinc-950">Decision Signal</p>
                <p className="mt-1 text-sm font-medium text-zinc-500">
                  AI suggests. Humans review. Actions stay traceable.
                </p>
              </div>
              <div className="shrink-0 rounded-lg bg-amber-100 p-3 text-amber-700">
                <Sparkles size={24} />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ["Signals", "7"],
                ["Evidence", "24"],
                ["Needs review", "3"],
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
                  <p className="text-sm font-semibold text-zinc-300">Top recommendation</p>
                  <p className="mt-1 text-xl font-black">先修正高意圖服務頁的搜尋證據缺口</p>
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
            Highlight Signal 不只是把報表集中在一起，而是把分散的成長資料轉成 Signal、Evidence、Business Impact 與 Recommendation，協助團隊用同一個 Workspace 完成審核、決策與後續行動。
          </p>
        </div>
      </section>

      <section id="products" className="px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 max-w-3xl sm:mb-10">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">
              Decision System
            </p>
            <h2 className="mt-3 text-2xl font-black leading-tight tracking-normal text-zinc-950 sm:text-3xl md:text-4xl">
              從資料來源到人工審核，建立可追蹤的決策工作台
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
              讓 AI 建議能被解釋、審核與執行
            </h2>
            <p className="mt-4 text-base leading-7 text-zinc-600">
              V1 不讓 AI 自動替人做正式決策。系統先整理證據、說明影響、提出建議，再讓團隊完成 Human Review，最後才進入任務、行動或追蹤。
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
            Highlight Signal 延伸亮點數位在 AI、Web、資料平台與數位產品開發的經驗，專注在 Decision Intelligence、AI 可見度、SEO intelligence 與搜尋流量分析，協助台灣品牌把分散訊號轉成更清楚、更可追蹤的商業決策。
          </p>
        </div>
      </section>

      <section className="px-4 pb-14 sm:px-6 sm:pb-20 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 rounded-lg bg-zinc-950 p-6 text-white sm:p-8 md:flex-row md:items-center md:p-10">
          <div>
            <p className="flex items-center gap-2 text-sm font-bold text-emerald-300">
              <ShieldCheck size={18} />
              Ready for better decisions
            </p>
            <h2 className="mt-2 max-w-3xl text-2xl font-black leading-tight tracking-normal sm:text-3xl">
              開始把網站、搜尋與廣告訊號整理成下一個可審核的決策。
            </h2>
          </div>
          <Link
            href="/enter"
            className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-white px-5 py-3.5 font-black text-zinc-950 transition hover:bg-emerald-100 sm:w-auto sm:px-6 sm:py-4"
          >
            進入 Decision Center
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
