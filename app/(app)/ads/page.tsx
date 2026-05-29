"use client";

import Link from "next/link";
import { ArrowLeft, Mail, Megaphone } from "lucide-react";

export default function AdsPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-4xl items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <section className="w-full rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-950 text-white">
          <Megaphone className="h-8 w-8" />
        </div>

        <p className="mt-6 text-sm font-black uppercase tracking-wider text-amber-600">
          Coming Soon / Beta
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
          ADS Intelligence 即將推出
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-600">
          廣告資料整合正在準備中。V1 會先專注在 GA Analytics、Search
          Intelligence、AEO / GEO 與 Dashboard AI，ADS 會在授權與 API
          串接完成後開放。
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            回到 Dashboard
          </Link>
          <Link
            href="/support"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            <Mail className="h-4 w-4" />
            聯絡我們
          </Link>
        </div>
      </section>
    </div>
  );
}
