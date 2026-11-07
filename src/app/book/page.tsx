import { SimpleForm } from "@/components/forms/simple-form";
import { SectionHeading } from "@/components/sections/section-heading";

export const metadata = {
  title: "Book Your Melbourne Stay | Direct Booking",
  description:
    "Book your Melbourne stay direct with La Maison Homes. Skip the platform fees, get the best rate guaranteed, and enjoy secure PayPal payment with instant confirmation.",
};

export default function BookPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Book"
        title="Book your Melbourne stay"
        description="Skip the booking-platform fees and reserve direct with La Maison Homes — best rate guaranteed, secure PayPal payment, and instant confirmation."
        align="center"
      />
      <div className="mt-10">
        <SimpleForm
          title="Booking enquiry"
          description="Tell us about your stay and our team will confirm availability and your direct rate within 24 hours."
          fields={[
            { name: "name", label: "Name", placeholder: "Your name" },
            { name: "email", label: "Email", placeholder: "you@example.com", type: "email" },
            { name: "phone", label: "Phone *", placeholder: "+61 4xx xxx xxx", type: "tel", required: true },
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
