import type { ReactNode } from "react";

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <section className="min-w-0">
      <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:px-8 lg:py-6">{children}</div>
    </section>
  );
}
