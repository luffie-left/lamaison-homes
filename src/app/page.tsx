import Image from "next/image";
import Link from "next/link";
import {
  BadgeDollarSign,
  Building2,
  ConciergeBell,
  Headset,
  LineChart,
  MapPinHouse,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";

import { PropertyCard } from "@/components/cards/property-card";
import { TestimonialCard } from "@/components/cards/testimonial-card";
import { IconPromiseCard } from "@/components/cards/icon-promise-card";
import { EditorialCard } from "@/components/cards/editorial-card";
import { CtaSplitPanel } from "@/components/sections/cta-split-panel";
import { SectionHeading } from "@/components/sections/section-heading";
import { SearchModule } from "@/components/forms/search-module";
import { conciergeServices, journalPosts, properties, testimonials } from "@/data/mock-data";

const guestPromiseCards = [
  {
    title: "Curated Homes",
    description: "Only carefully selected stays that meet our quality, design, and guest-readiness standards.",
    icon: MapPinHouse,
  },
  {
    title: "Book Direct with Confidence",
    description: "Clear communication, strong standards, and a booking experience shaped around trust.",
    icon: ShieldCheck,
  },
  {
    title: "Local Guest Support",
    description: "Melbourne-based hospitality thinking, with concierge support when it matters.",
    icon: ConciergeBell,
  },
  {
    title: "Seamless Stay Standards",
    description: "Professionally managed homes designed for comfort, consistency, and calm arrival experiences.",
    icon: Sparkles,
  },
];

const ownerPromiseCards = [
  {
    title: "Dynamic Pricing",
    description: "Revenue strategy designed to improve yield while protecting presentation and positioning.",
    icon: LineChart,
  },
  {
    title: "24/7 Guest Communication",
    description: "Guest messaging handled professionally so owners are not carrying day-to-day booking pressure.",
    icon: Headset,
  },
  {
    title: "Cleaning & Maintenance Coordination",
    description: "Operational oversight across turnovers, standards, and maintenance issues.",
    icon: Wrench,
  },
  {
    title: "Monthly Reporting",
    description: "Clear owner visibility across performance, operations, and ongoing optimisation.",
    icon: BadgeDollarSign,
  },
];

const hostServices = [
  "Listing setup",
  "Photography coordination",
  "Pricing optimisation",
  "Channel distribution",
  "Guest messaging",
  "Check-in coordination",
  "Cleaning turnover",
  "Maintenance",
  "Owner reporting",
  "Furnishing / styling advisory",
];

const ownerSteps = ["Consult", "Onboard", "Launch", "Manage", "Report / optimise"];

export default function Home() {
  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Image src="/placeholders/home-hero-fallback.jpg" alt="La Maison Homes hero" fill className="object-cover" priority />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,18,16,0.42),rgba(20,18,16,0.76))]" />
        </div>
        <div className="relative mx-auto flex min-h-[82vh] max-w-7xl flex-col justify-center px-4 py-24 sm:px-6 lg:px-8">
          <div className="max-w-3xl space-y-8 text-stone-50">
            <p className="text-xs uppercase tracking-[0.34em] text-stone-200">Curated stays in Melbourne</p>
            <h1 className="font-serif text-5xl leading-tight sm:text-6xl">
              Curated Melbourne stays with hotel-grade care.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-stone-200">
              Beautifully selected homes. Seamless guest stays. Professional short-stay management.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/stays" className="rounded-full bg-stone-50 px-6 py-3 text-sm font-medium text-stone-950">
                Explore Stays
              </Link>
              <Link href="/book" className="rounded-full border border-stone-200/40 px-6 py-3 text-sm font-medium text-stone-50">
                Book a Stay
              </Link>
              <Link href="/host-with-us" className="self-center text-sm font-medium text-stone-100 underline-offset-4 hover:underline">
                List Your Property
              </Link>
            </div>
            <SearchModule />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="For guests"
          title="Why guests book with La Maison Homes"
          description="A guest-first promise strip that keeps the opening journey clear, premium, and conversion-led."
        />
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {guestPromiseCards.map((card) => (
            <IconPromiseCard key={card.title} {...card} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-6">
          <SectionHeading
            eyebrow="Featured stays"
            title="Handpicked stays for considered travellers."
            description="A curated collection that feels premium, clear, and easy to trust from the first browse."
          />
          <Link href="/stays" className="hidden text-sm font-medium text-stone-700 lg:block">
            View All Stays
          </Link>
        </div>
        <div className="mt-10 grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
          {properties.slice(0, 4).map((property) => (
            <PropertyCard key={property.slug} property={property} />
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
        <div className="relative min-h-[460px] overflow-hidden rounded-[36px]">
          <Image src="/placeholders/melbourne-neighbourhood.jpg" alt="Why guests book with La Maison Homes" fill className="object-cover" />
        </div>
        <div className="flex items-center">
          <div className="space-y-6">
            <SectionHeading
              eyebrow="Why book with us"
              title="Selected for comfort, character, and consistency."
              description="The guest experience should feel calm, elevated, and dependable — from first browse through to check-out."
            />
            <ul className="space-y-4 text-sm leading-7 text-stone-700">
              {[
                "Carefully selected homes",
                "Design-led interiors with practical comfort",
                "Professionally managed standards",
                "Responsive support before and during the stay",
                "Book direct with confidence",
              ].map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8">
        <div className="space-y-5">
          <SectionHeading
            eyebrow="Concierge"
            title="A more considered stay, before arrival and throughout."
            description="Premium support and thoughtful extras that elevate the guest journey without adding clutter."
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {conciergeServices.map((service) => (
              <div key={service} className="rounded-2xl bg-white px-4 py-3 text-sm text-stone-700 shadow-[0_18px_45px_rgba(15,23,42,0.04)]">
                {service}
              </div>
            ))}
          </div>
          <Link href="/concierge" className="inline-flex rounded-full border border-stone-950 px-5 py-3 text-sm font-medium text-stone-950">
            Ask Concierge
          </Link>
        </div>
        <div className="relative min-h-[420px] overflow-hidden rounded-[36px]">
          <Image src="/placeholders/concierge-dining.jpg" alt="Concierge experience" fill className="object-cover" />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="rounded-[36px] bg-stone-950 p-8 text-stone-50 sm:p-10 lg:p-12">
          <p className="text-xs uppercase tracking-[0.3em] text-stone-400">For property owners</p>
          <h2 className="mt-4 max-w-3xl font-serif text-4xl leading-tight">
            Premium short-stay management for owners who want stronger returns and less day-to-day involvement.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-stone-300">
            A clear transition into the owner journey: hotel-grade operations, structured reporting, and beautifully presented homes managed end-to-end.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/host-with-us" className="rounded-full bg-stone-50 px-5 py-3 text-sm font-medium text-stone-950">
              Request an Assessment
            </Link>
            <Link href="/owner-application" className="rounded-full border border-stone-400/30 px-5 py-3 text-sm font-medium text-stone-50">
              Full Owner Application
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="For owners"
          title="Why owners partner with La Maison Homes"
          description="A dedicated owner-only value layer — separated clearly from the guest flow."
        />
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {ownerPromiseCards.map((card) => (
            <IconPromiseCard key={card.title} {...card} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="grid gap-10 rounded-[36px] bg-[#e8e0d5] p-8 lg:grid-cols-[1fr_0.95fr] lg:p-12">
          <div className="space-y-5">
            <SectionHeading
              eyebrow="Why host with us"
              title="Earn more from your property, with less effort."
              description="We manage premium short stays end-to-end for owners who want stronger returns and hotel-grade operations."
            />
            <div className="grid gap-3 sm:grid-cols-2">
              {hostServices.map((service) => (
                <div key={service} className="rounded-2xl bg-white/80 px-4 py-3 text-sm text-stone-800">
                  {service}
                </div>
              ))}
            </div>
            <Link href="/host-with-us" className="inline-flex rounded-full bg-stone-950 px-5 py-3 text-sm font-medium text-stone-50">
              See Management Services
            </Link>
          </div>
          <div className="relative min-h-[360px] overflow-hidden rounded-[30px]">
            <Image src="/placeholders/hosting-owner-hero.jpg" alt="Host with us" fill className="object-cover" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="How it works"
          title="A clear management process from assessment through optimisation."
          description="Operational clarity reduces owner friction and strengthens trust before enquiry."
        />
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
          {ownerSteps.map((step, index) => (
            <div key={step} className="rounded-[28px] bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.04)]">
              <p className="text-xs uppercase tracking-[0.28em] text-stone-500">Step {index + 1}</p>
              <h3 className="mt-4 text-lg font-medium text-stone-950">{step}</h3>
              <p className="mt-2 text-sm leading-6 text-stone-600">Owner process content block designed to keep management setup and reporting feel structured and professional.</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Owner testimonials"
          title="Trusted by owners who want a more professional short-stay setup."
          description="Owner trust proof belongs inside the owner funnel, not blended into the guest journey."
        />
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          {testimonials.owners.map((item) => (
            <TestimonialCard key={item.author} {...item} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-6">
          <SectionHeading
            eyebrow="Melbourne guide"
            title="Stay locally, with a better sense of the city."
            description="Editorial content sits after both conversion paths are established, supporting locality, authority, and SEO."
          />
          <Link href="/destinations/melbourne" className="hidden text-sm font-medium text-stone-700 lg:block">
            Explore Melbourne
          </Link>
        </div>
        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {journalPosts.map((post) => (
            <EditorialCard
              key={post.slug}
              href={`/journal/${post.slug}`}
              image={post.image}
              category={post.category}
              title={post.title}
              excerpt={post.excerpt}
            />
          ))}
        </div>
      </section>

      <CtaSplitPanel />
    </div>
  );
}
