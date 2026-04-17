"use client";

import ProductSelect from "@/components/ProductSelect";
import UserMenu from "@/components/UserMenu";
import Image from "next/image";
import { useRouter } from "next/navigation";

type Props = {
  enabledProducts?: string[];
  user?: {
    name?: string;
    email?: string;
  };
};

export default function AppHeader({
  enabledProducts = ["dashboard"],
  user,
}: Props) {
  const router = useRouter();

  return (
    <header className="sticky top-0 z-40 h-16 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="flex h-full items-center justify-between px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-3 transition hover:opacity-80"
          >
            <Image
              src="/logo-hl.png"
              alt="Highlight Signal"
              width={36}
              height={36}
              className="rounded-lg"
            />

            <div className="hidden sm:block">
              <div className="text-base font-semibold text-slate-900">
                關鍵訊號
              </div>
              <div className="text-xs text-slate-500">Highlight Signal</div>
            </div>
          </button>

          <div className="h-6 w-px bg-slate-200" />

          <ProductSelect enabledProducts={enabledProducts} />
        </div>

        <UserMenu user={user} />
      </div>
    </header>
  );
}
