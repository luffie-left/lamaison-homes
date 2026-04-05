import { SectionHeading } from "@/components/sections/section-heading";

const steps = [
  "Assessment",
  "Preparation",
  "Launch",
  "Ongoing Management",
];

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="How it works"
        title="A clear management process for owners, guests, and internal operations."
        description="This page should feel commercially credible and operationally disciplined — not generic hospitality copy."
      />

      <section className="mt-10 grid gap-5 lg:grid-cols-4">
        {steps.map((step, index) => (
          <div key={step} className="rounded-[30px] bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.04)]">
            <p className="text-xs uppercase tracking-[0.28em] text-stone-500">Step {index + 1}</p>
            <h2 className="mt-4 text-2xl font-medium text-stone-950">{step}</h2>
            <p className="mt-3 text-sm leading-6 text-stone-600">Elegant horizontal timeline content can be expanded here with process diagrams and operational detail.</p>
          </div>
        ))}
      </section>

      <section className="mt-14 rounded-[36px] bg-[#e8e0d5] p-8 sm:p-10">
        <h3 className="font-serif text-3xl text-stone-950">Parallel swimlane structure</h3>
        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {[
            ["Guest journey", "Discovery, booking, arrival, stay support, and departure confidence."],
            ["Owner journey", "Assessment, onboarding, reporting, optimisation, and hands-off management."],
            ["Internal operations", "Pricing, guest communication, cleaning turnover, maintenance, and quality control."],
          ].map(([title, description]) => (
            <div key={title} className="rounded-[24px] bg-white px-5 py-5 text-sm leading-6 text-stone-700 shadow-[0_18px_45px_rgba(15,23,42,0.04)]">
              <p className="font-medium text-stone-950">{title}</p>
              <p className="mt-2">{description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
