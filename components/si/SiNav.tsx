"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Bot,
  FileQuestion,
  Globe2,
  MessageSquareText,
  Search,
  ShieldCheck,
  Target,
  Trophy,
  Wrench,
} from "lucide-react";

const siNavGroups = [
  {
    group: "SEO",
    items: [
      {
        href: "/si/seo",
        title: "SEO 總覽",
        desc: "網站健康與搜尋表現",
        icon: Search,
      },
      {
        href: "/si/seo?tab=keywords",
        title: "關鍵字機會",
        desc: "推進、防守與觀察字",
        icon: Target,
      },
      {
        href: "/si/seo?tab=technical",
        title: "技術與 AI 建議",
        desc: "問題與優先處理建議",
        icon: Wrench,
      },
    ],
  },
  {
    group: "AEO",
    items: [
      {
        href: "/si/aeo",
        title: "問答總覽",
        desc: "答案引擎優化狀態",
        icon: Bot,
      },
      {
        href: "/si/aeo?tab=faq",
        title: "常見問題",
        desc: "使用者常問與追問",
        icon: FileQuestion,
      },
      {
        href: "/si/aeo?tab=snippet",
        title: "精選摘要",
        desc: "可被直接引用的答案",
        icon: MessageSquareText,
      },
    ],
  },
  {
    group: "GEO",
    items: [
      {
        href: "/si/geo",
        title: "GEO 總覽",
        desc: "生成式搜尋曝光",
        icon: Globe2,
      },
      {
        href: "/si/geo?tab=citations",
        title: "AI 引用監測",
        desc: "模型回答中的引用",
        icon: ShieldCheck,
      },
      {
        href: "/si/geo?tab=visibility",
        title: "品牌曝光",
        desc: "品牌被提及的情境",
        icon: Trophy,
      },
    ],
  },
];

function splitHref(href: string) {
  const [path, query = ""] = href.split("?");
  const params = new URLSearchParams(query);

  return {
    path,
    tab: params.get("tab") || "overview",
  };
}

export default function SiNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab") || "overview";

  return (
    <aside className="border-b border-slate-200 bg-white lg:min-h-screen lg:w-72 lg:shrink-0 lg:border-b-0 lg:border-r">
      <div className="px-4 py-5 sm:px-6 lg:sticky lg:top-0 lg:max-h-screen lg:overflow-y-auto lg:px-5">
        <div className="space-y-5">
          {siNavGroups.map((group) => (
            <div key={group.group}>
              <div className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-slate-400">
                {group.group}
              </div>

              <nav className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const target = splitHref(item.href);
                  const active =
                    pathname === target.path && currentTab === target.tab;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={[
                        "flex items-start gap-3 rounded-lg border px-4 py-3 transition",
                        active
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
                      ].join(" ")}
                    >
                      <Icon
                        className={[
                          "mt-0.5 h-[18px] w-[18px]",
                          active ? "text-white" : "text-slate-500",
                        ].join(" ")}
                      />
                      <span>
                        <span className="block text-sm font-bold">
                          {item.title}
                        </span>
                        <span
                          className={[
                            "mt-1 block text-xs leading-5",
                            active ? "text-slate-200" : "text-slate-500",
                          ].join(" ")}
                        >
                          {item.desc}
                        </span>
                      </span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
