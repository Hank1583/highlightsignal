import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#f6f8f5] px-4 py-16 text-zinc-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm font-bold text-emerald-700 hover:text-zinc-950">
          Highlight Signal
        </Link>
        <h1 className="mt-6 text-3xl font-black tracking-normal sm:text-4xl">
          Terms of Service
        </h1>
        <p className="mt-4 text-sm font-semibold text-zinc-500">Last updated: May 12, 2026</p>

        <div className="mt-10 space-y-8 text-base leading-7 text-zinc-700">
          <section>
            <h2 className="text-xl font-black text-zinc-950">Use of the service</h2>
            <p className="mt-3">
              Highlight Signal provides analytics, SEO intelligence, AEO, and GEO tools for
              business decision support. You are responsible for the sites, data sources, and
              content you connect to the service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-zinc-950">Availability and accuracy</h2>
            <p className="mt-3">
              We work to keep insights useful and reliable, but analytics, search, and AI
              visibility data can change over time. Recommendations should be reviewed before
              being used for business, legal, or technical decisions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-black text-zinc-950">Contact</h2>
            <p className="mt-3">
              For questions about these terms, contact{" "}
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
