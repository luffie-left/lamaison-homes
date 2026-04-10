import Image from "next/image";
import Link from "next/link";

import { EditorialCard } from "@/components/cards/editorial-card";
import { PropertyCard } from "@/components/cards/property-card";
import { SuburbCard } from "@/components/cards/suburb-card";
import { SectionHeading } from "@/components/sections/section-heading";
import { journalPosts, suburbClusters, trustBadges } from "@/data/mock-data";
import type { Property } from "@/data/mock-data";

async function getFeaturedStays(): Promise<Property[]> {
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const res = await fetch(`${appUrl}/api/stays`, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const data = await res.json();
    const stays: Property[] = data.stays ?? [];
    // Return max 4, prefer those with photos
    return stays.filter((s) => s.heroImage).slice(0, 4);
  } catch {
    return [];
  }
}

export default async function MelbournePage() {
  const featuredStays = await getFeaturedStays();
  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <Image src="/placeholders/melbourne-city.jpg" alt="Melbourne skyline" fill className="object-cover" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,18,16,0.35),rgba(20,18,16,0.75))]" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 py-28 sm:px-6 lg:px-8">
          <div className="max-w-3xl space-y-5 text-stone-50">
            <p className="text-xs uppercase tracking-[0.34em] text-stone-200">Destination / Melbourne</p>
            <h1 className="font-serif text-5xl leading-tight sm:text-6xl">Curated stays across Melbourne’s most considered neighbourhoods.</h1>
            <p className="max-w-2xl text-lg leading-8 text-stone-200">
              A boutique collection of homes selected for comfort, character, and consistency — backed by responsive support and professional management.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading title="Melbourne, interpreted through neighbourhoods and well-managed homes." description="This page becomes the scalable template for future suburb and city destination landing pages." />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {suburbClusters.map((suburb) => (
            <SuburbCard key={suburb} name={suburb} />
          ))}
        </div>
        <p className="mt-4 text-xs text-stone-400 text-center">Click any neighbourhood to browse stays in that area</p>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Featured stays by suburb" title="Stay in Melbourne with booking confidence." />
        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {featuredStays.map((property) => (
            <PropertyCard key={property.slug} property={property} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="flex flex-wrap gap-3">
          {trustBadges.map((badge) => (
            <span key={badge} className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm text-stone-700">
              {badge}
            </span>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-6">
          <SectionHeading eyebrow="Local guides" title="Editorial content that supports both brand and SEO." />
          <Link href="/journal" className="hidden text-sm font-medium text-stone-700 lg:block">See all articles</Link>
        </div>
        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          {journalPosts.map((post) => (
            <EditorialCard key={post.slug} href={`/journal/${post.slug}`} image={post.image} category={post.category} title={post.title} excerpt={post.excerpt} />
          ))}
        </div>
      </section>
    </div>
  );
}
