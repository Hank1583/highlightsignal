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
    group: "搜尋健康",
    items: [
      {
        href: "/si/seo",
        title: "搜尋健康總覽",
        desc: "判斷、建議與 SEO 證據",
        icon: Search,
      },
      {
        href: "/si/seo?tab=keywords",
        title: "搜尋機會",
        desc: "整理排名、曝光與內容缺口",
        icon: Target,
      },
      {
        href: "/si/seo?tab=technical",
        title: "網站技術健康",
        desc: "結構、速度與可索引性證據",
        icon: Wrench,
      },
    ],
  },
  {
    group: "AI 回答能力",
    items: [
      {
        href: "/si/aeo",
        title: "AI 回答能力總覽",
        desc: "判斷內容是否容易被 AI 回答",
        icon: Bot,
      },
      {
        href: "/si/aeo?tab=faq",
        title: "常見問題覆蓋",
        desc: "建立可被直接回答的內容結構",
        icon: FileQuestion,
      },
      {
        href: "/si/aeo?tab=snippet",
        title: "可摘用答案",
        desc: "優化段落、清單與問答格式",
        icon: MessageSquareText,
      },
    ],
  },
  {
    group: "AI 能見度",
    items: [
      {
        href: "/si/geo",
        title: "AI 能見度總覽",
        desc: "判斷品牌是否被 AI 看見與引用",
        icon: Globe2,
      },
      {
        href: "/si/geo?tab=citations",
        title: "AI 引用證據",
        desc: "追蹤可被 AI 回答引用的內容基礎",
        icon: ShieldCheck,
      },
      {
        href: "/si/geo?tab=visibility",
        title: "品牌能見度",
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
            搜尋與 AI 成效
          </div>
          <div className="mt-1 text-sm font-black text-slate-900">
            Evidence workspace
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
                        "flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 transition",
                        active
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
                      ].join(" ")}
                    >
                      <Icon
                        className={[
                          "mt-0.5 h-[18px] w-[18px] shrink-0",
                          active ? "text-white" : "text-slate-500",
                        ].join(" ")}
                      />
                      <span>
                        <span className="block text-sm font-semibold leading-tight">
                          {item.title}
                        </span>
                        <span
                          className={[
                            "mt-0.5 block text-xs leading-snug",
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
