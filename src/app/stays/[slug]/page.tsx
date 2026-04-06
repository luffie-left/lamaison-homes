import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Wifi,
  Car,
  UtensilsCrossed,
  AirVent,
  Tv,
  Waves,
  Dumbbell,
  TreePine,
  ArrowUpDown,
  Check,
  Home,
  Trophy,
  KeyRound,
  CalendarDays,
  Bath,
  Sparkles,
  Accessibility,
  Flame,
  Coffee,
  Wind,
  ParkingSquare,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import { PropertyCard } from "@/components/cards/property-card";
import { SectionHeading } from "@/components/sections/section-heading";
import { DescriptionExpand } from "@/components/property/description-expand";
import { MapWrapper } from "@/components/property/map-wrapper";
import { PropertyBookingSection } from "@/components/property/property-booking-section";
import type { Property } from "@/data/mock-data";

export const dynamic = "force-dynamic";

async function getStay(slug: string): Promise<Property | null> {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const res = await fetch(`${appUrl}/api/stays/${slug}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data.stay as Property) ?? null;
  } catch {
    return null;
  }
}

async function getSimilarStays(currentSlug: string): Promise<Property[]> {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const res = await fetch(`${appUrl}/api/stays`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return ((data.stays as Property[]) ?? [])
      .filter((s) => s.slug !== currentSlug)
      .slice(0, 3);
  } catch {
    return [];
  }
}

// Map amenity string to a Lucide icon
function amenityIcon(amenity: string) {
  const a = amenity.toLowerCase();
  if (/wifi|wi-fi|internet|wireless/.test(a)) return <Wifi className="h-5 w-5" />;
  if (/\bparking\b|\bcar\b|garage|driveway/.test(a)) return <ParkingSquare className="h-5 w-5" />;
  if (/kitchen|cook|microwave|oven/.test(a)) return <UtensilsCrossed className="h-5 w-5" />;
  if (/air.?con|aircon|\bac\b|cooling|hvac|climate/.test(a)) return <AirVent className="h-5 w-5" />;
  if (/washer|laundry|dryer|washing/.test(a)) return <Wind className="h-5 w-5" />;
  if (/\btv\b|television|streaming|netflix/.test(a)) return <Tv className="h-5 w-5" />;
  if (/pool|swim|spa|jacuzzi|hot.?tub/.test(a)) return <Waves className="h-5 w-5" />;
  if (/gym|fitness|exercise|workout/.test(a)) return <Dumbbell className="h-5 w-5" />;
  if (/balcon|terrace|patio|deck|outdoor/.test(a)) return <TreePine className="h-5 w-5" />;
  if (/elevator|lift/.test(a)) return <ArrowUpDown className="h-5 w-5" />;
  if (/ensuite|\bbath\b|shower/.test(a)) return <Bath className="h-5 w-5" />;
  if (/firework|\bbbq\b|fireplace|fire.?pit/.test(a)) return <Sparkles className="h-5 w-5" />;
  if (/disabilit|accessible|wheelchair/.test(a)) return <Accessibility className="h-5 w-5" />;
  if (/heating|heater|\bgas\b/.test(a)) return <Flame className="h-5 w-5" />;
  if (/coffee|espresso|nespresso/.test(a)) return <Coffee className="h-5 w-5" />;
  return <Check className="h-5 w-5" />;
}

// Bed type ID → name
function bedTypeName(id: number): string {
  if ([1, 25].includes(id)) return "King";
  if ([2, 24].includes(id)) return "Queen";
  if ([3, 26].includes(id)) return "Double";
  if ([4, 5, 6, 27].includes(id)) return "Single";
  return "Bed";
}

function formatTime(hour: number): string {
  if (hour === 0) return "12:00 AM";
  if (hour < 12) return `${hour}:00 AM`;
  if (hour === 12) return "12:00 PM";
  return `${hour - 12}:00 PM`;
}

export default async function PropertyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const property = await getStay(slug);

  if (!property) {
    notFound();
  }

  const similar = await getSimilarStays(slug);

  // Photo grid: hero + up to 4 side images
  const allImages = property.gallery?.length
    ? property.gallery
    : [property.heroImage].filter(Boolean);
  const heroImage = allImages[0] ?? "";
  const sideImages = allImages.slice(1, 5);

  // Bedroom grouping from listingBedTypes
  const bedTypeMap = new Map<
    number,
    Array<{ bedTypeId: number; quantity: number }>
  >();
  for (const bt of property.listingBedTypes ?? []) {
    if (!bedTypeMap.has(bt.bedroomNumber)) {
      bedTypeMap.set(bt.bedroomNumber, []);
    }
    bedTypeMap.get(bt.bedroomNumber)!.push(bt);
  }
  const bedroomNumbers = Array.from(bedTypeMap.keys()).sort((a, b) => a - b);

  // Amenities
  const amenities = property.amenities ?? [];
  const shownAmenities = amenities.slice(0, 10);
  const remainingAmenities = amenities.slice(10);

  const description = property.publicDescription ?? property.descriptionLong ?? "";

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f5f0eb" }}>
      {/* ── Photo Grid ── */}
      <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
        <div className="relative grid h-[420px] gap-2 overflow-hidden rounded-2xl md:h-[520px] md:grid-cols-[3fr_2fr]">
          {/* Hero image */}
          <div className="relative overflow-hidden">
            {heroImage ? (
              <Image
                src={heroImage}
                alt={property.title}
                fill
                className="object-cover"
                priority
              />
            ) : (
              <div className="h-full w-full bg-stone-200" />
            )}
          </div>

          {/* 2×2 side grid */}
          <div className="hidden grid-rows-2 gap-2 md:grid">
            {[0, 1, 2, 3].map((i) => {
              const img = sideImages[i];
              return (
                <div key={i} className="relative overflow-hidden">
                  {img ? (
                    <Image
                      src={img}
                      alt={`${property.title} ${i + 2}`}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-stone-200" />
                  )}
                </div>
              );
            })}
          </div>

          {/* Show all photos button */}
          <Link
            href={heroImage || "#"}
            target="_blank"
            className="absolute bottom-4 right-4 flex items-center gap-2 rounded-xl border border-white/60 bg-white/90 px-4 py-2 text-sm font-medium text-stone-900 shadow backdrop-blur-sm hover:bg-white"
          >
            <span>⊞</span> Show all photos
          </Link>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1fr_380px]">
          {/* LEFT COLUMN */}
          <div className="min-w-0">
            {/* Section 1 — Title block */}
            <div className="pb-8">
              <p className="text-xs font-medium uppercase tracking-widest text-stone-500">
                {property.suburb}, {property.city}
              </p>
              <h1 className="mt-2 font-serif text-3xl text-stone-950">
                {property.title}
              </h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-stone-600">
                <span>{property.sleeps} guests</span>
                <span className="text-stone-300">·</span>
                <span>{property.bedrooms} bedroom{property.bedrooms !== 1 ? "s" : ""}</span>
                <span className="text-stone-300">·</span>
                <span>
                  {property.listingBedTypes && property.listingBedTypes.length > 0
                    ? property.listingBedTypes.reduce((sum, b) => sum + b.quantity, 0)
                    : property.bedrooms}{" "}
                  bed{(property.listingBedTypes?.reduce((s, b) => s + b.quantity, 0) ?? property.bedrooms) !== 1 ? "s" : ""}
                </span>
                <span className="text-stone-300">·</span>
                <span>{property.bathrooms} bath{property.bathrooms !== 1 ? "s" : ""}</span>
              </div>
            </div>
            <hr className="border-stone-200" />

            {/* Section 2 — Host badge */}
            <div className="py-8 flex items-center gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-stone-950 text-white">
                <Home className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium text-stone-950">Managed by La Maison Homes</p>
                <p className="text-sm text-stone-500">Professional short-stay management · Melbourne</p>
              </div>
            </div>
            <hr className="border-stone-200" />

            {/* Section 3 — Key features */}
            <div className="py-8 space-y-5">
              <div className="flex items-start gap-4">
                <Trophy className="mt-0.5 h-6 w-6 flex-shrink-0 text-stone-700" />
                <div>
                  <p className="font-medium text-stone-950">La Maison certified</p>
                  <p className="text-sm text-stone-500">Professionally inspected and managed</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <KeyRound className="mt-0.5 h-6 w-6 flex-shrink-0 text-stone-700" />
                <div>
                  <p className="font-medium text-stone-950">Self check-in</p>
                  <p className="text-sm text-stone-500">Keypad or lockbox entry</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <CalendarDays className="mt-0.5 h-6 w-6 flex-shrink-0 text-stone-700" />
                <div>
                  <p className="font-medium text-stone-950">Flexible dates</p>
                  <p className="text-sm text-stone-500">Contact us to discuss your dates</p>
                </div>
              </div>
            </div>
            <hr className="border-stone-200" />

            {/* Section 4 — Description */}
            <div className="py-8">
              <h2 className="mb-4 text-xl font-medium text-stone-950">About this place</h2>
              <DescriptionExpand text={description || property.shortTagline} />
            </div>
            <hr className="border-stone-200" />

            {/* Section 5 — Sleeping arrangements */}
            <div className="py-8">
              <h2 className="mb-6 text-xl font-medium text-stone-950">Sleeping arrangements</h2>
              {bedroomNumbers.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {bedroomNumbers.map((roomNum) => {
                    const beds = bedTypeMap.get(roomNum) ?? [];
                    return (
                      <div
                        key={roomNum}
                        className="rounded-2xl border border-stone-200 bg-white p-5"
                      >
                        <p className="font-medium text-stone-950">
                          Bedroom {roomNum}
                        </p>
                        <div className="mt-3 space-y-1">
                          {beds.map((b, i) => (
                            <p key={i} className="text-sm text-stone-600">
                              🛏️ {b.quantity}{" "}
                              {bedTypeName(b.bedTypeId)}{" "}
                              {b.quantity !== 1 ? "beds" : "bed"}
                            </p>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-stone-600">
                  {property.bedrooms} bedroom{property.bedrooms !== 1 ? "s" : ""} ·
                  sleeps {property.sleeps} guests
                </p>
              )}
            </div>
            <hr className="border-stone-200" />

            {/* Section 6 — Amenities */}
            <div className="py-8">
              <h2 className="mb-6 text-xl font-medium text-stone-950">What this place offers</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {shownAmenities.map((a) => (
                  <div key={a} className="flex items-center gap-3 text-stone-700">
                    <span className="flex-shrink-0 rounded-lg bg-stone-100 p-2 text-stone-600">{amenityIcon(a)}</span>
                    <span className="text-sm">{a}</span>
                  </div>
                ))}
              </div>
              {remainingAmenities.length > 0 && (
                <details className="mt-6 group">
                  <summary className="cursor-pointer list-none">
                    <div className="inline-flex items-center gap-2 rounded-xl border border-stone-950 px-5 py-2.5 text-sm font-medium text-stone-950 hover:bg-stone-950 hover:text-stone-50 transition-colors">
                      <span>Show all {amenities.length} amenities</span>
                      <ChevronDown className="h-4 w-4 group-open:hidden" />
                      <ChevronUp className="h-4 w-4 hidden group-open:block" />
                    </div>
                  </summary>
                  <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {remainingAmenities.map((a) => (
                      <div key={a} className="flex items-center gap-3 text-stone-700">
                        <span className="flex-shrink-0 rounded-lg bg-stone-100 p-2 text-stone-600">{amenityIcon(a)}</span>
                        <span className="text-sm">{a}</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
            <hr className="border-stone-200" />



            {/* Section 8 — House rules */}
            <div className="py-8">
              <h2 className="mb-6 text-xl font-medium text-stone-950">House rules</h2>
              <div className="space-y-4 mb-5">
                {property.checkInTime !== undefined && (
                  <div className="flex items-center gap-4 text-sm">
                    <span className="w-28 font-medium text-stone-800">Check-in</span>
                    <span className="text-stone-600">After {formatTime(property.checkInTime)}</span>
                  </div>
                )}
                {property.checkOutTime !== undefined && (
                  <div className="flex items-center gap-4 text-sm">
                    <span className="w-28 font-medium text-stone-800">Check-out</span>
                    <span className="text-stone-600">Before {formatTime(property.checkOutTime)}</span>
                  </div>
                )}
                <div className="flex items-center gap-4 text-sm">
                  <span className="w-28 font-medium text-stone-800">Max guests</span>
                  <span className="text-stone-600">{property.sleeps} guests</span>
                </div>
              </div>
              {property.houseRules.length > 0 && (
                <details className="group">
                  <summary className="cursor-pointer list-none">
                    <div className="inline-flex items-center gap-2 rounded-xl border border-stone-950 px-5 py-2.5 text-sm font-medium text-stone-950 hover:bg-stone-950 hover:text-stone-50 transition-colors">
                      <span>Show all rules</span>
                      <ChevronDown className="h-4 w-4 group-open:hidden" />
                      <ChevronUp className="h-4 w-4 hidden group-open:block" />
                    </div>
                  </summary>
                  <div className="mt-5 space-y-3">
                    {property.houseRules.map((rule, i) => (
                      <div key={i} className="flex items-start gap-3 text-sm text-stone-600">
                        <span className="mt-0.5 flex-shrink-0 text-stone-400">✓</span>
                        <span>{rule}</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
            <hr className="border-stone-200" />

            {/* Section 9 — Location map */}
            <div className="py-8">
              <h2 className="mb-2 text-xl font-medium text-stone-950">Where you&apos;ll be</h2>
              <p className="mb-5 text-sm text-stone-500">
                {property.suburb}, {property.city}
              </p>
              {property.lat && property.lng ? (
                <MapWrapper
                  lat={property.lat}
                  lng={property.lng}
                  suburb={property.suburb}
                  city={property.city}
                />
              ) : (
                <div className="flex h-48 items-center justify-center rounded-2xl bg-stone-100 text-sm text-stone-400">
                  Map available after booking
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN — Booking widget with inline calendar */}
          <aside className="lg:block">
            <div className="lg:sticky lg:top-28">
              <PropertyBookingSection
                slug={slug}
                listingId={property.listingId ?? 0}
                nightlyRate={property.startingPrice}
                cleaningFee={property.cleaningFee ?? 0}
              />
            </div>
          </aside>
        </div>

        {/* Similar stays */}
        {similar.length > 0 && (
          <section className="mt-16 border-t border-stone-200 pt-16">
            <SectionHeading
              eyebrow="Similar stays"
              title={`More stays in ${property.suburb}`}
            />
            <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {similar.map((item) => (
                <PropertyCard key={item.slug} property={item} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
