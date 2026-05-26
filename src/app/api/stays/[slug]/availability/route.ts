import { NextRequest, NextResponse } from "next/server";
import { hostawayGet, type HostawayCalendarResponse } from "@/lib/hostaway";

export const revalidate = 0; // Always fresh for availability

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\n/g, "").trim();
const SERVICE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").replace(/\n/g, "").trim();

const fmt = (d: Date): string => d.toISOString().split("T")[0];

// ─── Resolve text slug → Hostaway listing ID via Supabase ─────────────────────

async function resolveListingId(slug: string): Promise<number | null> {
  // Numeric slug is already the listing ID
  if (!isNaN(Number(slug))) return Number(slug);

  if (!SUPABASE_URL || !SERVICE_KEY) return null;

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/properties?slug=eq.${encodeURIComponent(slug)}&select=hostaway_listing_id&limit=1`,
      {
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
        },
        cache: "no-store",
      }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    return rows?.[0]?.hostaway_listing_id ?? null;
  } catch {
    return null;
  }
}

// ─── Blocked dates from Supabase calendar_blocks ──────────────────────────────

async function getBlockedDatesFromSupabase(
  listingId: number,
  startDate: string,
  endDate: string
): Promise<string[] | null> {
  if (!SUPABASE_URL || !SERVICE_KEY) return null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/calendar_blocks?hostaway_listing_id=eq.${listingId}&date=gte.${startDate}&date=lte.${endDate}&status=neq.available&select=date`,
      {
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
        },
        cache: "no-store",
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    return data.map((d: { date: string }) => d.date);
  } catch {
    return null;
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  if (!slug) {
    return NextResponse.json({ error: "Missing slug" }, { status: 400 });
  }

  const today = new Date();
  const endDate = new Date(today);
  endDate.setDate(today.getDate() + 90);
  const startStr = fmt(today);
  const endStr = fmt(endDate);

  try {
    // Resolve the listing ID (handles both numeric and text slugs)
    const listingId = await resolveListingId(slug);

    if (!listingId) {
      return NextResponse.json(
        { error: "Property not found", available: false, blockedDates: [] },
        { status: 404 }
      );
    }

    let blockedDates: string[];

    // Priority 1: Supabase calendar_blocks
    const supabaseBlocked = await getBlockedDatesFromSupabase(listingId, startStr, endStr);

    if (supabaseBlocked !== null) {
      blockedDates = supabaseBlocked;
    } else {
      // Fallback: Hostaway calendar API
      const data = await hostawayGet<HostawayCalendarResponse>(
        `/listings/${listingId}/calendar?startDate=${startStr}&endDate=${endStr}`,
        0
      );
      const entries = data?.result ?? [];
      blockedDates = entries
        .filter(
          (e) =>
            e.isAvailable === 0 ||
            e.status === "blocked" ||
            e.status === "reserved"
        )
        .map((e) => e.date);
    }

    // Optional: check specific dates from query params
    const searchParams = req.nextUrl.searchParams;
    const checkIn = searchParams.get("checkIn");
    const checkOut = searchParams.get("checkOut");

    let available = true;
    if (checkIn && checkOut) {
      const start = new Date(checkIn);
      const end = new Date(checkOut);
      const cursor = new Date(start);
      while (cursor < end) {
        if (blockedDates.includes(fmt(cursor))) {
          available = false;
          break;
        }
        cursor.setDate(cursor.getDate() + 1);
      }
    }

    return NextResponse.json({ available, blockedDates, listingId });
  } catch (err) {
    console.error(`[/api/stays/${slug}/availability] Error:`, err);
    return NextResponse.json(
      { error: "Failed to fetch availability", available: false, blockedDates: [] },
      { status: 500 }
    );
  }
}
