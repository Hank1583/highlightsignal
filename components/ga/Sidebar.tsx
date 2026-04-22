"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { gaNavItems } from "@/lib/ga/ga-nav";

export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <aside className="border-b border-slate-200 bg-white lg:min-h-screen lg:w-72 lg:shrink-0 lg:border-b-0 lg:border-r">
      <div className="px-4 py-5 sm:px-6 lg:sticky lg:top-0 lg:max-h-screen lg:overflow-y-auto lg:px-5">
        <div className="space-y-5">
          {gaNavItems.map((group) => (
            <div key={group.group}>
              <div className="mb-2 px-1 text-xs font-bold uppercase tracking-wider text-slate-400">
                {group.group}
              </div>

              <nav className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
                {group.items.map((item) => {
                  const active =
                    pathname === item.href ||
                    (item.href !== "/ga" && pathname.startsWith(`${item.href}/`));
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onNavigate}
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
                        <span className="block text-sm font-bold">{item.title}</span>
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
