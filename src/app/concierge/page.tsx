import { SimpleForm } from "@/components/forms/simple-form";
import { SectionHeading } from "@/components/sections/section-heading";
import { conciergeServices } from "@/data/mock-data";

export default function ConciergePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Concierge"
        title="Premium support before you arrive and throughout your stay."
        description="Position concierge as service confidence and optional enhancement, from airport transfer to family extras and celebration setup."
      />

      <div className="mt-10 grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="grid gap-4 sm:grid-cols-2">
          {conciergeServices.map((service) => (
            <div key={service} className="rounded-[28px] bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.04)]">
              <h2 className="text-lg font-medium text-stone-950">{service}</h2>
              <p className="mt-2 text-sm leading-6 text-stone-600">Service placeholder ready for pricing, lead time, and delivery notes.</p>
            </div>
          ))}
        </div>
        <SimpleForm
          title="Ask concierge"
          description="Concierge request form prepared for Supabase capture, Resend notifications, spam protection, and UTM tracking."
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
