"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, LayoutDashboard, Megaphone, Search } from "lucide-react";
import { type ProductKey } from "@/lib/products";

const products: {
  key: ProductKey;
  label: string;
  basePath: string;
  icon: typeof LayoutDashboard;
}[] = [
  { key: "dashboard", label: "決策中心", basePath: "/dashboard", icon: LayoutDashboard },
  { key: "ga", label: "網站成效", basePath: "/ga", icon: BarChart3 },
  { key: "si", label: "搜尋與 AI 成效", basePath: "/si", icon: Search },
  { key: "ads", label: "廣告成效", basePath: "/ads", icon: Megaphone },
];

export default function ProductSelect() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const availableProducts = useMemo(() => {
    return products;
  }, []);

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
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`切換產品，目前為 ${current.label}`}
        className="flex min-h-11 items-center gap-2 rounded-2xl px-3 py-2.5 transition hover:bg-slate-100 sm:gap-3 sm:px-4"
      >
        <CurrentIcon className="h-5 w-5 text-slate-600" />
        <span className="hidden text-base font-semibold text-slate-800 md:inline">
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
        <div role="menu" className="absolute left-0 z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="p-2">
            {availableProducts.map((product) => {
              const isActive = product.key === current.key;
              const Icon = product.icon;

              return (
                <button
                  type="button"
                  role="menuitem"
                  key={product.key}
                  onClick={() => {
                    // ADS（/ads）是獨立的 adfusion worker，必須硬導航跨過去；
                    // 直接到 /ads/（帶斜線）避免多一次 308 轉址。
                    // 其餘產品都在本 worker，用 SPA router.push。
                    if (product.key === "ads") {
                      window.location.href = "/ads/";
                    } else {
                      router.push(product.basePath);
                    }
                    setOpen(false);
                  }}
                  className={[
                    "flex min-h-12 w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition",
                    isActive ? "bg-slate-100" : "hover:bg-slate-100",
                  ].join(" ")}
                >
                  <Icon className="h-5 w-5 text-slate-500" />
                  <span className="text-base font-medium text-slate-800">
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
