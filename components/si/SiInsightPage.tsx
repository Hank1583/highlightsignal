"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowUpRight,
  Bot,
  CheckCircle2,
  FileQuestion,
  Globe2,
  Lightbulb,
  Radar,
} from "lucide-react";
import type {
  SiModule,
  SiSite,
  SiSitesResponse,
  SiSummary,
  SiSummaryResponse,
} from "@/lib/si/types";

type ModuleConfig = {
  module: SiModule;
  eyebrow: string;
  emptyTitle: string;
  iconMode: "aeo" | "geo";
};

const DEFAULT_SITE_ID = 1;

async function parseJsonSafe<T>(res: Response): Promise<T> {
  const text = await res.text();

  if (!text) {
    throw new Error(`API returned empty response. status=${res.status}`);
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`API did not return JSON. body=${text}`);
  }
}

function getErrorMessage(json: SiSummaryResponse, fallback: string) {
  return json?.error?.message || json?.message || fallback;
}

function siteLabel(site: SiSite) {
  return site.site_name || site.site_url;
}

function confidenceLabel(value?: string) {
  if (value === "high") return "信心：高";
  if (value === "medium") return "信心：中";
  if (value === "low") return "信心：低";
  return value ? `信心：${value}` : "";
}

function draftModeLabel(value?: string) {
  if (value === "publishable") return "可發布短答案";
  if (value === "guidance") return "改寫建議";
  return value || "建議草稿";
}

export default function SiInsightPage({
  module,
  eyebrow,
  emptyTitle,
  iconMode,
}: ModuleConfig) {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab") || "overview";
  const querySiteId = Number(searchParams.get("site_id") || DEFAULT_SITE_ID);

  const [siteId, setSiteId] = useState(querySiteId || DEFAULT_SITE_ID);
  const [sites, setSites] = useState<SiSite[]>([]);
  const [summary, setSummary] = useState<SiSummary | null>(null);
  const [loadingSites, setLoadingSites] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    setSiteId(querySiteId || DEFAULT_SITE_ID);
  }, [querySiteId]);

  useEffect(() => {
    let alive = true;

    async function loadSites() {
      try {
        setLoadingSites(true);
        const res = await fetch("/api/si/sites", {
          method: "GET",
          cache: "no-store",
        });
        const json = await parseJsonSafe<SiSitesResponse>(res);

        if (!res.ok || !json.ok || !Array.isArray(json.data)) {
          throw new Error(json?.error?.message || "讀取網站清單失敗");
        }

        if (!alive) return;

        setSites(json.data);
        setSiteId((current) => {
          if (querySiteId) return querySiteId;
          if (json.data!.some((site) => site.id === current)) return current;
          return json.data![0]?.id || DEFAULT_SITE_ID;
        });
      } catch (error) {
        if (!alive) return;
        setSites([]);
        setErrorText(error instanceof Error ? error.message : "讀取網站清單失敗");
      } finally {
        if (alive) setLoadingSites(false);
      }
    }

    loadSites();

    return () => {
      alive = false;
    };
  }, [querySiteId]);

  const loadSummary = useCallback(
    async (options?: { generate?: boolean }) => {
      if (!siteId || sites.length === 0) return;

      try {
        if (options?.generate) {
          setGenerating(true);
        } else {
          setLoading(true);
        }
        setErrorText("");

        const res = await fetch(
          `/api/si/${module}/${options?.generate ? "generate" : "summary"}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              site_id: siteId,
              tab,
            }),
            cache: "no-store",
          }
        );

        const json = await parseJsonSafe<SiSummaryResponse>(res);

        if (!res.ok || !json.ok || !json.data) {
          throw new Error(getErrorMessage(json, "讀取 SI 分析資料失敗"));
        }

        setSummary(json.data);
      } catch (error) {
        setSummary(null);
        setErrorText(error instanceof Error ? error.message : "讀取 SI 分析資料失敗");
      } finally {
        setLoading(false);
        setGenerating(false);
      }
    },
    [module, siteId, sites.length, tab]
  );

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const hasData = Boolean(summary?.title || summary?.metrics.length || summary?.items.length);

  const panelIcon = iconMode === "aeo" ? (
    <FileQuestion className="h-5 w-5 text-slate-500" />
  ) : (
    <Bot className="h-5 w-5 text-slate-500" />
  );

  const sideIcon = iconMode === "aeo" ? (
    <Lightbulb className="h-5 w-5 text-amber-500" />
  ) : (
    <Radar className="h-5 w-5 text-blue-500" />
  );

  const defaultTitle = useMemo(() => {
    if (summary?.title) return summary.title;
    return emptyTitle;
  }, [emptyTitle, summary?.title]);

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(220px,320px)] lg:items-start">
          <div className="min-w-0">
            <p className="text-sm font-bold uppercase tracking-wider text-blue-600">
              {eyebrow}
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
              {defaultTitle}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
              {summary?.desc || "選擇網站後可重新產生正式分析資料。"}
            </p>
            {summary?.site && (
              <p className="mt-3 break-words text-xs font-semibold text-slate-400">
                {summary.site.name || summary.site.url} / {summary.site.url}
              </p>
            )}
          </div>

          <label className="min-w-0 text-sm font-semibold text-slate-600">
            分析網站
            <select
              value={siteId}
              onChange={(event) => setSiteId(Number(event.target.value) || 1)}
              disabled={loadingSites || sites.length === 0}
              className="mt-2 h-10 w-full max-w-full truncate rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-900"
            >
              {loadingSites ? (
                <option value="">讀取網站中...</option>
              ) : sites.length === 0 ? (
                <option value="">尚未建立網站</option>
              ) : (
                sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {siteLabel(site)}
                  </option>
                ))
              )}
            </select>
          </label>
        </div>
      </section>

      {errorText && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorText}
        </div>
      )}

      {loadingSites && (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
          讀取網站清單中...
        </div>
      )}

      {!loadingSites && sites.length === 0 && !errorText && (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          尚未建立可分析的網站。
        </div>
      )}

      {loading && (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
          讀取 {eyebrow} 分析資料中...
        </div>
      )}

      {!loadingSites && sites.length > 0 && !loading && !errorText && !hasData && (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          <div>尚未建立 {eyebrow} 分析資料。</div>
          <button
            type="button"
            onClick={() => loadSummary({ generate: true })}
            disabled={generating}
            className="mt-4 inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {generating ? "產生中..." : "產生分析"}
          </button>
        </div>
      )}

      {!loadingSites && !loading && !errorText && hasData && summary && (
        <>
          <section className="grid gap-4 md:grid-cols-3">
            {summary.metrics.map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
              >
                <p className="text-sm font-semibold text-slate-500">{item.label}</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {item.value}
                </p>
                {item.note && (
                  <p className="mt-2 text-xs font-semibold text-emerald-600">
                    {item.note}
                  </p>
                )}
                {item.basis && (
                  <p className="mt-3 border-t border-slate-100 pt-3 text-xs leading-5 text-slate-500">
                    {item.basis}
                  </p>
                )}
              </div>
            ))}
          </section>

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                {panelIcon}
                <h3 className="font-bold text-slate-900">
                  {summary.panelTitle || "分析項目"}
                </h3>
              </div>

              <div className="space-y-3">
                {summary.items.length === 0 ? (
                  <EmptyText text="尚無分析項目" />
                ) : (
                  summary.items.map((item, index) => (
                    <div
                      key={`${item.title}-${index}`}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <p className="min-w-0 break-words font-semibold text-slate-900">
                          {item.title}
                        </p>
                        {(item.meta || item.source) && (
                          <span className="w-fit shrink-0 rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500 ring-1 ring-slate-200">
                            {item.meta || item.source}
                          </span>
                        )}
                      </div>

                      {item.status && (
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                          {item.status}
                        </p>
                      )}

                      {(item.sourceLabel || item.intent || item.confidence || item.placement) && (
                        <div className="mt-3 grid gap-2 text-xs text-slate-500 md:grid-cols-2">
                          {item.sourceLabel && (
                            <InfoPill>{item.sourceLabel}</InfoPill>
                          )}
                          {item.intent && <InfoPill>搜尋意圖：{item.intent}</InfoPill>}
                          {item.confidence && (
                            <InfoPill>{confidenceLabel(item.confidence)}</InfoPill>
                          )}
                          {item.placement && (
                            <InfoPill wide>{item.placement}</InfoPill>
                          )}
                        </div>
                      )}

                      {item.draft && (
                        <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm leading-6 text-blue-900">
                          <div className="mb-1 flex flex-wrap items-center gap-2 text-xs font-bold text-blue-700">
                            <span>建議內容</span>
                            <span className="rounded-full bg-white px-2 py-0.5 text-blue-700 ring-1 ring-blue-100">
                              {draftModeLabel(item.draftMode)}
                            </span>
                          </div>
                          {item.draft}
                        </div>
                      )}

                      {item.basis && (
                        <p className="mt-3 text-xs leading-5 text-slate-400">
                          {item.basis}
                        </p>
                      )}

                      {item.tags && item.tags.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                          {item.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-blue-50 px-3 py-1 text-blue-700"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                {sideIcon}
                <h3 className="font-bold text-slate-900">
                  {summary.sideTitle || "建議方向"}
                </h3>
              </div>

              {summary.sideItems.length > 0 && (
                <div className="mb-5 space-y-4">
                  {summary.sideItems.map((item) => (
                    <div key={item.name}>
                      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                        <span className="min-w-0 break-words font-semibold text-slate-700">
                          {item.name}
                        </span>
                        <span className="font-bold text-slate-900">
                          {Math.round(item.score)}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-100">
                        <div
                          className="h-2 rounded-full bg-slate-900"
                          style={{
                            width: `${Math.max(0, Math.min(100, item.score))}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {summary.actions.length > 0 ? (
                <div className="space-y-3">
                  {summary.actions.map((item) => (
                    <div key={item} className="flex gap-3 text-sm text-slate-600">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      <span className="min-w-0 break-words">{item}</span>
                    </div>
                  ))}
                </div>
              ) : summary.recommendation ? (
                <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
                  <div className="mb-2 flex items-center gap-2 font-bold text-slate-900">
                    <Globe2 className="h-4 w-4" />
                    AI 建議
                  </div>
                  <div className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span className="min-w-0 break-words">{summary.recommendation}</span>
                  </div>
                </div>
              ) : (
                <EmptyText text="尚無建議內容" />
              )}

              <button
                type="button"
                onClick={() => loadSummary({ generate: true })}
                disabled={generating}
                className="mt-5 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {generating ? "更新中..." : "重新產生分析"}
                <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function InfoPill({
  children,
  wide = false,
}: {
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className={`min-w-0 break-words rounded-lg bg-white px-3 py-2 ring-1 ring-slate-200 ${
        wide ? "md:col-span-2" : ""
      }`}
    >
      {children}
    </div>
  );
}

function EmptyText({ text }: { text: string }) {
  return <div className="text-sm text-slate-500">{text}</div>;
}
