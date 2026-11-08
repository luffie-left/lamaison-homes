import { NextResponse } from "next/server";
import {
  hostawayGet,
  type HostawayListing,
  type HostawayListingsResponse,
} from "@/lib/hostaway";
import { isHostawayListingEligible } from "@/lib/hostaway-bookability";
import type { Property } from "@/data/mock-data";

export const dynamic = "force-dynamic";
export const revalidate = 60;

// ─────────────────────────────────────────────────────────────────────────────
// Supabase fetch — public listings must be is_published=true AND is_active=true
// AND currently eligible on Hostaway. Supabase is authoritative for publicity:
//  - returns [] when Supabase has zero published rows (NOT a Hostaway trigger)
//  - returns null only on Supabase failure/unconfigured → 503, never fallback
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
  tier: string | null;
  display_name: string | null;
}

function mapSupabaseToProperty(p: SupabaseProperty): Property {
  const sortedPhotos = (p.photos ?? []).sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
  );

  return {
    slug: p.slug,
    title: p.display_name ?? p.name,
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
    gallery: sortedPhotos.slice(0, 4).map(i => i.url),
    amenities: p.amenities ?? [],
    descriptionShort: p.description?.substring(0, 200) ?? "",
    descriptionLong: p.description ?? "",
    houseRules: p.house_rules
      ? p.house_rules.split("\n").filter(Boolean)
      : ["No parties", "No smoking", "Respect quiet hours after 10pm"],
    localHighlights: [],
    status: "live",
    luxuryTier: (p.tier as "Signature" | "Reserve" | "Collection" | undefined) ?? undefined,
    workFriendly: (p.amenities ?? []).some((a) => /wifi|workspace|desk/i.test(a)),
    familyFriendly: (p.max_guests ?? 0) >= 4,
    listingId: p.hostaway_listing_id ?? undefined,
  };
}

/**
 * [] = Supabase reachable with zero published rows (valid, empty catalog).
 * null = Supabase failure or unconfigured → caller must 503 (no fallback).
 */
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

    if (!Array.isArray(data)) {
      console.warn("[/api/stays] Supabase returned non-array");
      return null;
    }

    return data.map(mapSupabaseToProperty); // may legitimately be []
  } catch (err) {
    console.warn("[/api/stays] Supabase error:", err);
    return null;
  }
}

// Hostaway listing data for enrichment — images + live pricing
interface HostawayListingData {
  hero: string;
  gallery: string[];
  price: number;
  cleaningFee: number;
  lat?: number;
  lng?: number;
}

/**
 * All Hostaway listings, following pagination to the last page so nothing is
 * missed (limit=100 per page). Returns null on any failure:
 *  - any page fetch error (incl. current direct-API 403 — no retry)
 *  - `count` missing/undefined AND rows.length === limit (can't prove we've
 *    seen everything) → keep paging until short page or hard cap; if the cap
 *    is hit, or duplicate listing IDs appear across pages, we cannot trust
 *    the result → null (fail closed).
 */
export async function fetchAllHostawayListings(): Promise<HostawayListing[] | null> {
  const all: HostawayListing[] = [];
  const seen = new Set<number>();
  const limit = 100;
  const hardCap = 5000;
  let offset = 0;

  for (let page = 0; page < 100; page++) {
    let data: HostawayListingsResponse;
    try {
      data = await hostawayGet<HostawayListingsResponse>(
        `/listings?limit=${limit}&offset=${offset}&includeResources=1`,
        0
      );
    } catch (err) {
      // Fail closed on any page error (403 included — do not retry).
      console.error("[fetchAllHostawayListings] Hostaway page fetch failed:", err);
      return null;
    }

    const rows = data?.result;
    if (!Array.isArray(rows)) {
      console.error("[fetchAllHostawayListings] Hostaway returned non-array result");
      return null;
    }

    for (const row of rows) {
      if (!row || typeof row.id !== "number") return null; // malformed → fail closed
      if (seen.has(row.id)) {
        // Duplicate IDs across pages = pagination is broken/unreliable.
        console.error("[fetchAllHostawayListings] duplicate listing id", row.id);
        return null;
      }
      seen.add(row.id);
      all.push(row);
    }

    const count = typeof data?.count === "number" ? data.count : undefined;

    // Stop when we provably have everything.
    if (typeof count === "number" ? all.length >= count : false) break;
    if (rows.length < limit) break; // short page = definitive end

    // count undefined but full page → must keep paging; hard cap guards
    // against an API that always returns full pages forever.
    if (all.length >= hardCap) {
      console.error("[fetchAllHostawayListings] hit hard cap without end marker");
      return null;
    }
    offset += limit;
  }

  return all;
}

// ─────────────────────────────────────────────────────────────────────────────
// Route
// ─────────────────────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const [supabaseStays, hostawayListings] = await Promise.all([
      getFromSupabase(),
      fetchAllHostawayListings(),
    ]);

    // Supabase is authoritative for publicity. Failure/unconfigured → 503.
    // Never fall back to raw Hostaway listings — that could expose
    // unpublished/unlisted properties.
    if (supabaseStays === null) {
      return NextResponse.json(
        { error: "Unable to load property catalog", stays: [], total: 0 },
        { status: 503 }
      );
    }

    // Fail closed on Hostaway outage: we cannot verify current eligibility,
    // so no listing is served as bookable. (403 included — no retry.)
    if (!hostawayListings) {
      return NextResponse.json(
        { error: "Unable to verify current listing availability", stays: [], total: 0 },
        { status: 503 }
      );
    }

    // Current eligibility set from the fresh, fully paginated Hostaway data.
    const eligible = new Map<number, HostawayListing>();
    for (const l of hostawayListings) {
      if (isHostawayListingEligible(l)) eligible.set(l.id, l);
    }

    // Empty Supabase catalog is a valid state: return empty, no fallback.
    // Only public rows (query already filtered is_published && is_active)
    // with a Hostaway mapping that is currently Hostaway-eligible.
    const merged = supabaseStays
      .filter((stay) => stay.listingId !== undefined && eligible.has(stay.listingId!))
      .map((stay) => {
        const l = eligible.get(stay.listingId!)!;
        const sorted = (l.listingImages ?? []).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
        const ha: HostawayListingData = {
          hero: sorted[0]?.url ?? "",
          gallery: sorted.slice(0, 8).map(i => i.url),
          price: l.price ?? 0,
          cleaningFee: l.cleaningFee ?? 0,
          lat: l.lat,
          lng: l.lng,
        };
        return {
          ...stay,
          // Hostaway S3 URLs are signed/rotated — stored photos go stale
          // (403). Prefer LIVE Hostaway images; stored only as fallback.
          heroImage: ha.hero || stay.heroImage,
          gallery: ha.gallery.length ? ha.gallery : stay.gallery,
          startingPrice: stay.startingPrice > 0 ? stay.startingPrice : ha.price,
          cleaningFee: (stay.cleaningFee ?? 0) > 0 ? stay.cleaningFee : ha.cleaningFee,
          lat: (stay as Property).lat ?? ha.lat,
          lng: (stay as Property).lng ?? ha.lng,
        };
      });

    return NextResponse.json({
      stays: merged,
      total: merged.length,
      source: "supabase+hostaway",
    });
  } catch (err) {
    console.error("[/api/stays] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch listings", stays: [], total: 0 },
      { status: 500 }
    );
  }
}
