import Image from "next/image";

import { SectionHeading } from "@/components/sections/section-heading";

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <section className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <SectionHeading
            eyebrow="About La Maison Homes"
            title="A boutique short-stay brand shaped by curation, hospitality, and operational discipline."
            description="La Maison Homes curates and manages distinctive short stays in Melbourne, combining hotel-grade operations with the warmth of beautifully selected homes."
          />
          <div className="space-y-4 text-sm leading-7 text-stone-600">
            <p>La Maison Homes was built on a conviction that short-stay accommodation can be something better &mdash; not just a bed in someone&apos;s apartment, but a considered space managed to a standard that guests can trust and owners can rely on.</p>
            <p>Every property in our collection is selected for its character, its location, and its readiness to deliver a consistent guest experience. We don&apos;t chase volume. We prioritise quality &mdash; in the homes we represent, the guests we host, and the owners we work with.</p>
            <p>Behind every stay is a structured operation: professional cleaning, hotel-grade linen, responsive communication, and a management team that treats each property as if it were their own. That&apos;s not a marketing promise &mdash; it&apos;s the model.</p>
          </div>
        </div>
        <div className="relative min-h-[480px] overflow-hidden rounded-[36px]">
          <Image src="/placeholders/team-founder.jpg" alt="Founder placeholder" fill className="object-cover" />
        </div>
      </section>

      <section className="mt-16 grid gap-6 lg:grid-cols-4">
        <div className="rounded-[28px] bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.04)]">
          <h2 className="text-lg font-medium text-stone-950">Curated, not collected</h2>
          <p className="mt-3 text-sm leading-6 text-stone-600">We don&apos;t take every property that comes through the door. We select homes that meet our presentation standard &mdash; thoughtful interiors, strong locations, and the kind of quality that guests return for.</p>
        </div>
        <div className="rounded-[28px] bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.04)]">
          <h2 className="text-lg font-medium text-stone-950">Hospitality with operational rigour</h2>
          <p className="mt-3 text-sm leading-6 text-stone-600">Warm guest experiences and dependable operations aren&apos;t in tension &mdash; they require each other. We run structured back-of-house processes so the front-of-house always feels effortless.</p>
        </div>
        <div className="rounded-[28px] bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.04)]">
          <h2 className="text-lg font-medium text-stone-950">Rooted in Melbourne</h2>
          <p className="mt-3 text-sm leading-6 text-stone-600">Melbourne is one of the world&apos;s most liveable cities for good reason &mdash; strong culture, excellent food, distinct neighbourhoods, and a guest demand that suits both short and extended stays. We know its rhythms well.</p>
        </div>
        <div className="rounded-[28px] bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.04)]">
          <h2 className="text-lg font-medium text-stone-950">Built from the ground up</h2>
          <p className="mt-3 text-sm leading-6 text-stone-600">La Maison Homes was founded on a simple belief: short-stay management should be professional, transparent, and genuinely worth it for both guests and owners. Everything we&apos;ve built since reflects that.</p>
        </div>
      </section>
    </div>
  );
}
