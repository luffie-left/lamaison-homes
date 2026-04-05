import Link from "next/link";

import { ServiceCard } from "@/components/cards/service-card";
import { SimpleForm } from "@/components/forms/simple-form";
import { SectionHeading } from "@/components/sections/section-heading";

const services = [
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

const audiences = [
  "Investors",
  "Second-home owners",
  "Relocated owners",
  "Developers with furnished units",
  "Premium apartment owners",
];

export default function HostWithUsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <section className="grid gap-10 rounded-[40px] bg-[#e8e0d5] p-8 lg:grid-cols-[1.1fr_0.9fr] lg:p-12">
        <div className="space-y-6">
          <p className="text-xs uppercase tracking-[0.3em] text-stone-500">Host with us</p>
          <h1 className="font-serif text-5xl leading-tight text-stone-950">Earn more from your property, with less effort.</h1>
          <p className="max-w-2xl text-lg leading-8 text-stone-700">
            We manage premium short stays end-to-end for owners who want stronger returns and hotel-grade operations.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              "Revenue optimisation",
              "24/7 guest communication",
              "Cleaning + maintenance coordination",
              "Monthly reporting",
            ].map((item) => (
              <div key={item} className="rounded-[24px] bg-white px-5 py-4 text-sm text-stone-800 shadow-[0_18px_45px_rgba(15,23,42,0.04)]">
                {item}
              </div>
            ))}
          </div>
        </div>

        <SimpleForm
          title="Request an assessment"
          description="A short owner lead form designed to convert without overwhelming first-touch enquiries."
          submitLabel="Request an Assessment"
          fields={[
            { name: "name", label: "Name", placeholder: "Your name" },
            { name: "email", label: "Email", placeholder: "you@example.com", type: "email" },
            { name: "phone", label: "Phone", placeholder: "+61" },
            { name: "suburb", label: "Property suburb", placeholder: "South Yarra" },
            { name: "type", label: "Property type", placeholder: "Apartment" },
            { name: "bedrooms", label: "Bedrooms", placeholder: "2" },
            { name: "listed", label: "Currently listed?", placeholder: "Yes / No" },
          ]}
          textarea={{ name: "message", label: "Message", placeholder: "Tell us about your property and goals." }}
        />
      </section>

      <section className="py-20">
        <SectionHeading eyebrow="Services" title="Management designed for premium presentation and dependable operations." />
        <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
          {services.map((service) => (
            <ServiceCard key={service} title={service} description="Structured delivery built to improve owner confidence and guest consistency." />
          ))}
        </div>
      </section>

      <section className="grid gap-8 rounded-[36px] bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.05)] lg:grid-cols-3">
        {[
          ["Consult", "Understand property fit, positioning, and commercial potential."],
          ["Onboard", "Prepare listing assets, standards, and operational setup."],
          ["Launch", "Go live with pricing, guest messaging, and brand-aligned presentation."],
          ["Manage", "Handle guest communication, cleaning, maintenance, and care."],
          ["Report / optimise", "Track performance and refine operations over time."],
        ].map(([title, description]) => (
          <div key={title} className="rounded-[24px] bg-stone-50 p-5">
            <h3 className="font-medium text-stone-950">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-stone-600">{description}</p>
          </div>
        ))}
      </section>

      <section className="py-20">
        <SectionHeading eyebrow="Who we work with" title="Owners seeking stronger returns without day-to-day management." />
        <div className="mt-8 flex flex-wrap gap-3">
          {audiences.map((item) => (
            <span key={item} className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm text-stone-700">
              {item}
            </span>
          ))}
        </div>
      </section>

      <section className="rounded-[36px] bg-stone-950 p-8 text-stone-50 sm:p-10">
        <p className="text-xs uppercase tracking-[0.3em] text-stone-400">Next steps</p>
        <h2 className="mt-4 font-serif text-3xl">Choose the right entry point.</h2>
        <div className="mt-8 flex flex-wrap gap-4">
          <Link href="/host-with-us" className="rounded-full bg-stone-50 px-5 py-3 text-sm font-medium text-stone-950">
            Request an Assessment
          </Link>
          <Link href="/owner-application" className="rounded-full border border-stone-400/30 px-5 py-3 text-sm font-medium text-stone-50">
            Full Owner Application
          </Link>
        </div>
      </section>
    </div>
  );
}
