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
            <p>We are building beyond the feel of a simple short-stay listing site. The brand direction is editorial, calm, premium, and locally grounded — while the operating model remains rigorous and commercially effective.</p>
            <p>What makes us different is the balance: curated presentation, service-led guest experience, and structured owner management built to support consistency over time.</p>
            <p>Future vision includes carefully expanded destination coverage, deeper concierge experiences, and a stronger direct relationship with both guests and owners.</p>
          </div>
        </div>
        <div className="relative min-h-[480px] overflow-hidden rounded-[36px]">
          <Image src="/placeholders/team-founder.jpg" alt="Founder placeholder" fill className="object-cover" />
        </div>
      </section>

      <section className="mt-16 grid gap-6 lg:grid-cols-4">
        {[
          "Curated philosophy",
          "Operations + hospitality balance",
          "Melbourne roots",
          "Founder / team placeholder",
        ].map((item) => (
          <div key={item} className="rounded-[28px] bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.04)]">
            <h2 className="text-lg font-medium text-stone-950">{item}</h2>
            <p className="mt-3 text-sm leading-6 text-stone-600">Placeholder content block ready for final brand copy and proof assets.</p>
          </div>
        ))}
      </section>
    </div>
  );
}
