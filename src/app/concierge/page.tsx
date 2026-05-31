import { SimpleForm } from "@/components/forms/simple-form";
import { SectionHeading } from "@/components/sections/section-heading";
import { conciergeServices } from "@/data/mock-data";

export default function ConciergePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Concierge"
        title="Personal service before you arrive and throughout your stay."
        description="Our concierge team handles the details so your stay feels effortless. From airport transfers to celebration setup &mdash; just ask, and we&apos;ll take care of it."
      />

      <div className="mt-10 grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { name: "Airport transfer", description: "Seamless arrival and departure transfers arranged before you land. Private vehicles, set to your flight time." },
            { name: "Mid-stay cleaning", description: "Fresh linen, a full tidy, and restocked essentials during longer stays. Arranged around your schedule." },
            { name: "Baby equipment", description: "Cot, high chair, bath, pram, or whatever you need for travelling with small children &mdash; sourced and set up before you arrive." },
            { name: "Romantic setup", description: "Flowers, candles, champagne, or a fully styled evening in. Tell us what you&apos;re celebrating and we&apos;ll handle the rest." },
            { name: "Corporate stay support", description: "Grocery pre-stock, extended desk setup, additional workspace equipment, or business essentials ready on arrival." },
            { name: "Local recommendations", description: "A curated shortlist of restaurants, cafés, experiences, and services in your neighbourhood &mdash; selected to suit your stay." },
          ].map((service) => (
            <div key={service.name} className="rounded-[28px] bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.04)]">
              <h2 className="text-lg font-medium text-stone-950">{service.name}</h2>
              <p className="mt-2 text-sm leading-6 text-stone-600">{service.description}</p>
            </div>
          ))}
        </div>
        <SimpleForm
          title="Request concierge"
          description="Let us know what you need. Our team responds within a few hours and will confirm details directly. Pre-arrival requests are always welcome."
          fields={[
            { name: "name", label: "Name", placeholder: "Your name" },
            { name: "email", label: "Email", placeholder: "you@example.com", type: "email" },
            { name: "bookingReference", label: "Booking reference", placeholder: "Optional" },
            { name: "stayDates", label: "Stay dates", placeholder: "e.g. 14–17 April" },
            { name: "service", label: "Service requested", placeholder: "Airport transfer" },
          ]}
          textarea={{ name: "notes", label: "Notes", placeholder: "Tell us what you need." }}
        />
      </div>
    </div>
  );
}
