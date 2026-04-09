"use client";
export const runtime = 'edge';

import { useMemo, useState } from "react";
import PageHeader from "@/components/ga/PageHeader";
import SectionCard from "@/components/ga/SectionCard";
import { useGaReportList, type GaReportRow } from "../dataSource";

const weekdayMap: Record<number, string> = {
  1: "週一",
  2: "週二",
  3: "週三",
  4: "週四",
  5: "週五",
  6: "週六",
  7: "週日",
};

type SendType = "weekly" | "monthly" | "custom";

function formatDate(date: Date) {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getWeeklyRange() {
  const today = new Date();
  const end = new Date(today);
  end.setDate(today.getDate() - 1);

  const start = new Date(end);
  start.setDate(end.getDate() - 6);

  return {
    start: formatDate(start),
    end: formatDate(end),
  };
}

function getPreviousMonthRange() {
  const today = new Date();
  const firstDayThisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDayPrevMonth = new Date(firstDayThisMonth);
  lastDayPrevMonth.setDate(0);

  const firstDayPrevMonth = new Date(
    lastDayPrevMonth.getFullYear(),
    lastDayPrevMonth.getMonth(),
    1
  );

  return {
    start: formatDate(firstDayPrevMonth),
    end: formatDate(lastDayPrevMonth),
  };
}

export default function ReportPage() {
  const { reportList, loading, error } = useGaReportList();

  const [selectedRow, setSelectedRow] = useState<GaReportRow | null>(null);
  const [sendType, setSendType] = useState<SendType>("weekly");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");

  const getScheduleText = (row: GaReportRow) => {
    if (row.report_type === "weekly") {
      return `${weekdayMap[row.send_weekday || 1]} ${row.send_time}`;
    }
    return `每月 ${row.send_monthday} 號 ${row.send_time}`;
  };

  const getEmailText = (emails: string[] = []) => {
    if (!emails.length) return "-";
    if (emails.length === 1) return emails[0];
    return `${emails[0]} +${emails.length - 1}`;
  };

  const resolvedRange = useMemo(() => {
    if (sendType === "weekly") return getWeeklyRange();
    if (sendType === "monthly") return getPreviousMonthRange();
    return {
      start: customStart,
      end: customEnd,
    };
  }, [sendType, customStart, customEnd]);

  const previewUrl = useMemo(() => {
    if (!selectedRow) return "";
    if (!resolvedRange.start || !resolvedRange.end) return "";

    const params = new URLSearchParams({
      id: String(selectedRow.id),
      start: resolvedRange.start,
      end: resolvedRange.end,
      type: sendType,
    });

    return `https://www.highlight.url.tw/business-cloud/ga/report/report_mailer.php?${params.toString()}`;
  }, [selectedRow, resolvedRange, sendType]);

  const openSendModal = (row: GaReportRow) => {
    setSelectedRow(row);
    setSendType("weekly");
    setCustomStart("");
    setCustomEnd("");
    setSubmitMessage("");
  };

  const closeSendModal = () => {
    if (submitting) return;
    setSelectedRow(null);
    setSubmitMessage("");
  };

  const handleSend = async () => {
    if (!selectedRow) return;

    if (!resolvedRange.start || !resolvedRange.end) {
      setSubmitMessage("請先選擇完整日期區間");
      return;
    }

    if (resolvedRange.start > resolvedRange.end) {
      setSubmitMessage("開始日期不能大於結束日期");
      return;
    }

    try {
      setSubmitting(true);
      setSubmitMessage("");

      const response = await fetch(previewUrl, {
        method: "GET",
      });

      const text = await response.text();

      if (!response.ok) {
        throw new Error(text || "寄送失敗");
      }

      setSubmitMessage("寄送成功");
      console.log("report_mailer response:", text);
    } catch (err: any) {
      setSubmitMessage(err?.message || "寄送失敗，請稍後再試");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="報表"
        description="列出目前已設定的報表寄送排程，可新增、修改、停用"
      />

      <div className="flex justify-end">
        <a
          href="/ga/report/create"
          className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          新增報表
        </a>
      </div>

      <SectionCard title="排程清單">
        {loading ? (
          <div className="py-10 text-center text-sm text-slate-500">載入中...</div>
        ) : error ? (
          <div className="py-10 text-center text-sm text-red-500">{error}</div>
        ) : reportList.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-500">
            目前尚無報表設定
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200">
            <div className="hidden grid-cols-8 bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-500 md:grid">
              <div>狀態</div>
              <div>類型</div>
              <div>NAME</div>
              <div>排程</div>
              <div>寄送對象</div>
              <div className="text-center">寄送</div>
              <div className="text-center">編輯</div>
              <div className="text-center">刪除</div>
            </div>

            <div className="divide-y divide-slate-200">
              {reportList.map((row: GaReportRow) => (
                <div
                  key={row.id}
                  className="grid grid-cols-1 gap-3 px-4 py-4 text-sm text-slate-700 md:grid-cols-8 md:items-center md:gap-4"
                >
                  <div>
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                        row.is_active
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {row.is_active ? "啟用中" : "停用"}
                    </span>
                  </div>

                  <div className="font-medium text-slate-700">
                    {row.report_type === "weekly" ? "週報" : "月報"}
                  </div>

                  <div>
                    <div className="font-semibold text-slate-900">
                      {row.report_name}
                    </div>
                    <div
                      className="truncate text-xs text-slate-400"
                      title={
                        row.connection_names?.length
                          ? row.connection_names.join("、")
                          : row.connection_ids?.map((id) => `GA #${id}`).join("、")
                      }
                    >
                      {row.connection_names?.length
                        ? row.connection_names.join("、")
                        : row.connection_ids?.map((id) => `GA #${id}`).join("、")}
                    </div>
                  </div>

                  <div className="text-slate-600">{getScheduleText(row)}</div>

                  <div className="truncate text-slate-600" title={row.email_list?.join("、")}>
                    {getEmailText(row.email_list)}
                  </div>

                  <div className="md:text-center">
                    <button
                      type="button"
                      onClick={() => openSendModal(row)}
                      className="rounded-xl border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      立即寄送
                    </button>
                  </div>

                  <div className="md:text-center">
                    <a
                      href={`/ga/report/${row.id}/edit`}
                      className="text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      編輯
                    </a>
                  </div>

                  <div className="md:text-center">
                    <button
                      type="button"
                      className="text-sm font-medium text-rose-600 hover:text-rose-700"
                    >
                      刪除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </SectionCard>

      {selectedRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">立即寄送報表</h3>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedRow.report_name}
                </p>
              </div>
              <button
                type="button"
                onClick={closeSendModal}
                className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  報表類型
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "weekly", label: "週報" },
                    { value: "monthly", label: "月報" },
                    { value: "custom", label: "自訂日期" },
                  ].map((item) => {
                    const active = sendType === item.value;
                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setSendType(item.value as SendType)}
                        className={`rounded-2xl border px-3 py-2 text-sm font-medium transition ${
                          active
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {sendType === "custom" ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      開始日期
                    </label>
                    <input
                      type="date"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      結束日期
                    </label>
                    <input
                      type="date"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                    />
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <div>
                    <span className="font-medium text-slate-800">日期區間：</span>
                    {resolvedRange.start} ~ {resolvedRange.end}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {sendType === "weekly"
                      ? "週報：昨天往前 7 天"
                      : "月報：上個月整月"}
                  </div>
                </div>
              )}

              {submitMessage && (
                <div
                  className={`rounded-2xl px-4 py-3 text-sm ${
                    submitMessage === "寄送成功"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-rose-50 text-rose-700"
                  }`}
                >
                  {submitMessage}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeSendModal}
                  className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={submitting}
                  className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "寄送中..." : "確認寄送"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}