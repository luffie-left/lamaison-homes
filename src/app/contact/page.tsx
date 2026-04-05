import { SimpleForm } from "@/components/forms/simple-form";
import { SectionHeading } from "@/components/sections/section-heading";

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Contact"
        title="General enquiries, guest support, and partnership conversations."
        description="Contact cards, phone, WhatsApp, map placeholder, and partner enquiry blocks can all live here within a premium layout."
      />

      <div className="mt-10 grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-5 rounded-[32px] bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.06)]">
          {[
            ["Email", "hello@lamaisonhomes.com.au"],
            ["Phone", "+61 400 000 000"],
            ["WhatsApp", "Placeholder available"],
            ["Partnerships", "Owner and partner enquiries welcome"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-[24px] bg-stone-50 px-5 py-4">
              <p className="text-xs uppercase tracking-[0.24em] text-stone-500">{label}</p>
              <p className="mt-2 text-sm text-stone-800">{value}</p>
            </div>
          ))}
        </div>

        <SimpleForm
          title="Send an enquiry"
          description="All forms are structured to support validation, spam protection, hidden UTM fields, and notification handling in the final implementation."
          fields={[
            { name: "name", label: "Name", placeholder: "Your name" },
            { name: "email", label: "Email", placeholder: "you@example.com", type: "email" },
            { name: "phone", label: "Phone", placeholder: "+61" },
            { name: "type", label: "Enquiry type", placeholder: "Guest / Owner / Partner" },
          ]}
          textarea={{ name: "message", label: "Message", placeholder: "How can we help?" }}
        />
      </div>
    </div>
  );
}
