import { SimpleForm } from "@/components/forms/simple-form";
import { SectionHeading } from "@/components/sections/section-heading";

export default function BookPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Book"
        title="A direct booking wrapper prepared for secure handoff."
        description="This page can route into Hostaway later via feature flag. For MVP it captures high-intent enquiries and preserves the premium booking tone."
        align="center"
      />
      <div className="mt-10">
        <SimpleForm
          title="Quick booking / enquiry"
          description="Connect this to property-specific context, UTM capture, and future booking handoff logic."
          fields={[
            { name: "name", label: "Name", placeholder: "Your name" },
            { name: "email", label: "Email", placeholder: "you@example.com", type: "email" },
            { name: "destination", label: "Destination", placeholder: "Melbourne" },
            { name: "dates", label: "Dates", placeholder: "Check-in / check-out" },
            { name: "guests", label: "Guests", placeholder: "2" },
          ]}
          textarea={{ name: "notes", label: "Notes", placeholder: "Preferred stay or special requests" }}
          submitLabel="Send Booking Enquiry"
        />
      </div>
    </div>
  );
}
