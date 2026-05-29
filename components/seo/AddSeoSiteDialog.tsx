"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ExternalLink, Globe, Info, X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void | Promise<void>;
};

type AddSeoSiteRouteResponse = {
  ok: boolean;
  data?: {
    id: number;
    site_name: string | null;
    site_url: string;
  };
  error?: {
    code?: string;
    message?: string;
  };
  message?: string;
};

const SERVICE_ACCOUNT_EMAIL =
  "hank-highlight@business-agent-480807.iam.gserviceaccount.com";

function normalizeUrl(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return "";

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function isValidUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

async function parseJsonSafe<T>(res: Response): Promise<T> {
  const text = await res.text();

  if (!text) {
    throw new Error(
      `API 回傳空內容，status=${res.status} statusText=${res.statusText} url=${res.url}`
    );
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      `API 回傳不是合法 JSON，status=${res.status} url=${res.url} body=${text}`
    );
  }
}

function getErrorMessage(json: any, fallback: string) {
  return json?.error?.message || json?.message || fallback;
}

export default function AddSeoSiteDialog({
  open,
  onClose,
  onSuccess,
}: Props) {
  const [siteName, setSiteName] = useState("");
  const [siteUrl, setSiteUrl] = useState("");
  const [confirmedPermission, setConfirmedPermission] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    if (!open) {
      setSiteName("");
      setSiteUrl("");
      setConfirmedPermission(false);
      setSubmitting(false);
      setErrorText("");
    }
  }, [open]);

  const normalizedUrl = useMemo(() => normalizeUrl(siteUrl), [siteUrl]);

  const canSubmit =
    !!normalizedUrl &&
    isValidUrl(normalizedUrl) &&
    confirmedPermission &&
    !submitting;

  async function handleSubmit() {
    setErrorText("");

    const finalUrl = normalizeUrl(siteUrl);

    if (!finalUrl) {
      setErrorText("請輸入網站網址");
      return;
    }

    if (!isValidUrl(finalUrl)) {
      setErrorText("網站網址格式不正確");
      return;
    }

    if (!confirmedPermission) {
      setErrorText("請先確認已完成 Search Console 權限設定");
      return;
    }

    try {
      setSubmitting(true);

      const res = await fetch("/api/seo/sites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          site_name: siteName.trim() || null,
          site_url: finalUrl,
        }),
        cache: "no-store",
      });

      const json = await parseJsonSafe<AddSeoSiteRouteResponse>(res);

      if (!res.ok || !json.ok) {
        throw new Error(getErrorMessage(json, "新增網站失敗"));
      }

      await onSuccess?.();
      onClose();
    } catch (error) {
      console.error(error);
      setErrorText(error instanceof Error ? error.message : "新增網站失敗");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 px-4">
      <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <div className="text-sm font-medium text-slate-500">新增 SEO 網站</div>
            <h2 className="mt-1 text-2xl font-bold text-slate-900">
              新增網站連結
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              新增前請先完成 Search Console 權限設定，避免 summary 無法讀取 GSC 資料。
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="border-b border-slate-200 p-6 lg:border-b-0 lg:border-r">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Info size={16} />
              Search Console 操作流程
            </div>

            <div className="space-y-3">
              <StepItem index={1} text="前往 Google Search Console" />
              <StepItem index={2} text="選擇你的網站 property" />
              <StepItem index={3} text="進入「設定」" />
              <StepItem index={4} text="點「使用者和權限」" />
              <StepItem index={5} text="點「新增使用者」" />
              <StepItem
                index={6}
                text="加入下方這個 service account email"
                highlight
              />
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-2 text-xs font-semibold tracking-wide text-slate-500">
                SERVICE ACCOUNT EMAIL
              </div>
              <div className="break-all rounded-xl bg-white px-3 py-3 text-sm font-semibold text-slate-900 ring-1 ring-slate-200">
                {SERVICE_ACCOUNT_EMAIL}
              </div>

              <a
                href="https://search.google.com/search-console/"
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                前往 Search Console
                <ExternalLink size={14} />
              </a>
            </div>

            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              若網站已加過權限，就不用重複加。只要確認這個 email
              對應的 property 權限還存在即可。
            </div>
          </div>

          <div className="p-6">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-900">
              <Globe size={16} />
              網站資料
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  網站名稱
                </label>
                <input
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  placeholder="例如：Highlight 官網"
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  網站網址
                </label>
                <input
                  value={siteUrl}
                  onChange={(e) => setSiteUrl(e.target.value)}
                  placeholder="例如：www.highlight.url.tw 或 https://www.highlight.url.tw"
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                />

                {siteUrl.trim() ? (
                  <div className="mt-2 text-xs text-slate-500">
                    送出網址：
                    <span className="ml-1 font-medium text-slate-700">
                      {normalizedUrl}
                    </span>
                  </div>
                ) : null}
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <input
                  type="checkbox"
                  checked={confirmedPermission}
                  onChange={(e) => setConfirmedPermission(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300"
                />
                <div>
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <CheckCircle2 size={16} />
                    我已完成權限設定
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    我已經在 Search Console 中，把
                    <span className="mx-1 font-medium text-slate-700">
                      {SERVICE_ACCOUNT_EMAIL}
                    </span>
                    加入這個網站的使用者權限。
                  </div>
                </div>
              </label>

              {errorText ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {errorText}
                </div>
              ) : null}
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                取消
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {submitting ? "新增中..." : "新增網站"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepItem({
  index,
  text,
  highlight = false,
}: {
  index: number;
  text: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={[
        "flex items-start gap-3 rounded-2xl border p-4",
        highlight
          ? "border-slate-300 bg-slate-50"
          : "border-slate-200 bg-white",
      ].join(" ")}
    >
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
        {index}
      </div>
      <div className="pt-0.5 text-sm text-slate-700">{text}</div>
    </div>
  );
}
