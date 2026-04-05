import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PropertyCard } from "@/components/cards/property-card";
import { SectionHeading } from "@/components/sections/section-heading";
import { properties } from "@/data/mock-data";
import { formatCurrency, kebabToTitle } from "@/lib/utils";

export function generateStaticParams() {
  return properties.map((property) => ({ slug: property.slug }));
}

export default async function PropertyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const property = properties.find((item) => item.slug === slug);

  if (!property) {
    notFound();
  }

  const similar = properties.filter((item) => item.slug !== slug).slice(0, 3);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[1.4fr_0.6fr]">
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
            <div className="relative min-h-[460px] overflow-hidden rounded-[36px]">
              <Image src={property.gallery[0]} alt={property.title} fill className="object-cover" />
            </div>
            <div className="grid gap-4">
              {property.gallery.slice(1).map((image) => (
                <div key={image} className="relative min-h-[220px] overflow-hidden rounded-[28px]">
                  <Image src={image} alt={property.title} fill className="object-cover" />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6 rounded-[36px] bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.06)]">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.3em] text-stone-500">{property.suburb}, {property.city}</p>
              <h1 className="font-serif text-4xl text-stone-950">{property.title}</h1>
              <p className="text-base leading-7 text-stone-600">{property.shortTagline}</p>
              <div className="flex flex-wrap gap-3 text-sm text-stone-500">
                <span>{property.sleeps} guests</span>
                <span>•</span>
                <span>{property.bedrooms} bedrooms</span>
                <span>•</span>
                <span>{property.bathrooms} bathrooms</span>
                <span>•</span>
                <span>{property.parking} parking</span>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h2 className="text-lg font-medium text-stone-950">Why guests love this home</h2>
                <ul className="mt-3 space-y-2 text-sm leading-7 text-stone-600">
                  <li>• Selected for comfort, character, and consistency</li>
                  <li>• Managed to a professional short-stay standard</li>
                  <li>• Designed for stays you can book with confidence</li>
                </ul>
              </div>
              <div>
                <h2 className="text-lg font-medium text-stone-950">Amenities</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {property.amenities.map((amenity) => (
                    <span key={amenity} className="rounded-full bg-stone-100 px-3 py-1 text-sm text-stone-700">
                      {amenity}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h2 className="text-lg font-medium text-stone-950">About this stay</h2>
                <p className="mt-3 text-sm leading-7 text-stone-600">{property.descriptionLong}</p>
              </div>
              <div>
                <h2 className="text-lg font-medium text-stone-950">House rules</h2>
                <ul className="mt-3 space-y-2 text-sm leading-7 text-stone-600">
                  {property.houseRules.map((rule) => (
                    <li key={rule}>• {rule}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <div className="rounded-[24px] bg-stone-50 p-5">
                <h3 className="font-medium text-stone-950">Sleeping arrangements</h3>
                <p className="mt-2 text-sm text-stone-600">{property.bedrooms} bedrooms arranged for premium comfort and practical longer stays.</p>
              </div>
              <div className="rounded-[24px] bg-stone-50 p-5">
                <h3 className="font-medium text-stone-950">Local highlights</h3>
                <ul className="mt-2 space-y-1 text-sm text-stone-600">
                  {property.localHighlights.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-[24px] bg-stone-50 p-5">
                <h3 className="font-medium text-stone-950">Concierge add-ons</h3>
                <p className="mt-2 text-sm text-stone-600">Airport transfer, mid-stay cleaning, celebration setup, and local recommendations available on request.</p>
              </div>
            </div>

            <div className="rounded-[28px] border border-dashed border-black/10 bg-[#f7f2eb] p-6 text-sm leading-7 text-stone-600">
              Availability calendar, reviews, map, and live booking integration are scaffolded for phase-two data wiring.
            </div>
          </div>
        </div>

        <aside className="h-fit rounded-[36px] bg-stone-950 p-8 text-stone-50 shadow-[0_24px_80px_rgba(15,23,42,0.18)] lg:sticky lg:top-28">
          <p className="text-xs uppercase tracking-[0.3em] text-stone-400">Book direct</p>
          <p className="mt-4 text-3xl font-medium">{formatCurrency(property.startingPrice)} <span className="text-base text-stone-400">/ night</span></p>
          <p className="mt-3 text-sm leading-6 text-stone-300">Starting rate shown. Dynamic pricing and live availability can be connected via Hostaway later.</p>
          <div className="mt-8 space-y-3">
            <Link href="/book" className="block rounded-full bg-stone-50 px-5 py-3 text-center text-sm font-medium text-stone-950">
              Check Availability
            </Link>
            <Link href="/contact" className="block rounded-full border border-stone-400/40 px-5 py-3 text-center text-sm font-medium text-stone-50">
              Enquire About This Stay
            </Link>
          </div>
          <div className="mt-8 rounded-[24px] bg-white/5 p-5 text-sm leading-6 text-stone-300">
            Managed by La Maison Homes to a premium short-stay standard, with support shaped around comfort, clarity, and consistency.
          </div>
        </aside>
      </div>

      <section className="mt-20">
        <SectionHeading eyebrow="Similar stays" title={`More stays around ${kebabToTitle(property.suburb.toLowerCase().replace(/\s+/g, "-"))}`} />
        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {similar.map((item) => (
            <PropertyCard key={item.slug} property={item} />
          ))}
        </div>
      </section>
    </div>
  );
}
