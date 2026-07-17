export default function Loading() {
  return (
    <main className="flex min-h-[50vh] items-center justify-center bg-slate-50" aria-live="polite">
      <div className="flex items-center gap-3 text-sm font-semibold text-slate-600">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
        載入中…
      </div>
    </main>
  );
}
