import { PropertyCard } from "@/components/cards/property-card";
import { SectionHeading } from "@/components/sections/section-heading";
import { properties } from "@/data/mock-data";

const filters = [
  "Location",
  "Dates",
  "Guests",
  "Bedrooms",
  "Bathrooms",
  "Parking",
  "Pet-friendly",
  "Pool",
  "Balcony",
  "Work-friendly",
  "Family-friendly",
  "Luxury tier",
];

const sorts = ["Recommended", "Price low-high", "Price high-low", "Newest", "Best for families", "Best for business"];

export default function StaysPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="The collection"
        title="Handpicked stays for considered travellers."
        description="Editorial presentation, booking clarity, and a scalable listing framework prepared for future live rates and Hostaway sync."
      />
      <div className="mt-10 grid gap-10 lg:grid-cols-[280px_1fr]">
        <aside className="h-fit rounded-[30px] border border-black/5 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.04)]">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-stone-500">Filters</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {filters.map((filter) => (
                <button key={filter} className="rounded-full border border-black/10 px-4 py-2 text-sm text-stone-700">
                  {filter}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-8">
            <p className="text-xs uppercase tracking-[0.28em] text-stone-500">Sort</p>
            <div className="mt-4 space-y-2 text-sm text-stone-700">
              {sorts.map((sort) => (
                <div key={sort} className="rounded-2xl bg-stone-50 px-4 py-3">
                  {sort}
                </div>
              ))}
            </div>
          </div>
        </aside>
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {properties.map((property) => (
            <PropertyCard key={property.slug} property={property} />
          ))}
        </div>
      </div>
    </div>
  );
}
