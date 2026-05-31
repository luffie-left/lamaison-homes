import { SectionHeading } from "@/components/sections/section-heading";

const steps = [
  {
    title: "Consult",
    body: "We begin with a complimentary property assessment to understand your home, your goals, and how short-stay management fits your circumstances. We review location potential, interior presentation, and revenue expectations together.",
  },
  {
    title: "Onboard",
    body: "Our team coordinates professional photography, listing creation, and pricing strategy across all major booking channels. We handle setup across Airbnb, Booking.com, and direct booking platforms with optimised positioning.",
  },
  {
    title: "Launch",
    body: "Your property goes live with a tailored launch plan designed to build early visibility and strong initial reviews. We manage the first guest bookings with extra attention to establish momentum quickly.",
  },
  {
    title: "Manage",
    body: "Day-to-day operations are handled entirely by our team — guest communication, check-in coordination, cleaning scheduling, maintenance oversight, and 24/7 support. You stay informed without being involved.",
  },
  {
    title: "Report & Optimise",
    body: "Receive clear monthly reports covering occupancy, revenue, guest feedback, and operational updates. We continuously adjust pricing and presentation to maximise returns throughout the year.",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="How it works"
        title="A clear management process for owners, guests, and internal operations."
        description="From your first conversation to consistent monthly income — here's what to expect when you partner with La Maison."
      />

      <section className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-5">
        {steps.map((step, index) => (
          <div key={step.title} className="rounded-[30px] bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.04)]">
            <p className="text-xs uppercase tracking-[0.28em] text-stone-500">Step {index + 1}</p>
            <h2 className="mt-4 text-2xl font-medium text-stone-950">{step.title}</h2>
            <p className="mt-3 text-sm leading-6 text-stone-600">{step.body}</p>
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
