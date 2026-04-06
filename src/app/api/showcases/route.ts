/**
 * GET /api/showcases
 * Returns all active showcases, merged with their property data from Supabase.
 * Used by the stays page to inject extra cards into search results.
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 60;

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\n/g, "");
const SERVICE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").replace(/\n/g, "");

export interface ShowcaseCard {
  id: string;
  slug: string;
  title: string;
  heroImage: string;
  suburb: string;
  city: string;
  bedrooms: number;
  sleeps: number;
  startingPrice: number;
  cleaningFee?: number;
  luxuryTier?: string;
  // extra Property fields for card compat
  shortTagline: string;
  country: string;
  bathrooms: number;
  parking: number;
  petFriendly: boolean;
  featured: boolean;
  gallery: string[];
  amenities: string[];
  descriptionShort: string;
  descriptionLong: string;
  houseRules: string[];
  localHighlights: string[];
  status: "live";
  listingId?: number;
}

interface RawShowcase {
  id: string;
  property_id: string;
  hostaway_listing_id: number;
  display_name: string | null;
  hero_image_url: string;
  sort_order: number;
}

interface SupabaseProperty {
  id: string;
  hostaway_listing_id: number | null;
  slug: string;
  name: string;
  display_name: string | null;
  suburb: string | null;
  city: string;
  bedrooms: number;
  bathrooms: number;
  max_guests: number;
  base_price_per_night: number | null;
  cleaning_fee: number | null;
  tier: string | null;
  description: string | null;
  house_rules: string | null;
  amenities: string[];
  photos: Array<{ url: string; sortOrder?: number }>;
}

export async function GET() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return NextResponse.json([], { status: 200 });
  }

  try {
    // Fetch active showcases
    const showcasesRes = await fetch(
      `${SUPABASE_URL}/rest/v1/property_showcases?is_active=eq.true&select=id,property_id,hostaway_listing_id,display_name,hero_image_url,sort_order&order=sort_order`,
      {
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
        },
        next: { revalidate: 60 },
      }
    );

    if (!showcasesRes.ok) {
      console.warn("[/api/showcases] Failed to fetch showcases:", showcasesRes.status);
      return NextResponse.json([]);
    }

    const rawShowcases: RawShowcase[] = await showcasesRes.json();
    if (!Array.isArray(rawShowcases) || rawShowcases.length === 0) {
      return NextResponse.json([]);
    }

    // Fetch published properties (for joining data)
    const propsRes = await fetch(
      `${SUPABASE_URL}/rest/v1/properties?is_published=eq.true&is_active=eq.true&select=id,hostaway_listing_id,slug,name,display_name,suburb,city,bedrooms,bathrooms,max_guests,base_price_per_night,cleaning_fee,tier,description,house_rules,amenities,photos`,
      {
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
        },
        next: { revalidate: 60 },
      }
    );

    if (!propsRes.ok) {
      console.warn("[/api/showcases] Failed to fetch properties:", propsRes.status);
      return NextResponse.json([]);
    }

    const properties: SupabaseProperty[] = await propsRes.json();
    const propById = new Map(properties.map((p) => [p.id, p]));
    const propByListingId = new Map(
      properties
        .filter((p) => p.hostaway_listing_id != null)
        .map((p) => [p.hostaway_listing_id!, p])
    );

    const showcaseCards = rawShowcases
      .map((sc): ShowcaseCard | null => {
        // Look up by property_id first, fall back to hostaway_listing_id
        const prop = propById.get(sc.property_id) ?? propByListingId.get(sc.hostaway_listing_id);
        if (!prop) return null;

        const title = sc.display_name ?? prop.display_name ?? prop.name;
        const sortedPhotos = (prop.photos ?? []).sort(
          (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
        );

        return {
          id: sc.id,
          slug: prop.slug,
          title,
          heroImage: sc.hero_image_url,
          suburb: prop.suburb ?? prop.city ?? "Melbourne",
          city: prop.city ?? "Melbourne",
          bedrooms: prop.bedrooms ?? 1,
          bathrooms: prop.bathrooms ?? 1,
          sleeps: prop.max_guests ?? 2,
          startingPrice: prop.base_price_per_night ?? 0,
          cleaningFee: prop.cleaning_fee ?? 0,
          luxuryTier: prop.tier ?? undefined,
          shortTagline: prop.description?.split(".")?.[0]?.trim() ?? prop.name,
          country: "Australia",
          parking: (prop.amenities ?? []).some((a) => /\bparking\b/i.test(a)) ? 1 : 0,
          petFriendly: (prop.amenities ?? []).some((a) => /\bpet/i.test(a)),
          featured: false,
          gallery: sortedPhotos.slice(0, 4).map((i) => i.url),
          amenities: prop.amenities ?? [],
          descriptionShort: prop.description?.substring(0, 200) ?? "",
          descriptionLong: prop.description ?? "",
          houseRules: prop.house_rules
            ? prop.house_rules.split("\n").filter(Boolean)
            : ["No parties", "No smoking", "Respect quiet hours after 10pm"],
          localHighlights: [],
          status: "live" as const,
          listingId: prop.hostaway_listing_id ?? undefined,
        } satisfies ShowcaseCard;
      })
      .filter((c): c is ShowcaseCard => c !== null);

    return NextResponse.json(showcaseCards);
  } catch (err) {
    console.error("[/api/showcases] Error:", err);
    return NextResponse.json([]);
  }
}
