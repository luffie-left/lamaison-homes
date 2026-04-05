import { SectionHeading } from "@/components/sections/section-heading";
import { faqItems } from "@/data/mock-data";

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="FAQ"
        title="Answers for guests, owners, bookings, and property requirements."
        description="Tabbed UI can be layered in later; MVP presents content in grouped sections for speed and clarity."
      />

      <div className="mt-10 space-y-10">
        {Object.entries(faqItems).map(([group, items]) => (
          <section key={group} className="rounded-[32px] bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.05)]">
            <h2 className="text-sm uppercase tracking-[0.28em] text-stone-500">{group}</h2>
            <div className="mt-6 space-y-5">
              {items.map((item) => (
                <div key={item.question} className="rounded-[24px] bg-stone-50 p-5">
                  <h3 className="text-lg font-medium text-stone-950">{item.question}</h3>
                  <p className="mt-2 text-sm leading-6 text-stone-600">{item.answer}</p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
