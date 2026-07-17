type FullPageLoadingProps = {
  title?: string;
  description?: string;
};

export default function FullPageLoading({
  title = "正在準備 Dashboard",
  description = "正在整理工作區與最新資料，馬上就好。",
}: FullPageLoadingProps) {
  return (
    <main
      className="fixed inset-0 z-[100] flex min-h-screen items-center justify-center bg-slate-950/20 px-6 backdrop-blur-sm"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="w-full max-w-sm rounded-3xl border border-white/70 bg-white/95 p-8 text-center shadow-2xl shadow-slate-900/15">
        <div className="relative mx-auto mb-6 h-16 w-16">
          <span className="absolute inset-0 rounded-full border-4 border-blue-100" />
          <span className="absolute inset-0 animate-spin rounded-full border-4 border-transparent border-t-blue-600 border-r-blue-400" />
          <span className="absolute inset-[18px] rounded-full bg-blue-600 shadow-lg shadow-blue-500/30" />
        </div>

        <h1 className="text-xl font-black tracking-tight text-slate-950">
          {title}
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>

        <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full w-2/3 animate-pulse rounded-full bg-gradient-to-r from-blue-600 to-cyan-400" />
        </div>
      </div>
    </main>
  );
}
