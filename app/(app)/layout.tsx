export const dynamic = "force-dynamic";

import AppHeader from "@/components/layout/AppHeader";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getJwtSecret } from "@/lib/jwtSecret";
import { isDemoEmail } from "@/lib/demo";
import { normalizeEnabledProducts } from "@/lib/products";
import { verifyAnyToken } from "@/lib/sessionToken";

type Session = {
  id: string;
  email: string;
  name: string;
  enabledProducts: string[];
  isDemo?: boolean;
};

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

async function getSession(): Promise<Session | null> {
  try {
    const cookieStore = await cookies();
    const tokens = cookieStore.getAll("token").map((cookie) => cookie.value);

    if (tokens.length === 0) {
      return null;
    }

    const secret = getJwtSecret();

    const payload = await verifyAnyToken(tokens, secret);

    if (!payload) {
      return null;
    }

    const session = {
      id: String(payload.id || ""),
      email: String(payload.email || ""),
      name: String(payload.name || ""),
      enabledProducts: normalizeEnabledProducts(payload.enabledProducts),
      isDemo: Boolean(payload.isDemo) || isDemoEmail(payload.email),
    };

    // console.log("decoded payload =", payload);
    // console.log("session in layout =", session);

    return session;
  } catch {
    return null;
  }
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/auth/login");
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <AppHeader
        enabledProducts={session.enabledProducts}
        user={{
          name: session.name,
          email: session.email,
          isDemo: session.isDemo,
        }}
      />
      <main>{children}</main>
    </div>
  );
}
