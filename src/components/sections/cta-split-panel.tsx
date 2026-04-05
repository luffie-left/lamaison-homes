import Link from "next/link";

export function CtaSplitPanel() {
  return (
    <section className="mx-auto grid max-w-7xl gap-6 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:px-8">
      <div className="rounded-[32px] bg-stone-950 p-8 text-stone-50 sm:p-10">
        <p className="text-xs uppercase tracking-[0.3em] text-stone-400">For guests</p>
        <h3 className="mt-4 font-serif text-3xl">Book direct with confidence.</h3>
        <p className="mt-4 max-w-md text-sm leading-7 text-stone-300">
          Handpicked stays for considered travellers, paired with responsive support and a calm, premium booking experience.
        </p>
        <Link href="/stays" className="mt-8 inline-flex rounded-full bg-stone-50 px-5 py-3 text-sm font-medium text-stone-950">
          Explore Stays
        </Link>
      </div>
      <div className="rounded-[32px] border border-black/5 bg-[#e8e0d5] p-8 sm:p-10">
        <p className="text-xs uppercase tracking-[0.3em] text-stone-500">For owners</p>
        <h3 className="mt-4 font-serif text-3xl text-stone-950">Stronger returns, without day-to-day management.</h3>
        <p className="mt-4 max-w-md text-sm leading-7 text-stone-700">
          Professional short-stay operations, thoughtful presentation, and transparent reporting for owners seeking a premium management partner.
        </p>
        <Link href="/host-with-us" className="mt-8 inline-flex rounded-full bg-stone-950 px-5 py-3 text-sm font-medium text-stone-50">
          See Management Services
        </Link>
      </div>
    </section>
  );
}
