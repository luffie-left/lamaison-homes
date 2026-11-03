import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Coming soon",
  robots: { index: false, follow: false },
};

export default function ComingSoonPage() {
  return (
    <div className="relative mx-auto flex max-w-2xl flex-col items-center px-6 py-24 text-center sm:py-32">
      <p className="mb-4 text-xs font-medium uppercase tracking-[0.35em] text-stone-500">
        Melbourne · Premium Stays
      </p>

      <h1 className="font-serif text-4xl leading-tight tracking-tight text-stone-900 sm:text-5xl">
        We&rsquo;re putting the finishing touches on our new home.
      </h1>

      <p className="mt-6 max-w-md text-base leading-relaxed text-stone-600">
        Our collection of premium Melbourne stays is being carefully prepared.
        We&rsquo;ll be welcoming guests again very soon.
      </p>

      <div className="mt-12 w-full max-w-sm border-t border-stone-200 pt-8 text-sm text-stone-600">
        <p>
          Questions in the meantime?{" "}
          <a
            href="mailto:stay@lamaisonhomes.com.au"
            className="text-stone-900 underline decoration-stone-400 underline-offset-4 transition-colors hover:text-stone-600"
          >
            stay@lamaisonhomes.com.au
          </a>
        </p>
      </div>
    </div>
  );
}
