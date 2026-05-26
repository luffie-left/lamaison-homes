import { NextRequest, NextResponse } from "next/server";
import {
  hostawayGet,
  mapToProperty,
  type HostawayListingResponse,
} from "@/lib/hostaway";

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
    gallery: sortedPhotos.slice(0, 8).map((i) => i.url),
    amenities: p.amenities ?? [],
    descriptionShort: p.description?.substring(0, 200) ?? "",
    descriptionLong: p.description ?? "",
    houseRules: p.house_rules
      ? p.house_rules.split("\n").filter(Boolean)
      : ["No parties", "No smoking", "Respect quiet hours after 10pm"],
    localHighlights: [],
    status: "live" as const,
    luxuryTier: (p.tier as "Signature" | "Reserve" | "Collection" | undefined) ?? undefined,
    workFriendly: (p.amenities ?? []).some((a) => /wifi|workspace|desk/i.test(a)),
    familyFriendly: (p.max_guests ?? 0) >= 4,
    listingId: p.hostaway_listing_id ?? undefined,
  };
}

// ─── Lookup by text slug in Supabase ─────────────────────────────────────────

async function getFromSupabaseBySlug(slug: string) {
  if (!SUPABASE_URL || !SERVICE_KEY) return null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/properties?slug=eq.${encodeURIComponent(slug)}&limit=1`,
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

// ─── Lookup by numeric Hostaway listing ID ────────────────────────────────────

async function getFromHostaway(id: string) {
  const data = await hostawayGet<HostawayListingResponse>(
    `/listings/${id}?includeResources=1`
  );
  if (!data?.result) return null;
  return mapToProperty(data.result);
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
      // Direct Hostaway lookup by listing ID
      const stay = await getFromHostaway(slug);
      if (!stay) {
        return NextResponse.json({ error: "Listing not found" }, { status: 404 });
      }
      return NextResponse.json({ stay });
    } else {
      // Text slug — look up in Supabase first
      const stay = await getFromSupabaseBySlug(slug);
      if (!stay) {
        return NextResponse.json({ error: "Property not found" }, { status: 404 });
      }

      // If we have a Hostaway listing ID, enrich with live pricing from Hostaway
      if (stay.listingId) {
        try {
          const hostawayStay = await getFromHostaway(String(stay.listingId));
          if (hostawayStay) {
            // Merge: keep Supabase metadata (slug, photos, description) but take live price
            return NextResponse.json({
              stay: {
                ...hostawayStay,
                slug: stay.slug,
                // Images: prefer Supabase if populated, else Hostaway
                heroImage: stay.heroImage || hostawayStay.heroImage,
                gallery: stay.gallery.length ? stay.gallery : hostawayStay.gallery,
                // Descriptions: prefer Supabase if populated
                descriptionLong: stay.descriptionLong || hostawayStay.descriptionLong,
                descriptionShort: stay.descriptionShort || hostawayStay.descriptionShort,
                houseRules: stay.houseRules.length ? stay.houseRules : hostawayStay.houseRules,
                // Pricing: always take live Hostaway price
                startingPrice: hostawayStay.startingPrice || stay.startingPrice,
                cleaningFee: hostawayStay.cleaningFee ?? stay.cleaningFee ?? 0,
                luxuryTier: stay.luxuryTier,
              },
            });
          }
        } catch {
          // Hostaway enrichment failed — return Supabase data as-is
        }
      }

      return NextResponse.json({ stay });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[/api/stays/${slug}] Error:`, msg);
    return NextResponse.json(
      { error: "Failed to fetch listing", detail: msg },
      { status: 500 }
    );
  }
}
