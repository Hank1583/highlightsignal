import type { ReactNode } from "react";

export default function SeoLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <main className="min-h-screen p-6 md:p-8">{children}</main>
    </div>
  );
}
