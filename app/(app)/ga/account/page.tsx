"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/ga/PageHeader";
import SectionCard from "@/components/ga/SectionCard";
import { highlightPhpApiUrl } from "@/lib/config";
import { useGAConnections } from "../dataSource";

type User = {
  id: number;
  email?: string;
  name?: string;
};

type DateRange = {
  start: string;
  end: string;
};

function formatDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getLastDays(days: number): DateRange {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - days + 1);

  return {
    start: formatDate(start),
    end: formatDate(end),
  };
}

export default function AccountPage() {
  const { gaConnections, loading, error } = useGAConnections();
  const [user, setUser] = useState<User | null>(null);
  const [syncRange, setSyncRange] = useState<DateRange>(() => getLastDays(90));
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncFrameUrl, setSyncFrameUrl] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((res) => {
        if (!alive) return;
        if (res?.ok && res?.data?.id) {
          setUser(res.data);
        } else {
          setUser(null);
        }
      })
      .catch(() => {
        if (!alive) return;
        setUser(null);
      });

    return () => {
      alive = false;
    };
  }, []);

  const accountFetchLink = user?.id
    ? highlightPhpApiUrl(`ga/account_fetch.php?member_id=${user.id}`)
    : null;

  const isInvalidRange =
    Boolean(syncRange.start && syncRange.end) && syncRange.start > syncRange.end;

  const canSync =
    Boolean(user?.id && syncRange.start && syncRange.end) && !isInvalidRange;

  const handleSync = () => {
    if (!canSync || syncing) return;

    const params = new URLSearchParams({
      member_id: String(user?.id),
      start: syncRange.start,
      end: syncRange.end,
      t: String(Date.now()),
    });

    setSyncing(true);
    setSyncMessage(null);
    setSyncError(null);
    setSyncFrameUrl(highlightPhpApiUrl(`ga/data_sync.php?${params.toString()}`));
  };

  const handleSyncFrameLoad = () => {
    if (!syncing) return;

    setSyncing(false);
    setSyncMessage(
      `Synced GA data from ${syncRange.start} to ${syncRange.end}.`
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="GA 帳號管理"
        description="查看目前綁定的 GA 帳號，並將指定區間的 GA4 資料同步到資料庫。"
      />

      <div className="flex flex-wrap gap-3">
        {accountFetchLink && (
          <a
            href={accountFetchLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-2xl bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-700"
          >
            綁定 GA 帳號
          </a>
        )}
      </div>

      <SectionCard
        title="資料同步"
        description="新增帳號後會先同步近 90 天資料；需要補抓或重跑時，也可以手動選擇區間。"
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {[7, 30, 90].map((days) => (
              <button
                key={days}
                type="button"
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
                onClick={() => setSyncRange(getLastDays(days))}
              >
                近 {days} 天
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={syncRange.start}
              onChange={(e) =>
                setSyncRange((range) => ({ ...range, start: e.target.value }))
              }
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <span className="text-sm text-slate-400">到</span>
            <input
              type="date"
              value={syncRange.end}
              onChange={(e) =>
                setSyncRange((range) => ({ ...range, end: e.target.value }))
              }
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />

            <button
              type="button"
              disabled={!canSync || syncing}
              onClick={handleSync}
              className={[
                "inline-flex items-center rounded-2xl px-4 py-2 text-sm font-bold shadow-sm",
                !canSync || syncing
                  ? "cursor-not-allowed bg-slate-200 text-slate-500"
                  : "bg-slate-900 text-white hover:bg-slate-700",
              ].join(" ")}
            >
              {syncing ? "同步中..." : "同步到 DB"}
            </button>
          </div>

          {isInvalidRange && (
            <p className="text-sm font-medium text-red-600">
              開始日期不可晚於結束日期。
            </p>
          )}

          {syncing && (
            <p className="text-sm font-medium text-blue-700">
              正在同步 GA 資料，資料量較大時可能需要幾分鐘，請先不要關閉此頁。
            </p>
          )}

          {syncMessage && (
            <p className="text-sm font-medium text-emerald-700">
              {syncMessage}
            </p>
          )}

          {syncError && (
            <p className="text-sm font-medium text-red-600">{syncError}</p>
          )}

          {syncFrameUrl && (
            <iframe
              title="GA data sync"
              src={syncFrameUrl}
              className="hidden"
              onLoad={handleSyncFrameLoad}
            />
          )}
        </div>
      </SectionCard>

      {loading && (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
          載入 GA 帳號資料中...
        </div>
      )}

      {error && (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center text-red-700 shadow-sm">
          {error}
        </div>
      )}

      {!loading && !error && gaConnections.length === 0 && (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
          目前沒有可用的 GA 帳號
        </div>
      )}

      {!loading && !error && gaConnections.length > 0 && (
        <SectionCard
          title="GA 帳號清單"
          description={`共 ${gaConnections.length} 個帳號`}
        >
          <div className="space-y-3">
            {gaConnections.map((item) => {
              const status = item.status || "ACTIVE";
              const isDisabled = status === "DISABLED";

              return (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0">
                    <div className="truncate text-base font-bold text-slate-900">
                      {item.account_name}
                    </div>

                    <div className="mt-1 text-sm text-slate-500">
                      ID: {item.id}
                    </div>

                    <div className="mt-1 text-sm text-slate-500">
                      Property ID: {item.property_id ?? "-"}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={[
                        "rounded-full px-3 py-1 text-xs font-bold",
                        isDisabled
                          ? "bg-slate-100 text-slate-600"
                          : "bg-emerald-50 text-emerald-700",
                      ].join(" ")}
                    >
                      {status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}
    </div>
  );
}
