import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Highlight Signal Auth",
  description: "Highlight Signal login and registration",
  robots: {
    index: false,
    follow: true,
  },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
