import { SimpleForm } from "@/components/forms/simple-form";
import { SectionHeading } from "@/components/sections/section-heading";

export default function OwnerApplicationPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Owner application"
        title="A multi-step owner onboarding flow, scoped now and ready for phase-two implementation."
        description="Phase one uses a clear long-form placeholder block. Phase two upgrades this into a true wizard with uploads, step persistence, and validation by stage."
      />
      <div className="mt-10 space-y-6 rounded-[36px] bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.06)] sm:p-10">
        {[
          "Step 1 Contact",
          "Step 2 Property Basics",
          "Step 3 Current State",
          "Step 4 Goals",
          "Step 5 Uploads",
          "Step 6 Notes",
        ].map((step) => (
          <div key={step} className="rounded-[24px] bg-stone-50 p-5 text-sm text-stone-700">
            {step}
          </div>
        ))}
      </div>
      <div className="mt-8">
        <SimpleForm
          title="Owner onboarding placeholder"
          description="Ready to be replaced by the full multi-step wizard in phase two. Submission success should route to /thank-you?type=owner."
          fields={[
            { name: "fullName", label: "Full name", placeholder: "Your full name" },
            { name: "email", label: "Email", placeholder: "you@example.com", type: "email" },
            { name: "phone", label: "Phone", placeholder: "+61" },
            { name: "address", label: "Property address", placeholder: "Address" },
          ]}
          textarea={{ name: "notes", label: "Notes", placeholder: "Timeline to launch, access details, and special concerns." }}
          submitLabel="Start Application"
        />
      </div>
    </div>
  );
}
