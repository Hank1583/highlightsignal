"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  LineChart,
  Search,
  Sparkles,
  Target,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const MotionLink = motion(Link);

const coreProducts = [
  {
    title: "GA 數據分析",
    href: "/ga",
    tag: "Analytics",
    desc: "集中查看流量、來源、頁面表現與轉換事件，讓 GA4 數據變成每天看得懂的營運指標。",
    icon: BarChart3,
    color: "text-sky-600",
    bg: "bg-sky-50",
    points: ["即時流量與趨勢", "轉換事件追蹤", "頁面成效排行"],
  },
  {
    title: "SEO AI 優化",
    href: "/seo",
    tag: "Search",
    desc: "整合網站健檢、關鍵字洞察與 AI 建議，快速掌握哪些內容該補強、哪些問題該優先處理。",
    icon: Search,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    points: ["網站 SEO 健檢", "AI 內容建議", "關鍵字機會整理"],
  },
  {
    title: "ADS 廣告成效",
    href: "/ads",
    tag: "Performance",
    desc: "彙整 Google、Meta、LINE 等廣告數據，追蹤花費、CTR、ROAS 與最佳素材表現。",
    icon: Target,
    color: "text-rose-600",
    bg: "bg-rose-50",
    points: ["跨平台成效總覽", "ROAS 與花費比較", "AI 投放建議"],
  },
];

const stats = [
  { label: "核心模組", value: "3" },
  { label: "資料入口", value: "GA4 / SEO / Ads" },
  { label: "決策節奏", value: "Daily" },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f7faf8] text-zinc-950">
      <section className="relative overflow-hidden border-b border-zinc-200 bg-[linear-gradient(135deg,#f7faf8_0%,#eaf7f0_45%,#fff7df_100%)]">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-8 sm:px-6 sm:py-10 md:min-h-[82vh] md:grid-cols-[1.04fr_0.96fr] md:gap-12 md:py-16 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="max-w-3xl"
          >
            <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-zinc-200 bg-white/80 px-4 py-2 text-sm font-semibold text-zinc-700 shadow-sm md:mb-8">
              <Image
                src="/logo-hl.png"
                alt="Highlight Signal"
                width={28}
                height={28}
                className="h-7 w-7 object-contain"
                priority
              />
              Highlight Signal
            </div>

            <p className="mb-4 inline-flex rounded-full bg-zinc-950 px-4 py-2 text-sm font-semibold text-white">
              GA + SEO + ADS
            </p>

            <h1 className="max-w-3xl text-3xl font-black leading-[1.14] tracking-tight text-zinc-950 sm:text-4xl md:text-5xl lg:text-6xl">
              把數據、搜尋與廣告成效整理成清楚的下一步。
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-700 sm:text-lg md:mt-6 md:leading-8 lg:text-xl">
              目前保留三個核心模組：GA 數據分析、SEO AI 優化、ADS
              廣告成效。少一點分散，多一點可執行的判斷。
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:mt-9 sm:flex-row">
              <MotionLink
                href="/enter"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-950 px-5 py-3.5 text-base font-bold text-white shadow-lg shadow-zinc-950/15 transition hover:bg-zinc-800 sm:w-auto sm:px-6 sm:py-4"
              >
                進入系統
                <ArrowRight size={18} />
              </MotionLink>

              <MotionLink
                href="#core-products"
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="inline-flex w-full items-center justify-center rounded-lg border border-zinc-300 bg-white px-5 py-3.5 text-base font-bold text-zinc-900 transition hover:border-zinc-950 sm:w-auto sm:px-6 sm:py-4"
              >
                查看核心功能
              </MotionLink>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.7 }}
            className="relative"
          >
            <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-2xl shadow-zinc-900/10 sm:p-4">
              <div className="mb-4 flex items-center justify-between gap-3 border-b border-zinc-100 pb-4">
                <div>
                  <p className="text-sm font-semibold text-zinc-500">
                    Today overview
                  </p>
                  <p className="text-xl font-black text-zinc-950 sm:text-2xl">
                    Growth Signal
                  </p>
                </div>
                <div className="shrink-0 rounded-lg bg-amber-100 p-3 text-amber-700">
                  <Sparkles size={24} />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {stats.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-lg border border-zinc-100 bg-zinc-50 p-3 sm:p-4"
                  >
                    <p className="text-sm font-semibold text-zinc-500">
                      {item.label}
                    </p>
                    <p className="mt-2 break-words text-xl font-black text-zinc-950 sm:text-2xl">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-lg bg-zinc-950 p-4 text-white sm:p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-zinc-300">
                      本週優先處理
                    </p>
                    <p className="mt-1 text-xl font-black">提高有效轉換</p>
                  </div>
                  <LineChart className="text-emerald-300" size={34} />
                </div>

                <div className="mt-5 flex h-20 items-end gap-1.5 sm:h-28 sm:gap-2">
                  {[36, 58, 46, 72, 64, 86, 78].map((height, index) => (
                    <motion.div
                      key={height}
                      initial={{ height: 12 }}
                      animate={{ height }}
                      transition={{ delay: 0.35 + index * 0.08, duration: 0.5 }}
                      className="flex-1 rounded-t bg-emerald-300"
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section id="core-products" className="px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 max-w-2xl sm:mb-10">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">
              Core Products
            </p>
            <h2 className="mt-3 text-3xl font-black leading-tight tracking-tight text-zinc-950 sm:text-4xl md:text-5xl">
              三個模組，對準同一件事：讓成效更清楚。
            </h2>
          </div>

          <div className="grid gap-4 sm:gap-5 md:grid-cols-3">
            {coreProducts.map((product, index) => {
              const Icon = product.icon;

              return (
                <motion.article
                  key={product.title}
                  initial={{ opacity: 0, y: 22 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ delay: index * 0.08, duration: 0.55 }}
                  className="group flex min-h-0 flex-col rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-zinc-300 hover:shadow-xl hover:shadow-zinc-900/10 sm:p-6 md:min-h-[360px]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className={`rounded-lg ${product.bg} p-3 ${product.color}`}>
                      <Icon size={28} />
                    </div>
                    <span className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-bold uppercase tracking-wide text-zinc-500">
                      {product.tag}
                    </span>
                  </div>

                  <h3 className="mt-5 text-xl font-black text-zinc-950 sm:mt-6 sm:text-2xl">
                    {product.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-zinc-600 sm:text-base">{product.desc}</p>

                  <ul className="mt-6 space-y-3">
                    {product.points.map((point) => (
                      <li
                        key={point}
                        className="flex items-center gap-2 text-sm font-semibold text-zinc-700"
                      >
                        <CheckCircle2 size={17} className="text-emerald-600" />
                        {point}
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={product.href}
                    className="mt-auto inline-flex items-center gap-2 pt-8 text-sm font-black text-zinc-950 transition group-hover:gap-3"
                  >
                    開啟模組
                    <ArrowRight size={17} />
                  </Link>
                </motion.article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-4 pb-14 sm:px-6 sm:pb-20 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 rounded-lg bg-zinc-950 p-6 text-white sm:p-8 md:flex-row md:items-center md:p-10">
          <div>
            <p className="text-sm font-bold text-emerald-300">
              Ready for signal
            </p>
            <h2 className="mt-2 text-2xl font-black leading-tight tracking-tight sm:text-3xl">
              從今天開始，把每天的行銷判斷收斂到三個核心面板。
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
