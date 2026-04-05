import { SectionHeading } from "@/components/sections/section-heading";
import { trustBadges } from "@/data/mock-data";

export default function TrustPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="Trust"
        title="A confidence architecture for guests and owners alike."
        description="This page carries the premium confidence language: curated standards, cleanliness, response time, local support, and secure booking pathways."
      />

      <div className="mt-10 flex flex-wrap gap-3">
        {trustBadges.map((badge) => (
          <span key={badge} className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm text-stone-700">
            {badge}
          </span>
        ))}
      </div>

      <div className="mt-10 grid gap-5 lg:grid-cols-2">
        {[
          "Our Selection Standard",
          "Home Readiness Checklist",
          "Guest Experience Standard",
          "Cleanliness Standard",
          "Response-Time Standard",
          "Booking Confidence",
          "Local Support",
          "Professional Management Note",
        ].map((item) => (
          <div key={item} className="rounded-[28px] bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.04)]">
            <h2 className="text-lg font-medium text-stone-950">{item}</h2>
            <p className="mt-3 text-sm leading-6 text-stone-600">Premium content placeholder designed to communicate calm confidence without copying competitor language.</p>
          </div>
        ))}
      </div>
    </div>
  );
}
