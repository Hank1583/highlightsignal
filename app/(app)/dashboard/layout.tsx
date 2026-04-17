import type { ReactNode } from "react";

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <section className="min-w-0">
      <div className="mx-auto max-w-7xl p-6 lg:p-8">{children}</div>
    </section>
  );
}
