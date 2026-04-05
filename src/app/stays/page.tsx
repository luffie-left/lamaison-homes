import { PropertyCard } from "@/components/cards/property-card";
import { SectionHeading } from "@/components/sections/section-heading";
import type { Property } from "@/data/mock-data";

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

async function getStays(): Promise<Property[]> {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const res = await fetch(`${appUrl}/api/stays`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.stays as Property[]) ?? [];
  } catch {
    return [];
  }
}

export default async function StaysPage() {
  const stays = await getStays();

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow="The collection"
        title="Handpicked stays for considered travellers."
        description={`${stays.length > 0 ? `${stays.length} properties across Melbourne` : "Curated Melbourne stays with hotel-grade care."}`}
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
        <div>
          {stays.length === 0 ? (
            <div className="rounded-[28px] bg-white p-8 text-center shadow-[0_20px_60px_rgba(15,23,42,0.04)]">
              <p className="text-stone-500">No stays available at this time. Please check back soon.</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {stays.map((property) => (
                <PropertyCard key={property.slug} property={property} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
