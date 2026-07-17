import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="text-center">
        <p className="text-sm font-bold text-blue-600">404</p>
        <h1 className="mt-2 text-3xl font-black text-slate-900">找不到這個頁面</h1>
        <p className="mt-3 text-slate-600">網址可能已變更，或您沒有可用的入口。</p>
        <Link href="/dashboard" className="mt-6 inline-flex rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-700">回到 Dashboard</Link>
      </div>
    </main>
  );
}
