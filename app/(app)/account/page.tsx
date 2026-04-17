import { ArrowUpRight, CalendarDays, CheckCircle2, Store } from "lucide-react";
import { redirect } from "next/navigation";
import { getServerSession, type ServerSession } from "@/lib/serverSession";

type SubscriptionRecord = {
  appId: string;
  appName: string;
  expireAt: string;
  status: "active" | "expired";
};

const SHOP_URL = "https://www.highlight.url.tw/shop/index.html";

const productNameMap: Record<string, string> = {
  "highlightsignal-ads": "ADS 廣告成效",
  "highlightsignal-ga": "GA 數據分析",
  "highlightsignal-seo": "SEO AI 優化",
  "highlightsignal-dashboard": "Dashboard",
};

const cardClass = "rounded-lg border border-slate-200 bg-white p-6 shadow-sm";

function isActiveByDate(expireAt?: string) {
  if (!expireAt) return false;
  return expireAt.slice(0, 10) >= new Date().toISOString().slice(0, 10);
}

function formatDate(value?: string) {
  if (!value) return "-";
  return value.slice(0, 10);
}

function formatUnixTime(value?: number) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("zh-TW", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Taipei",
  }).format(new Date(value * 1000));
}

function getSubscriptionRecords(session: ServerSession): SubscriptionRecord[] {
  return session.subscribedApps.map((item) => ({
    appId: item.app_id,
    appName: productNameMap[item.app_id] || item.app_id,
    expireAt: item.expire_at,
    status: isActiveByDate(item.expire_at) ? "active" : "expired",
  }));
}

export default async function AccountPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/auth/login");
  }

  const records = getSubscriptionRecords(session);
  const activeRecords = records.filter((item) => item.status === "active");
  const expiredRecords = records.filter((item) => item.status === "expired");
  const nearestExpireAt = activeRecords.map((item) => item.expireAt).sort()[0];
  const initials = (session.name || session.email || "U").slice(0, 1).toUpperCase();

  const profileItems = [
    { label: "會員編號", value: session.id || "-" },
    { label: "姓名", value: session.name || "-" },
    { label: "登入 App", value: session.appId || "-" },
    { label: "會員狀態", value: session.subscription || session.role || "member" },
    { label: "平台", value: session.platform || "-" },
    { label: "IP", value: session.ip || "-" },
    { label: "登入時間", value: session.loginAt || "-" },
  ];

  const wideProfileItems = [
    { label: "Email", value: session.email || "-" },
    { label: "登入有效至", value: formatUnixTime(session.tokenExpiresAt) },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6 lg:p-8">
      <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-blue-600">
            Account
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
            帳號與方案
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            這裡顯示登入回傳的會員資料與 subscribed_apps 訂閱資料。
          </p>
        </div>

        <a
          href={SHOP_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-700"
        >
          前往商城
          <ArrowUpRight size={17} />
        </a>
      </section>

      <section className={cardClass}>
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-blue-600 text-2xl font-bold text-white">
            {session.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={session.avatar}
                alt={session.name || "avatar"}
                className="h-full w-full object-cover"
              />
            ) : (
              initials
            )}
          </div>
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-slate-400">
              個人資料
            </p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">
              {session.name || "User"}
            </h2>
            <p className="text-sm text-slate-500">{session.email || "-"}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {wideProfileItems.map((item) => (
            <div key={item.label} className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-500">{item.label}</p>
              <p className="mt-1 break-words font-bold text-slate-900">
                {item.value}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {profileItems.map((item) => (
            <div key={item.label} className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs font-semibold text-slate-500">{item.label}</p>
              <p className="mt-1 break-words font-bold text-slate-900">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-blue-600">
            Subscription
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            訂閱管理
          </h2>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <div className={cardClass}>
            <p className="text-sm font-semibold text-slate-500">Current access</p>
            <div className="mt-3 space-y-2">
              {activeRecords.length ? (
                activeRecords.map((item) => (
                  <div key={item.appId} className="text-xl font-bold text-slate-900">
                    {item.appName}
                  </div>
                ))
              ) : (
                <div className="text-xl font-bold text-slate-900">
                  尚無有效訂閱
                </div>
              )}
            </div>
          </div>

          <div className={cardClass}>
            <p className="text-sm font-semibold text-slate-500">訂閱狀態</p>
            <div className="mt-3 flex items-end gap-3">
              <p className="text-3xl font-bold text-slate-900">
                {activeRecords.length}
              </p>
              <p className="pb-1 text-sm font-semibold text-slate-500">
                有效 / {expiredRecords.length} 已到期
              </p>
            </div>
          </div>

          <div className={cardClass}>
            <div className="flex items-center gap-3">
              <CalendarDays className="h-6 w-6 text-blue-600" />
              <p className="text-sm font-semibold text-slate-500">最近到期日</p>
            </div>
            <p className="mt-3 text-3xl font-bold text-slate-900">
              {formatDate(nearestExpireAt || session.expireDate)}
            </p>
            {typeof session.daysLeft === "number" && (
              <p className="mt-2 text-sm text-slate-500">
                約剩 {session.daysLeft} 天
              </p>
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-6 py-4">
            <h3 className="text-lg font-bold text-slate-900">訂閱紀錄</h3>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Store className="h-4 w-4" />
              購買與續約由商城處理
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-6 py-3">產品</th>
                  <th className="px-6 py-3">App ID</th>
                  <th className="px-6 py-3">到期日</th>
                  <th className="px-6 py-3">狀態</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.length === 0 && (
                  <tr>
                    <td className="px-6 py-8 text-center text-slate-500" colSpan={4}>
                      目前沒有訂閱紀錄。請重新登入一次以更新帳號資料。
                    </td>
                  </tr>
                )}

                {records.map((item) => (
                  <tr key={`${item.appId}-${item.expireAt}`}>
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      {item.appName}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{item.appId}</td>
                    <td className="px-6 py-4 text-slate-600">
                      {formatDate(item.expireAt)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={[
                          "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold",
                          item.status === "active"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-600",
                        ].join(" ")}
                      >
                        {item.status === "active" && <CheckCircle2 className="h-3.5 w-3.5" />}
                        {item.status === "active" ? "有效" : "已到期"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
