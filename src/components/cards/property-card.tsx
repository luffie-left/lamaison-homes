import Image from "next/image";
import Link from "next/link";

import type { Property } from "@/data/mock-data";
import { cn, formatCurrency } from "@/lib/utils";

export function PropertyCard({ property, className }: { property: Property; className?: string }) {
  return (
    <article className={cn("group overflow-hidden rounded-[28px] border border-black/5 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.06)]", className)}>
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={property.heroImage}
          alt={property.title}
          fill
          className="object-cover transition duration-700 group-hover:scale-105"
        />
        <div className="absolute left-4 top-4 rounded-full bg-[#f7f2eb]/90 px-3 py-1 text-xs uppercase tracking-[0.2em] text-stone-700">
          {property.luxuryTier}
        </div>
      </div>
      <div className="space-y-4 p-5">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xl font-medium text-stone-950">{property.title}</h3>
            <span className="text-sm text-stone-500">{property.suburb}</span>
          </div>
          <p className="text-sm leading-6 text-stone-600">{property.shortTagline}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-stone-500">
          <span>{property.sleeps} guests</span>
          <span>•</span>
          <span>{property.bedrooms} beds</span>
          <span>•</span>
          <span>{property.bathrooms} baths</span>
        </div>
        <div className="flex items-center justify-between pt-2">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-stone-500">From</p>
            <p className="text-lg font-medium text-stone-950">{formatCurrency(property.startingPrice)}<span className="text-sm text-stone-500"> / night</span></p>
          </div>
          <Link
            href={`/stays/${property.slug}`}
            className="rounded-full border border-stone-950 px-4 py-2 text-sm font-medium text-stone-950 transition hover:bg-stone-950 hover:text-stone-50"
          >
            View Stay
          </Link>
        </div>
      </div>
    </article>
  );
}
