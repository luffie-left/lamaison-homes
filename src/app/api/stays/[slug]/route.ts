import { NextRequest, NextResponse } from "next/server";
import {
  hostawayGet,
  mapToProperty,
  type HostawayListingResponse,
} from "@/lib/hostaway";
import { isHostawayListingEligible } from "@/lib/hostaway-bookability";

export const dynamic = "force-dynamic";
export const revalidate = 300;

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\n/g, "").trim();
const SERVICE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").replace(/\n/g, "").trim();

// ─── Supabase property type (partial) ────────────────────────────────────────

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

function mapSupabaseToProperty(p: SupabaseProperty) {
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
    gallery: sortedPhotos.slice(0, 8).map(i => i.url),
    amenities: p.amenities ?? [],
    descriptionShort: p.description?.substring(0, 200) ?? "",
    descriptionLong: p.description ?? "",
    houseRules: p.house_rules
      ? p.house_rules.split("\n")
      : ["No parties", "No smoking", "Respect quiet hours after 10pm"],
    localHighlights: [],
    status: "live" as const,
    luxuryTier: (p.tier as "Signature" | "Reserve" | "Collection" | undefined) ?? undefined,
    workFriendly: (p.amenities ?? []).some((a) => /wifi|workspace|desk/i.test(a)),
    familyFriendly: (p.max_guests ?? 0) >= 4,
    listingId: p.hostaway_listing_id ?? undefined,
  };
}

// ─── Lookup by text slug in Supabase (published + active only) ───────────────

async function getFromSupabaseBySlug(slug: string) {
  if (!SUPABASE_URL || !SERVICE_KEY) return null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/properties?slug=eq.${encodeURIComponent(slug)}&is_published=eq.true&is_active=eq.true&limit=1`,
      {
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
        },
        next: { revalidate: 300 },
      }
    );
    if (!res.ok) return null;
    const rows: SupabaseProperty[] = await res.json();
    if (!rows || rows.length === 0) return null;
    return mapSupabaseToProperty(rows[0]);
  } catch (err) {
    console.warn(`[/api/stays/${slug}] Supabase lookup failed:`, err);
    return null;
  }
}

// ─── Supabase row lookup by Hostaway listing ID (numeric slug) ──────────────
// Numeric detail requests MUST resolve to a matching is_published=true AND
// is_active=true local row — fail closed when absent (no local row ⇒ 404) or
// when Supabase itself is unreachable/unconfigured (⇒ 503, not fallback).

async function getSupabaseRowByListingId(listingId: number): Promise<SupabaseProperty | null | undefined> {
  if (!SUPABASE_URL || !SERVICE_KEY) return undefined; // can't verify — outage
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/properties?hostaway_listing_id=eq.${listingId}&is_published=eq.true&is_active=eq.true&select=*&limit=1`,
      {
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
        },
        cache: "no-store",
      }
    );
    if (!res.ok) return undefined; // treat as outage — fail closed
    const rows: SupabaseProperty[] = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) return null; // verified absent
    return rows[0];
  } catch {
    return undefined; // outage — fail closed
  }
}

// ─── Current Hostaway listing lookup (fail-closed on unknown state) ──────────

async function getHostawayListing(id: string) {
  const data = await hostawayGet<HostawayListingResponse>(
    `/listings/${id}?includeResources=1`,
    0
  );
  return data?.result ?? null;
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  if (!slug) {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  }

  try {
    const isNumeric = !isNaN(Number(slug));

    if (isNumeric) {
      // Numeric slug = Hostaway listing ID. It must match an active+published
      // Supabase row; otherwise we could expose an unpublished property by ID.
      const listingId = Number(slug);
      const localRow = await getSupabaseRowByListingId(listingId);
      if (localRow === undefined) {
        // Supabase unreachable/unconfigured — cannot verify publicity → 503.
        return NextResponse.json(
          { error: "Unable to verify property", code: "SUPABASE_UNAVAILABLE" },
          { status: 503 }
        );
      }
      if (localRow === null) {
        // Verified: no published+active local row for this listing ID.
        return NextResponse.json(
          { error: "Listing not found", code: "LISTING_NOT_FOUND" },
          { status: 404 }
        );
      }

      const listing = await getHostawayListing(slug);
      if (!listing) {
        return NextResponse.json({ error: "Listing not found", code: "LISTING_NOT_FOUND" }, { status: 404 });
      }
      if (!isHostawayListingEligible(listing)) {
        return NextResponse.json(
          { error: "Listing is not available", code: "LISTING_INELIGIBLE" },
          { status: 404 }
        );
      }
      const mapped = mapToProperty(listing);
      // Prefer the canonical local slug so subsequent navigation resolves.
      return NextResponse.json({
        stay: { ...mapped, slug: localRow.slug, luxuryTier: (localRow.tier as typeof mapped.luxuryTier) ?? mapped.luxuryTier },
      });
    }

    // Text slug — look up in Supabase first (is_published && is_active filter
    // happens server-side in the query above; unpublished rows never resolve).
    const stay = await getFromSupabaseBySlug(slug);
    if (!stay) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    // No Hostaway mapping → cannot verify current eligibility → fail closed.
    if (!stay.listingId) {
      return NextResponse.json(
        { error: "Property is not currently bookable", code: "LISTING_INELIGIBLE" },
        { status: 404 }
      );
    }

    // Always verify current Hostaway state. On Hostaway failure we fail closed
    // (no stale Supabase-only fallback for a bookable detail page).
    let hostawayListing;
    try {
      hostawayListing = await getHostawayListing(String(stay.listingId));
    } catch (err) {
      console.warn(`[/api/stays/${slug}] Hostaway lookup failed:`, err);
      return NextResponse.json(
        { error: "Unable to verify listing availability", code: "HOSTAWAY_UNAVAILABLE" },
        { status: 503 }
      );
    }
    if (!hostawayListing) {
      return NextResponse.json(
        { error: "Property is not currently bookable", code: "LISTING_INELIGIBLE" },
        { status: 404 }
      );
    }
    if (!isHostawayListingEligible(hostawayListing)) {
      return NextResponse.json(
        { error: "Property is not currently bookable", code: "LISTING_INELIGIBLE" },
        { status: 404 }
      );
    }

    // Merge: Supabase metadata + live Hostaway pricing/images
    const hostawayStay = mapToProperty(hostawayListing);
    return NextResponse.json({
      stay: {
        ...hostawayStay,
        slug: stay.slug,
        // Hostaway S3 URLs are signed/rotated — stored Supabase photos go
        // stale (403). Always prefer LIVE Hostaway images; stored gallery is
        // only a last-resort fallback when Hostaway returns none.
        heroImage: hostawayStay.heroImage || stay.heroImage,
        gallery: hostawayStay.gallery.length ? hostawayStay.gallery : stay.gallery,
        descriptionLong: stay.descriptionLong || hostawayStay.descriptionLong,
        descriptionShort: stay.descriptionShort || hostawayStay.descriptionShort,
        houseRules: stay.houseRules.length ? stay.houseRules : hostawayStay.houseRules,
        startingPrice: hostawayStay.startingPrice || stay.startingPrice,
        cleaningFee: hostawayStay.cleaningFee ?? stay.cleaningFee ?? 0,
        luxuryTier: stay.luxuryTier,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[/api/stays/${slug}] Error:`, msg);
    return NextResponse.json(
      { error: "Failed to fetch listing", detail: msg },
      { status: 500 }
    );
  }
}
