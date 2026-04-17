"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  user?: {
    name?: string;
    email?: string;
  };
};

export default function UserMenu({ user }: Props) {
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement>(null);

  const safeUser = {
    name: user?.name || "User",
    email: user?.email || "",
  };

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

  const handleLogout = async () => {
    try {
      setLoggingOut(true);

      document.cookie =
        "token=; Path=/; Max-Age=0; SameSite=Lax" +
        (window.location.protocol === "https:" ? "; Secure" : "");

      router.replace("/auth/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
      setOpen(false);
    }
  };

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-3 rounded-2xl px-3 py-2 transition hover:bg-slate-100"
      >
        <div className="hidden text-right leading-tight sm:block">
          <div className="text-sm font-semibold text-slate-800">
            {safeUser.name}
          </div>
          <div className="text-xs text-slate-500">{safeUser.email}</div>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white shadow-sm">
          {(safeUser.name?.[0] || "U").toUpperCase()}
        </div>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 px-4 py-3">
            <div className="text-sm font-semibold text-slate-900">
              {safeUser.name}
            </div>
            <div className="text-xs text-slate-500">{safeUser.email}</div>
          </div>

          <div className="py-2 text-sm">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                router.push("/account");
              }}
              className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50"
            >
              帳號與方案
            </button>

            <div className="my-2 border-t border-slate-100" />

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              {loggingOut ? "登出中..." : "登出"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
