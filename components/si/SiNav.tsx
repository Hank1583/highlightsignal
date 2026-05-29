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
        desc: "網站健康度、索引狀態與搜尋成效",
        icon: Search,
      },
      {
        href: "/si/seo?tab=keywords",
        title: "關鍵字機會",
        desc: "整理排名、曝光與內容缺口",
        icon: Target,
      },
      {
        href: "/si/seo?tab=technical",
        title: "技術 SEO",
        desc: "檢查結構、速度與可爬取問題",
        icon: Wrench,
      },
    ],
  },
  {
    group: "AEO",
    items: [
      {
        href: "/si/aeo",
        title: "AEO 總覽",
        desc: "提高被答案引擎引用的機會",
        icon: Bot,
      },
      {
        href: "/si/aeo?tab=faq",
        title: "FAQ 策略",
        desc: "建立可被直接回答的內容結構",
        icon: FileQuestion,
      },
      {
        href: "/si/aeo?tab=snippet",
        title: "精選摘要",
        desc: "優化段落、清單與問答格式",
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
        desc: "檢視品牌在生成式搜尋中的能見度",
        icon: Globe2,
      },
      {
        href: "/si/geo?tab=citations",
        title: "AI 引用訊號",
        desc: "追蹤可被 AI 回答引用的內容基礎",
        icon: ShieldCheck,
      },
      {
        href: "/si/geo?tab=visibility",
        title: "AI 能見度",
        desc: "比較品牌、主題與答案覆蓋度",
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
        <div className="mb-5 px-1">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Search Intelligence
          </div>
          <div className="mt-1 text-sm font-black text-slate-900">
            SEO / AEO / GEO
          </div>
        </div>

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
