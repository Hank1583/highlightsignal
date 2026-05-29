import Link from "next/link";
import { ArrowUpRight, CheckCircle2, CircleDashed } from "lucide-react";
import { UPGRADE_URL } from "@/lib/subscription";

type Props = {
  ga: {
    enabled: boolean;
    connected: boolean;
  };
  seo: {
    enabled: boolean;
    connected: boolean;
    siteCount: number;
  };
};

export default function OnboardingChecklist({ ga, seo }: Props) {
  const steps = [
    {
      label: "啟用 GA 數據分析",
      done: ga.enabled,
      href: UPGRADE_URL,
      external: true,
    },
    {
      label: "連接 GA 資料來源",
      done: ga.connected,
      href: "/ga/account",
    },
    {
      label: "啟用 Search Intelligence",
      done: seo.enabled,
      href: UPGRADE_URL,
      external: true,
    },
    {
      label: "新增網站並產生 SEO summary",
      done: seo.connected && seo.siteCount > 0,
      href: "/si/seo",
    },
  ];

  const doneCount = steps.filter((step) => step.done).length;

  if (doneCount === steps.length) {
    return null;
  }

  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-amber-700">
            Setup
          </p>
          <h2 className="mt-1 text-lg font-black text-slate-950">
            完成資料設定，AI 建議會更準
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            目前完成 {doneCount} / {steps.length} 項。先補齊 GA 與網站資料，Dashboard AI 才能產生完整分析。
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[520px]">
          {steps.map((step) => {
            const Icon = step.done ? CheckCircle2 : CircleDashed;
            const className =
              "flex items-center justify-between gap-3 rounded-lg bg-white px-3 py-2 text-sm font-bold text-slate-700 ring-1 ring-amber-100";

            const content = (
              <>
                <span className="flex min-w-0 items-center gap-2">
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      step.done ? "text-emerald-600" : "text-amber-600"
                    }`}
                  />
                  <span className="truncate">{step.label}</span>
                </span>
                {!step.done && <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-400" />}
              </>
            );

            if (step.done) {
              return (
                <div key={step.label} className={className}>
                  {content}
                </div>
              );
            }

            if (step.external) {
              return (
                <a
                  key={step.label}
                  href={step.href}
                  target="_blank"
                  rel="noreferrer"
                  className={className}
                >
                  {content}
                </a>
              );
            }

            return (
              <Link key={step.label} href={step.href} className={className}>
                {content}
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
