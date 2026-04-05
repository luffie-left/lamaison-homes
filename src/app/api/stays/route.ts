import { NextResponse } from "next/server";
import {
  hostawayGet,
  mapToProperty,
  type HostawayListingsResponse,
} from "@/lib/hostaway";
import type { Property } from "@/data/mock-data";

export const dynamic = "force-dynamic";
export const revalidate = 60;

// ─────────────────────────────────────────────────────────────────────────────
// Supabase fetch — returns only is_published=true properties
// Falls back to null if the table doesn't exist yet or returns 0 results.
// ─────────────────────────────────────────────────────────────────────────────

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(
  /\n/g,
  ""
);
const SERVICE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").replace(
  /\n/g,
  ""
);

interface SupabaseProperty {
  id: string;
  hostaway_listing_id: number | null;
  slug: string;
  name: string;
  address: string | null;
  suburb: string | null;
  city: string;
  state: string;
  bedrooms: number;
  bathrooms: number;
  max_guests: number;
  base_price_per_night: number | null;
  cleaning_fee: number | null;
  description: string | null;
  house_rules: string | null;
  check_in_time: string | null;
  check_out_time: string | null;
  amenities: string[];
  photos: Array<{ url: string; sortOrder?: number }>;
  is_published: boolean;
  is_active: boolean;
}

function mapSupabaseToProperty(p: SupabaseProperty): Property {
  const sortedPhotos = (p.photos ?? []).sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
  );

  return {
    slug: p.slug,
    title: p.name,
    shortTagline: p.description?.split(".")[0]?.trim() ?? p.name,
    suburb: p.suburb ?? p.city ?? "Melbourne",
    city: p.city ?? "Melbourne",
    country: "Australia",
    sleeps: p.max_guests ?? 2,
    bedrooms: p.bedrooms ?? 1,
    bathrooms: p.bathrooms ?? 1,
    parking: (p.amenities ?? []).some((a) => /\bparking\b/i.test(a)) ? 1 : 0,
    petFriendly: (p.amenities ?? []).some((a) => /\bpet/i.test(a)),
    featured: false,
    startingPrice: p.base_price_per_night ?? 0,
    cleaningFee: p.cleaning_fee ?? 0,
    heroImage: sortedPhotos[0]?.url ?? "",
    gallery: sortedPhotos.slice(0, 4).map((i) => i.url),
    amenities: p.amenities ?? [],
    descriptionShort: p.description?.substring(0, 200) ?? "",
    descriptionLong: p.description ?? "",
    houseRules: p.house_rules
      ? p.house_rules.split("\n").filter(Boolean)
      : ["No parties", "No smoking", "Respect quiet hours after 10pm"],
    localHighlights: [],
    status: "live",
    luxuryTier:
      (p.bedrooms ?? 1) >= 3
        ? "Reserve"
        : (p.bedrooms ?? 1) >= 2
        ? "Signature"
        : "Collection",
    workFriendly: (p.amenities ?? []).some((a) =>
      /wifi|workspace|desk/i.test(a)
    ),
    familyFriendly: (p.max_guests ?? 0) >= 4,
    listingId: p.hostaway_listing_id ?? undefined,
  };
}

async function getFromSupabase(): Promise<Property[] | null> {
  if (!SUPABASE_URL || !SERVICE_KEY) return null;

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/properties?is_published=eq.true&is_active=eq.true&order=name`,
      {
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
        },
        next: { revalidate: 60 },
      }
    );

    if (!res.ok) {
      console.warn("[/api/stays] Supabase fetch failed:", res.status);
      return null;
    }

    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      // No published properties yet — fall back to Hostaway direct
      return null;
    }

    return data.map(mapSupabaseToProperty);
  } catch (err) {
    console.warn("[/api/stays] Supabase error, falling back to Hostaway:", err);
    return null;
  }
}

async function getFromHostaway(): Promise<Property[]> {
  const data = await hostawayGet<HostawayListingsResponse>(
    "/listings?limit=100&includeResources=1"
  );

  const listings = data?.result ?? [];

  // Only include active listings
  const active = listings.filter(
    (l) => !l.status || l.status === "active" || l.status === "1"
  );

  return active.map(mapToProperty);
}

// ─────────────────────────────────────────────────────────────────────────────
// Route
// ─────────────────────────────────────────────────────────────────────────────

export async function GET() {
  try {
    // Priority 1: Supabase published properties (respects publish control)
    const supabaseStays = await getFromSupabase();
    if (supabaseStays !== null) {
      return NextResponse.json({
        stays: supabaseStays,
        total: supabaseStays.length,
        source: "supabase",
      });
    }

    // Priority 2: Hostaway API direct (fallback — site works before sync runs)
    const hostawayStays = await getFromHostaway();
    return NextResponse.json({
      stays: hostawayStays,
      total: hostawayStays.length,
      source: "hostaway",
    });
  } catch (err) {
    console.error("[/api/stays] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch listings", stays: [], total: 0 },
      { status: 500 }
    );
  }
}
