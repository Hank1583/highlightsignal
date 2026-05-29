import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#f6f8f5] px-4 py-16 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm font-bold text-emerald-700 hover:text-zinc-950">
          Highlight Signal
        </Link>
        <h1 className="mt-6 text-3xl font-black tracking-normal sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-4 text-sm font-semibold text-zinc-500">Last updated: May 12, 2026</p>

        <div className="mt-10 space-y-8 text-base leading-7 text-zinc-700">
          <section>
            <h2 className="text-xl font-black text-zinc-950">Information we collect</h2>
            <p className="mt-3">
              Highlight Signal may collect account information, website URLs, analytics data,
              search performance data, and messages you send to us when you request support,
              demos, integrations, or collaboration.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-zinc-950">How we use information</h2>
            <p className="mt-3">
              We use information to provide analytics, SEO intelligence, AI visibility insights,
              product support, security, service improvement, and communication related to
              Highlight Signal.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-zinc-950">Contact</h2>
            <p className="mt-3">
              For privacy questions, contact{" "}
              <a href="mailto:hank.highlight@gmail.com" className="font-bold text-zinc-950">
                hank.highlight@gmail.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
