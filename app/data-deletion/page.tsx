import Link from "next/link";

export default function DataDeletionPage() {
  return (
    <main className="min-h-screen bg-[#f6f8f5] px-4 py-16 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm font-bold text-emerald-700 hover:text-zinc-950">
          Highlight Signal
        </Link>
        <h1 className="mt-6 text-3xl font-black tracking-normal sm:text-4xl">
          用戶資料刪除指示
        </h1>
        <p className="mt-4 text-sm font-semibold text-zinc-500">
          最後更新日期：2026 年 6 月 8 日
        </p>

        <div className="mt-10 space-y-8 text-base leading-7 text-zinc-700">
          <section>
            <h2 className="text-xl font-black text-zinc-950">如何申請刪除資料</h2>
            <p className="mt-3">
              若您曾透過 Facebook、Meta 或其他方式使用 Highlight Signal 關鍵訊號，並希望刪除我們保存的帳號、
              聯絡或服務相關資料，請依照以下方式提出申請。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-zinc-950">申請步驟</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5">
              <li>
                寄送電子郵件至{" "}
                <a href="mailto:hank.highlight@gmail.com" className="font-bold text-zinc-950">
                  hank.highlight@gmail.com
                </a>
                。
              </li>
              <li>郵件主旨請填寫「資料刪除申請」。</li>
              <li>請在信中提供您的姓名、聯絡電子郵件，以及可協助我們辨識帳號或服務紀錄的資訊。</li>
              <li>我們收到申請後，會在合理期間內確認身分並處理刪除請求。</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-black text-zinc-950">刪除範圍</h2>
            <p className="mt-3">
              我們會刪除或匿名化可合理識別您的帳號、聯絡與服務相關資料。但基於法律、會計、安全、
              爭議處理或平台政策要求，部分資料可能需在必要期間內保留。
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-zinc-950">聯絡方式</h2>
            <p className="mt-3">
              若您對資料刪除流程有任何問題，請聯絡{" "}
              <a href="mailto:hank.highlight@gmail.com" className="font-bold text-zinc-950">
                hank.highlight@gmail.com
              </a>
              。
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
