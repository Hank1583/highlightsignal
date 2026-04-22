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
} from "lucide-react";
import type { SeoSite, SeoSummaryResponse } from "@/lib/seo/types";
import AddSeoSiteDialog from "@/components/seo/AddSeoSiteDialog";

type SummaryData = SeoSummaryResponse["data"];

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

export default function SeoPage() {
  const searchParams = useSearchParams();
  const rawTab = searchParams.get("tab") || "overview";
  const tab = rawTab === "issues" || rawTab === "ai" ? "technical" : rawTab;

  const userId = 1; // 之後改成實際登入 user_id

  const [sites, setSites] = useState<SeoSite[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<number | null>(null);
  const [summary, setSummary] = useState<SummaryData | null>(null);

  const [loadingSites, setLoadingSites] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [errorText, setErrorText] = useState("");

  const loadSites = useCallback(async () => {
    try {
      setLoadingSites(true);
      setErrorText("");

      const res = await fetch("/api/seo/sites", {
        method: "GET",
        headers: {
          "x-user-id": String(userId),
        },
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
  }, [userId]);

  const loadSummary = useCallback(
    async (siteId: number) => {
      try {
        setLoadingSummary(true);
        setErrorText("");

        const res = await fetch("/api/seo/summary", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: userId,
            site_id: siteId,
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
    [userId]
  );

  useEffect(() => {
    loadSites();
  }, [loadSites]);

  useEffect(() => {
    if (selectedSiteId) {
      loadSummary(selectedSiteId);
    }
  }, [selectedSiteId, loadSummary]);

  const selectedSite = useMemo(() => {
    return sites.find((site) => site.id === selectedSiteId) || null;
  }, [sites, selectedSiteId]);

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
                if (selectedSiteId) loadSummary(selectedSiteId);
              }}
              disabled={!selectedSiteId || loadingSummary}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw size={16} />
              重新整理
            </button>

            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
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
        userId={userId}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSuccess={loadSites}
      />
    </>
  );
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
