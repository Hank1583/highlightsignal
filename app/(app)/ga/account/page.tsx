"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/ga/PageHeader";
import SectionCard from "@/components/ga/SectionCard";
import {
  updateGAConnectionForWorkspace,
  useGAConnections,
} from "../dataSource";
import { useWorkspace } from "@/components/workspace/WorkspaceProvider";

type User = {
  id: number;
  email?: string;
  name?: string;
  isDemo?: boolean;
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
  const { currentWorkspace } = useWorkspace();
  const { gaConnections, loading, error, refresh } = useGAConnections({
    includeInactive: true,
  });
  const [user, setUser] = useState<User | null>(null);
  const [syncRange, setSyncRange] = useState<DateRange>(() => getLastDays(90));
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncFrameUrl, setSyncFrameUrl] = useState<string | null>(null);
  const [updatingIds, setUpdatingIds] = useState<number[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

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
    ? `/api/ga/account-link?workspace_id=${currentWorkspace.id}`
    : null;

  const isInvalidRange =
    Boolean(syncRange.start && syncRange.end) && syncRange.start > syncRange.end;

  const canSync =
    Boolean(user?.id && syncRange.start && syncRange.end) &&
    !isInvalidRange &&
    !user?.isDemo;

  const handleSync = () => {
    if (!canSync || syncing) return;

    const params = new URLSearchParams({
      workspace_id: String(currentWorkspace.id),
      start: syncRange.start,
      end: syncRange.end,
      t: String(Date.now()),
    });

    setSyncing(true);
    setSyncMessage(null);
    setSyncError(null);
    setSyncFrameUrl(`/api/ga/sync?${params.toString()}`);
  };

  const handleSyncFrameLoad = () => {
    if (!syncing) return;

    setSyncing(false);
    setSyncMessage(
      `Synced GA data from ${syncRange.start} to ${syncRange.end}.`
    );
  };

  const handleStatusChange = async (connectionId: number, status: 0 | 1) => {
    if (user?.isDemo || updatingIds.includes(connectionId)) return;

    setUpdatingIds((ids) => [...ids, connectionId]);
    setStatusMessage(null);
    setStatusError(null);

    try {
      await updateGAConnectionForWorkspace(
        currentWorkspace,
        connectionId,
        status
      );

      await refresh();
      setStatusMessage(
        status === 1
          ? "已開啟，這個 GA 帳號會顯示於 Dashboard。"
          : "已關閉，這個 GA 帳號不會顯示於 Dashboard。"
      );
    } catch (err: any) {
      setStatusError(err?.message || "無法更新 GA 帳號狀態");
    } finally {
      setUpdatingIds((ids) => ids.filter((id) => id !== connectionId));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="GA 帳號管理"
        description="查看目前綁定的 GA 帳號，並將指定區間的 GA4 資料同步到資料庫。"
      />

      <div className="flex flex-wrap gap-3">
        {user?.isDemo ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-800">
            Demo 帳號僅供檢視，無法串接或同步 GA。
          </div>
        ) : accountFetchLink ? (
          <a
            href={accountFetchLink}
            className="inline-flex items-center rounded-2xl bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-blue-700"
          >
            綁定 GA 帳號
          </a>
        ) : null}
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
          description={`共 ${gaConnections.length} 個帳號；開啟的帳號會顯示於 Dashboard 並參與資料同步。`}
        >
          {statusMessage && (
            <div
              role="status"
              className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800"
            >
              {statusMessage}
            </div>
          )}

          {statusError && (
            <div
              role="alert"
              className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700"
            >
              {statusError}
            </div>
          )}

          <div className="space-y-3">
            {gaConnections.map((item) => {
              const isActive = Number(item.status) === 1;
              const isUpdating = updatingIds.includes(item.id);

              return (
                <div
                  key={item.id}
                  className={[
                    "flex flex-col gap-3 rounded-2xl border p-4 md:flex-row md:items-center md:justify-between",
                    isActive
                      ? "border-slate-200 bg-white"
                      : "border-slate-200 bg-slate-50",
                  ].join(" ")}
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
                        isActive
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-200 text-slate-600",
                      ].join(" ")}
                    >
                      {isActive ? "ACTIVE" : "INACTIVE"}
                    </span>

                    <button
                      type="button"
                      disabled={Boolean(user?.isDemo) || isUpdating}
                      onClick={() =>
                        handleStatusChange(item.id, isActive ? 0 : 1)
                      }
                      className={[
                        "rounded-xl px-4 py-2 text-sm font-bold transition-colors",
                        isActive
                          ? "border border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                          : "bg-blue-600 text-white hover:bg-blue-700",
                        user?.isDemo || isUpdating
                          ? "cursor-not-allowed opacity-60"
                          : "",
                      ].join(" ")}
                    >
                      {isUpdating
                        ? "儲存中..."
                        : isActive
                          ? "關閉"
                          : "開啟"}
                    </button>
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
