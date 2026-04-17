"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, LayoutDashboard, Megaphone, Search } from "lucide-react";

export type ProductKey = "dashboard" | "ga" | "seo" | "ads";

const products: {
  key: ProductKey;
  label: string;
  basePath: string;
  icon: typeof LayoutDashboard;
}[] = [
  { key: "dashboard", label: "Dashboard", basePath: "/dashboard", icon: LayoutDashboard },
  { key: "ga", label: "GA 數據分析", basePath: "/ga", icon: BarChart3 },
  { key: "seo", label: "SEO AI 優化", basePath: "/seo", icon: Search },
  { key: "ads", label: "ADS 廣告成效", basePath: "/ads", icon: Megaphone },
];

type Props = {
  enabledProducts?: string[];
};

export default function ProductSelect({ enabledProducts = ["dashboard"] }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const normalizedProducts = useMemo(() => {
    const validKeys = new Set(products.map((product) => product.key));
    const safeEnabledProducts = Array.isArray(enabledProducts)
      ? enabledProducts
      : ["dashboard"];

    return Array.from(
      new Set(
        ["dashboard", ...safeEnabledProducts].filter((key): key is ProductKey =>
          validKeys.has(key as ProductKey)
        )
      )
    );
  }, [enabledProducts]);

  const availableProducts = useMemo(() => {
    return products.filter((product) => normalizedProducts.includes(product.key));
  }, [normalizedProducts]);

  const current =
    availableProducts.find(
      (product) =>
        pathname === product.basePath || pathname.startsWith(`${product.basePath}/`)
    ) ||
    availableProducts[0] ||
    products[0];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, []);

  const CurrentIcon = current.icon;

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-3 rounded-2xl px-3 py-2 transition hover:bg-slate-100"
      >
        <CurrentIcon className="h-5 w-5 text-slate-600" />
        <span className="text-sm font-semibold text-slate-800">
          {current.label}
        </span>
        <svg
          className="h-4 w-4 text-slate-500"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="p-2">
            {availableProducts.map((product) => {
              const isActive = product.key === current.key;
              const Icon = product.icon;

              return (
                <button
                  type="button"
                  key={product.key}
                  onClick={() => {
                    router.push(product.basePath);
                    setOpen(false);
                  }}
                  className={[
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition",
                    isActive ? "bg-slate-100" : "hover:bg-slate-100",
                  ].join(" ")}
                >
                  <Icon className="h-5 w-5 text-slate-500" />
                  <span className="text-sm font-medium text-slate-800">
                    {product.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
