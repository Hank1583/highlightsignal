"use client";

import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-[60vh] items-center justify-center bg-slate-50 px-6">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold text-slate-900">頁面暫時無法顯示</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">資料載入時發生錯誤，請重試。若問題持續發生，請聯絡系統管理員。</p>
        <button type="button" onClick={reset} className="mt-5 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">重新載入</button>
      </div>
    </main>
  );
}
