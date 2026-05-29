"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  RefreshCw,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  Monitor,
  Smartphone,
} from "lucide-react";
import type { SeoSite, SeoSummaryResponse } from "@/lib/seo/types";
import AddSeoSiteDialog from "@/components/seo/AddSeoSiteDialog";

type SummaryData = SeoSummaryResponse["data"];
type PageSpeedStrategy = "mobile" | "desktop";
type PageSpeedMetric = {
  id: string;
  label: string;
  value: string;
  numericValue: number | null;
  score: number | null;
  status: "good" | "average" | "poor" | "unknown";
};
type PageSpeedData = {
  url: string;
  strategy: PageSpeedStrategy;
  score: number | null;
  status: "good" | "average" | "poor" | "unknown";
  metrics: PageSpeedMetric[];
  fetchedAt: string;
};
type PageSpeedCache = Record<string, PageSpeedData>;
type CurrentUser = {
  id: number;
  isDemo?: boolean;
};

const PAGESPEED_CACHE_KEY = "highlightsignal:seo:pagespeed-cache";

const seoTabs = [
  { key: "overview", label: "SEO 總覽", href: "/si/seo" },
  { key: "keywords", label: "關鍵字機會", href: "/si/seo?tab=keywords" },
  { key: "technical", label: "技術與 AI 建議", href: "/si/seo?tab=technical" },
];

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

function pageSpeedCacheKey(url: string, strategy: PageSpeedStrategy) {
  return `${strategy}:${url.trim().toLowerCase()}`;
}

function readPageSpeedCache(): PageSpeedCache {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.sessionStorage.getItem(PAGESPEED_CACHE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writePageSpeedCache(cache: PageSpeedCache) {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(PAGESPEED_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Session cache is a convenience only; ignore storage failures.
  }
}

export default function SeoPage() {
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab") || "overview";
  const tab = rawTab === "issues" || rawTab === "ai" ? "technical" : rawTab;

  const [user, setUser] = useState<CurrentUser | null>(null);
  const [sites, setSites] = useState<SeoSite[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<number | null>(null);
  const [summary, setSummary] = useState<SummaryData | null>(null);

  const [loadingSites, setLoadingSites] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [pageSpeedStrategy, setPageSpeedStrategy] =
    useState<PageSpeedStrategy>("mobile");
  const [pageSpeed, setPageSpeed] = useState<PageSpeedData | null>(null);
  const [pageSpeedCache, setPageSpeedCache] = useState<PageSpeedCache>({});
  const [loadingPageSpeed, setLoadingPageSpeed] = useState(false);
  const [pageSpeedError, setPageSpeedError] = useState("");
  const isDemo = Boolean(user?.isDemo);

  useEffect(() => {
    let alive = true;

    fetch("/api/auth/me", { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((res) => {
        if (!alive) return;
        setUser(res?.ok && res?.data?.id ? res.data : null);
      })
      .catch(() => {
        if (!alive) return;
        setUser(null);
      });

    return () => {
      alive = false;
    };
  }, []);

  const loadSites = useCallback(async () => {
    try {
      setLoadingSites(true);
      setErrorText("");

      const res = await fetch("/api/seo/sites", {
        method: "GET",
        cache: "no-store",
      });

      const json = await parseJsonSafe<{ ok: boolean; data: SeoSite[]; error?: any }>(res);

      if (!res.ok || !json.ok) {
        throw new Error(getErrorMessage(json, "取得站點失敗"));
      }

      setSites(json.data);

      setSelectedSiteId((prev) => {
        if (prev) return prev;
        return json.data.length > 0 ? json.data[0].id : null;
      });
    } catch (error) {
      console.error(error);
      setErrorText(error instanceof Error ? error.message : "載入站點失敗");
    } finally {
      setLoadingSites(false);
    }
  }, []);

  const loadSummary = useCallback(
    async (siteId: number, options?: { force?: boolean }) => {
      if (options?.force && isDemo) return;

      try {
        setLoadingSummary(true);
        setErrorText("");

        const res = await fetch("/api/seo/summary", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            site_id: siteId,
            force: Boolean(options?.force),
          }),
          cache: "no-store",
        });

        const json = await parseJsonSafe<SeoSummaryResponse>(res);

        if (!res.ok || !json.ok) {
          throw new Error(getErrorMessage(json, "載入分析失敗"));
        }

        setSummary(json.data);
      } catch (error) {
        console.error(error);
        setSummary(null);
        setErrorText(error instanceof Error ? error.message : "載入分析失敗");
      } finally {
        setLoadingSummary(false);
      }
    },
    [isDemo]
  );

  useEffect(() => {
    loadSites();
  }, [loadSites]);

  useEffect(() => {
    setPageSpeedCache(readPageSpeedCache());
  }, []);

  useEffect(() => {
    if (selectedSiteId) {
      loadSummary(selectedSiteId);
    }
  }, [selectedSiteId, loadSummary]);

  const selectedSite = useMemo(() => {
    return sites.find((site) => site.id === selectedSiteId) || null;
  }, [sites, selectedSiteId]);

  const loadPageSpeed = useCallback(
    async (
      url: string,
      strategy: PageSpeedStrategy,
      options?: { siteId?: number | null; refresh?: boolean }
    ) => {
      if (options?.refresh && isDemo) return;

      try {
        setLoadingPageSpeed(true);
        setPageSpeedError("");

        const res = await fetch("/api/seo/pagespeed", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url,
            strategy,
            site_id: options?.siteId,
            refresh: options?.refresh ?? true,
          }),
          cache: "no-store",
        });

        const json = await parseJsonSafe<{
          ok: boolean;
          data?: PageSpeedData;
          error?: { message?: string };
          message?: string;
        }>(res);

        if (!res.ok || !json.ok || !json.data) {
          throw new Error(getErrorMessage(json, "PageSpeed 跑分失敗"));
        }

        setPageSpeed(json.data);
        setPageSpeedCache((current) => {
          const next = {
            ...current,
            [pageSpeedCacheKey(json.data!.url, json.data!.strategy)]: json.data!,
          };
          writePageSpeedCache(next);
          return next;
        });
      } catch (error) {
        setPageSpeedError(
          error instanceof Error ? error.message : "PageSpeed 跑分失敗"
        );
      } finally {
        setLoadingPageSpeed(false);
      }
    },
    [isDemo]
  );

  const loadLatestPageSpeed = useCallback(
    async (siteId: number, strategy: PageSpeedStrategy) => {
      try {
        setLoadingPageSpeed(true);
        setPageSpeedError("");

        const res = await fetch("/api/seo/pagespeed", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            site_id: siteId,
            strategy,
            cacheOnly: true,
          }),
          cache: "no-store",
        });

        const json = await parseJsonSafe<{
          ok: boolean;
          data?: PageSpeedData | null;
          error?: { message?: string };
          message?: string;
        }>(res);

        if (!res.ok || !json.ok) {
          throw new Error(getErrorMessage(json, "讀取上次 PageSpeed 跑分失敗"));
        }

        setPageSpeed(json.data || null);

        if (json.data) {
          setPageSpeedCache((current) => {
            const next = {
              ...current,
              [pageSpeedCacheKey(json.data!.url, json.data!.strategy)]: json.data!,
            };
            writePageSpeedCache(next);
            return next;
          });
        }
      } catch (error) {
        setPageSpeed(null);
        setPageSpeedError(
          error instanceof Error ? error.message : "讀取上次 PageSpeed 跑分失敗"
        );
      } finally {
        setLoadingPageSpeed(false);
      }
    },
    []
  );

  useEffect(() => {
    const url = selectedSite?.site_url;
    const cached = url
      ? pageSpeedCache[pageSpeedCacheKey(url, pageSpeedStrategy)]
      : null;

    setPageSpeed(cached || null);
    setPageSpeedError("");

    if (!cached && selectedSiteId) {
      void loadLatestPageSpeed(selectedSiteId, pageSpeedStrategy);
    }
  }, [
    loadLatestPageSpeed,
    pageSpeedCache,
    pageSpeedStrategy,
    selectedSite?.site_url,
    selectedSiteId,
  ]);

  return (
    <>
      <div className="space-y-6">
        <header className="flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="mb-2 text-sm font-medium text-slate-500">
              Search Intelligence / SEO
            </div>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                SEO 管理中心
              </h1>
              <select
                value={selectedSiteId ?? ""}
                onChange={(event) => {
                  const value = event.target.value;
                  setSelectedSiteId(value ? Number(value) : null);
                }}
                disabled={loadingSites || sites.length === 0}
                className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-slate-900 lg:w-72"
              >
                {loadingSites ? (
                  <option value="">載入網站中...</option>
                ) : sites.length === 0 ? (
                  <option value="">尚未新增網站</option>
                ) : (
                  sites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.site_name || site.site_url}
                    </option>
                  ))
                )}
              </select>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              管理網站、查看關鍵字機會，並把技術問題與 AI 建議整理成優先順序。
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                if (selectedSiteId) loadSummary(selectedSiteId, { force: true });
              }}
              disabled={!selectedSiteId || loadingSummary || isDemo}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw size={16} />
              重新整理
            </button>

            <button
              type="button"
              onClick={() => {
                if (!isDemo) setDialogOpen(true);
              }}
              disabled={isDemo}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
            >
              <Plus size={16} />
              新增連結
            </button>
          </div>
        </header>

        <nav className="flex gap-2 overflow-x-auto rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
          {seoTabs.map((item) => {
            const active = tab === item.key;

            return (
              <Link
                key={item.key}
                href={item.href}
                className={[
                  "whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition",
                  active
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                ].join(" ")}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {errorText ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorText}
          </div>
        ) : null}

        <section>
          <div className="space-y-6">
            {!selectedSite ? (
              <div className="rounded-3xl bg-white p-8 text-sm text-slate-500 shadow-sm ring-1 ring-slate-200">
                請先選擇一個網站。
              </div>
            ) : loadingSummary ? (
              <div className="rounded-3xl bg-white p-8 text-sm text-slate-500 shadow-sm ring-1 ring-slate-200">
                載入 SEO 分析中...
              </div>
            ) : !summary ? (
              <div className="rounded-3xl bg-white p-8 text-sm text-slate-500 shadow-sm ring-1 ring-slate-200">
                目前沒有分析資料。
              </div>
            ) : (
              <>
                <section className="grid gap-4 md:grid-cols-3">
                  <ScoreCard
                    title="SEO 總分"
                    value={summary.health.score}
                    icon={<TrendingUp size={18} />}
                  />
                  <ScoreCard
                    title="技術分數"
                    value={summary.health.breakdown.tech}
                    icon={<ShieldCheck size={18} />}
                  />
                  <ScoreCard
                    title="內容分數"
                    value={summary.health.breakdown.content ?? "-"}
                    icon={<AlertTriangle size={18} />}
                  />
                </section>

                <PageSpeedPanel
                  data={pageSpeed}
                  error={pageSpeedError}
                  loading={loadingPageSpeed}
                  strategy={pageSpeedStrategy}
                  onStrategyChange={setPageSpeedStrategy}
                  onRefresh={() => {
                    if (selectedSite.site_url) {
                      loadPageSpeed(selectedSite.site_url, pageSpeedStrategy, {
                        siteId: selectedSiteId,
                        refresh: true,
                      });
                    }
                  }}
                  disabled={isDemo}
                />

                {tab === "overview" && (
                  <section className="grid gap-6">
                    <InfoCard title="網站資訊">
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-slate-400">網站：</span>
                          <span className="font-medium text-slate-900">{summary.site}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">最後更新：</span>
                          <span className="font-medium text-slate-900">
                            {summary.meta.updated_at}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400">資料來源：</span>
                          <span className="font-medium text-slate-900">
                            {summary.meta.source}
                          </span>
                        </div>
                      </div>
                    </InfoCard>

                    <InfoCard title="Top Opportunities">
                      <div className="space-y-3">
                        {summary.topOpportunities.length === 0 ? (
                          <EmptyText text="目前沒有可優化機會" />
                        ) : (
                          summary.topOpportunities.map((item) => (
                            <div
                              key={item.keyword}
                              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                            >
                              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                                <div className="font-semibold text-slate-900">{item.keyword}</div>
                                <div className="text-xs text-slate-500">
                                  排名 {item.position} ・ 曝光 {item.impressions} ・ 點擊 {item.clicks}
                                </div>
                              </div>

                              {"recommendation" in item && item.recommendation && (
                                <div className="mt-2 text-sm text-slate-600">
                                  建議：{item.recommendation}
                                </div>
                              )}

                              {"recommendations" in item &&
                                Array.isArray(item.recommendations) &&
                                item.recommendations.length > 0 && (
                                  <ul className="mt-3 space-y-1 text-sm text-slate-600">
                                    {item.recommendations.map((rec) => (
                                      <li key={rec}>• {rec}</li>
                                    ))}
                                  </ul>
                                )}
                            </div>
                          ))
                        )}
                      </div>
                    </InfoCard>
                  </section>
                )}

                {tab === "keywords" && (
                  <section className="grid gap-6 xl:grid-cols-3">
                    <KeywordPanel title="PUSH" items={summary.pushKeywords} />
                    <KeywordPanel title="DEFEND" items={summary.defendKeywords} />
                    <KeywordPanel title="WATCH" items={summary.watchKeywords} />
                  </section>
                )}

                {tab === "technical" && (
                  <section className="grid gap-6 xl:grid-cols-2">
                    <InfoCard title="技術問題">
                      {summary.technicalIssues.length === 0 ? (
                        <EmptyText text="目前沒有技術問題" />
                      ) : (
                        <div className="space-y-3">
                          {summary.technicalIssues.map((issue) => (
                            <div
                              key={`${issue.type}-${issue.url}`}
                              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                            >
                              <div className="mb-1 text-sm font-semibold text-slate-900">
                                {issue.type}
                              </div>
                              <div className="text-sm text-slate-600">{issue.message}</div>
                              <div className="mt-2 text-xs text-slate-400">{issue.url}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </InfoCard>

                    <InfoCard title="AI 建議">
                      {summary.suggestions.length === 0 ? (
                        <EmptyText text="目前沒有 AI 建議" />
                      ) : (
                        <div className="space-y-3">
                          {summary.suggestions.map((item) => (
                            <div
                              key={item.rule}
                              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                            >
                              <div className="text-sm font-semibold text-slate-900">
                                {item.title}
                              </div>
                              <div className="mt-2 text-sm text-slate-600">{item.reason}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </InfoCard>
                  </section>
                )}
              </>
            )}
          </div>
        </section>
      </div>

      <AddSeoSiteDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSuccess={loadSites}
      />
    </>
  );
}

function PageSpeedPanel({
  data,
  error,
  loading,
  strategy,
  onStrategyChange,
  onRefresh,
  disabled = false,
}: {
  data: PageSpeedData | null;
  error: string;
  loading: boolean;
  strategy: PageSpeedStrategy;
  onStrategyChange: (strategy: PageSpeedStrategy) => void;
  onRefresh: () => void;
  disabled?: boolean;
}) {
  const score = data?.score ?? null;
  const scoreTone = getScoreTone(score);
  const circumference = 2 * Math.PI * 48;
  const offset =
    score === null ? circumference : circumference - (score / 100) * circumference;

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-sm font-medium text-slate-500">
            網站速度檢測
          </div>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900">
            SEO 效能跑分
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            依照 Google Lighthouse 效能模型檢查載入速度、互動阻塞與版面穩定度。
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-2xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => onStrategyChange("mobile")}
              className={[
                "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition",
                strategy === "mobile"
                  ? "bg-white text-slate-950 shadow-sm"
                  : "text-slate-500 hover:text-slate-900",
              ].join(" ")}
            >
              <Smartphone size={16} />
              行動裝置
            </button>
            <button
              type="button"
              onClick={() => onStrategyChange("desktop")}
              className={[
                "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition",
                strategy === "desktop"
                  ? "bg-white text-slate-950 shadow-sm"
                  : "text-slate-500 hover:text-slate-900",
              ].join(" ")}
            >
              <Monitor size={16} />
              電腦
            </button>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={loading || disabled}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            {data ? "重新跑分" : "開始跑分"}
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[240px_minmax(0,1fr)] xl:items-center">
        <div className="flex flex-col items-center rounded-2xl bg-slate-50 p-5">
          <div className="relative h-36 w-36">
            <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
              <circle
                cx="60"
                cy="60"
                r="48"
                fill="none"
                stroke="currentColor"
                strokeWidth="10"
                className="text-slate-200"
              />
              <circle
                cx="60"
                cy="60"
                r="48"
                fill="none"
                stroke="currentColor"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                className={scoreTone.ring}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-4xl font-bold ${scoreTone.text}`}>
                {loading ? "..." : score ?? "-"}
              </span>
            </div>
          </div>
          <div className="mt-3 text-base font-semibold text-slate-900">
            效能分數
          </div>
          <div className="mt-2 flex flex-wrap justify-center gap-3 text-xs font-semibold text-slate-500">
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
              0-49
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              50-89
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              90-100
            </span>
          </div>
        </div>

        <div>
          {error ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
              {error}
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2">
            {(data?.metrics || []).map((metric) => {
              const tone = getMetricTone(metric.status);

              return (
                <div
                  key={metric.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${tone.dot}`} />
                      <span className="truncate text-sm font-semibold text-slate-700">
                        {metric.label}
                      </span>
                    </div>
                    <span className={`text-lg font-bold ${tone.text}`}>
                      {metric.value}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {!loading && !error && !data ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-500">
              尚未取得 PageSpeed 跑分。
            </div>
          ) : null}

          {data?.fetchedAt ? (
            <p className="mt-3 text-xs font-semibold text-slate-400">
              最後檢查時間 {new Date(data.fetchedAt).toLocaleString()}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function getScoreTone(score: number | null) {
  if (score === null) {
    return { ring: "text-slate-300", text: "text-slate-400" };
  }

  if (score >= 90) {
    return { ring: "text-emerald-500", text: "text-emerald-600" };
  }

  if (score >= 50) {
    return { ring: "text-amber-500", text: "text-amber-600" };
  }

  return { ring: "text-rose-500", text: "text-rose-600" };
}

function getMetricTone(status: PageSpeedMetric["status"]) {
  if (status === "good") {
    return { dot: "bg-emerald-500", text: "text-emerald-700" };
  }

  if (status === "average") {
    return { dot: "bg-amber-500", text: "text-amber-700" };
  }

  if (status === "poor") {
    return { dot: "bg-rose-500", text: "text-rose-700" };
  }

  return { dot: "bg-slate-300", text: "text-slate-700" };
}

function ScoreCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm font-medium text-slate-500">{title}</div>
        <div className="text-slate-400">{icon}</div>
      </div>
      <div className="text-4xl font-bold tracking-tight text-slate-900">{value}</div>
    </div>
  );
}

function InfoCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="mb-4 text-lg font-semibold text-slate-900">{title}</div>
      {children}
    </div>
  );
}

function KeywordPanel({
  title,
  items,
}: {
  title: string;
  items: Array<{
    keyword: string;
    position: number | null;
    impressions: number;
    clicks: number;
    ctr?: number;
  }>;
}) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="mb-4 text-lg font-semibold text-slate-900">{title}</div>

      {items.length === 0 ? (
        <EmptyText text="沒有資料" />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.keyword}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="font-medium text-slate-900">{item.keyword}</div>
              <div className="mt-2 text-xs leading-5 text-slate-500">
                排名 {item.position} ・ 曝光 {item.impressions} ・ 點擊 {item.clicks}
                {typeof item.ctr === "number" ? ` ・ CTR ${item.ctr}%` : ""}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyText({ text }: { text: string }) {
  return <div className="text-sm text-slate-500">{text}</div>;
}
