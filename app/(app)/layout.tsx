export const runtime = "edge";
export const dynamic = "force-dynamic";

import AppHeader from "@/components/layout/AppHeader";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { redirect } from "next/navigation";

type Session = {
  id: string;
  email: string;
  name: string;
  enabledProducts: string[];
};

async function getSession(): Promise<Session | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      console.log("No token cookie found");
      return null;
    }

    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || "dev-secret-change-me"
    );

    const { payload } = await jwtVerify(token, secret);

    const session = {
      id: String(payload.id || ""),
      email: String(payload.email || ""),
      name: String(payload.name || ""),
      enabledProducts: Array.isArray(payload.enabledProducts)
        ? payload.enabledProducts.map(String)
        : ["dashboard"],
    };

    // console.log("decoded payload =", payload);
    // console.log("session in layout =", session);

    return session;
  } catch (error) {
    console.log("getSession verify failed =", error);
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
        }}
      />
      <main>{children}</main>
    </div>
  );
}
