import { NextRequest, NextResponse } from "next/server";
import {
  hostawayGet,
  type HostawayCalendarResponse,
  type HostawayListingResponse,
} from "@/lib/hostaway";
import {
  assertHostawayBookable,
  enumerateOvernights,
  isHostawayListingEligible,
  validateCalendar,
  BookabilityError,
} from "@/lib/hostaway-bookability";

export const dynamic = "force-dynamic";
export const revalidate = 0; // Always fresh for availability

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\n/g, "").trim();
const SERVICE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").replace(/\n/g, "").trim();

const fmt = (d: Date): string => d.toISOString().split("T")[0];

// ─── Resolve slug → Hostaway listing ID via Supabase ───────────────────────
// Returns:
//  number  — resolved listing ID (row verified published+active, or numeric
//            slug whose ID was verified against a published+active row)
//  null    — verified: no such public property (404)
//  undefined — Supabase unreachable/unconfigured: cannot verify (503)

async function resolveListingId(
  slug: string
): Promise<number | null | undefined> {
  if (!SUPABASE_URL || !SERVICE_KEY) return undefined;

  const numeric = !isNaN(Number(slug)) ? Number(slug) : null;

  try {
    // Numeric slug: the Hostaway ID itself must map to a published+active row.
    // Text slug: fetch the row's mapping with publish flags.
    const filter = numeric !== null
      ? `hostaway_listing_id=eq.${numeric}`
      : `slug=eq.${encodeURIComponent(slug)}`;
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/properties?${filter}&select=hostaway_listing_id,is_published,is_active&limit=1`,
      {
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
        },
        cache: "no-store",
      }
    );
    if (!res.ok) return undefined; // outage — fail closed
    const rows = await res.json();
    const row = rows?.[0];
    if (!row) return null; // verified absent
    // Fail closed: unpublished / inactive local rows never resolve to a
    // bookable listing, even if a Hostaway mapping exists.
    if (row.is_published !== true || row.is_active !== true) return null;
    const listingId = row.hostaway_listing_id;
    if (typeof listingId !== "number") return null; // no mapping → not bookable
    return listingId;
  } catch {
    return undefined; // outage — fail closed
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
    // Resolve the listing ID (numeric and text slugs both require a verified
    // published+active Supabase row)
    const listingId = await resolveListingId(slug);

    if (listingId === undefined) {
      // Supabase unreachable/unconfigured — cannot verify publicity → 503.
      return NextResponse.json(
        {
          error: "Unable to verify property",
          code: "SUPABASE_UNAVAILABLE",
          available: false,
          blockedDates: [],
        },
        { status: 503 }
      );
    }

    if (listingId === null) {
      return NextResponse.json(
        { error: "Property not found", available: false, blockedDates: [] },
        { status: 404 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const checkIn = searchParams.get("checkIn");
    const checkOut = searchParams.get("checkOut");
    const guests = parseInt(searchParams.get("guests") ?? "1", 10);

    // ── Specific-date request: full fail-closed validation governs the result.
    // The full assert fetches a calendar covering the ENTIRE stay — dates
    // beyond the 90-day window below are validated there, NOT re-derived from
    // the (possibly truncated) window blockedDates list. So we return the
    // authoritative assert verdict and a blockedDates derived from the window
    // only when the stay falls entirely within it.
    //
    // Order: run the window fetch first (for blockedDates), then apply the
    // assert verdict last so it can never be overridden by window data.

    // ── Calendar window: fresh Hostaway data only, fail closed ──
    // Note: the Supabase calendar_blocks mirror is intentionally no longer
    // trusted for availability decisions — a stale mirror could show a
    // blocked night as free. The Hostaway calendar is the source of truth.
    const [listingRes, calRes] = await Promise.allSettled([
      hostawayGet<HostawayListingResponse>(
        `/listings/${listingId}?includeResources=1`,
        0
      ),
      hostawayGet<HostawayCalendarResponse>(
        `/listings/${listingId}/calendar?startDate=${startStr}&endDate=${endStr}`,
        0
      ),
    ]);

    if (listingRes.status === "rejected" || !listingRes.value?.result) {
      return NextResponse.json(
        {
          error: "Unable to verify listing status",
          code: "HOSTAWAY_UNAVAILABLE",
          available: false,
          blockedDates: [],
        },
        { status: 503 }
      );
    }
    if (!isHostawayListingEligible(listingRes.value.result)) {
      return NextResponse.json(
        {
          error: "Property is not currently bookable",
          code: "LISTING_INELIGIBLE",
          available: false,
          blockedDates: [],
          listingId,
        },
        { status: 404 }
      );
    }

    if (calRes.status === "rejected" || !Array.isArray(calRes.value?.result)) {
      return NextResponse.json(
        {
          error: "Unable to verify availability",
          code: "HOSTAWAY_UNAVAILABLE",
          available: false,
          blockedDates: [],
          listingId,
        },
        { status: 503 }
      );
    }

    const entries = calRes.value.result;
    // Fail closed on calendar gaps: if any day in the window is missing from
    // the API response we cannot trust the availability picture.
    const expectedDays: string[] = [];
    const cursor = new Date(today);
    while (cursor <= endDate) {
      expectedDays.push(fmt(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    const gapCheck = validateCalendar(expectedDays, entries);
    if (!gapCheck.ok && gapCheck.code === "CALENDAR_INCOMPLETE") {
      return NextResponse.json(
        {
          error: gapCheck.message ?? "Calendar data incomplete",
          code: "CALENDAR_INCOMPLETE",
          available: false,
          blockedDates: [],
          listingId,
        },
        { status: 503 }
      );
    }

    const blockedDates = entries
      .filter(
        (e) =>
          e.isAvailable === 0 ||
          e.status === "blocked" ||
          e.status === "reserved"
      )
      .map((e) => e.date);

    let available = true;
    if (checkIn && checkOut) {
      const overnights = enumerateOvernights(checkIn, checkOut) ?? [];
      available = overnights.length > 0 && overnights.every((d) => !blockedDates.includes(d));
    }

    // Full assert runs LAST and governs: it fetches a calendar for the entire
    // stay (even beyond the 90-day window) and checks eligibility, capacity,
    // per-arrival min stay, gaps, and blocks. Its verdict wins over any
    // window-derived `available` above.
    if (checkIn && checkOut) {
      try {
        await assertHostawayBookable(listingId, checkIn, checkOut, guests);
        available = true; // full-stay validation is authoritative
      } catch (err) {
        if (err instanceof BookabilityError) {
          return NextResponse.json(
            {
              error: err.message,
              code: err.code,
              available: false,
              listingId,
              ...(err.code === "DATES_UNAVAILABLE" ? { blockedDates: [checkIn] } : {}),
            },
            { status: err.status }
          );
        }
        throw err;
      }
    }

    // Window gap check (only for days we display a calendar for) — already
    // returned 503 above if the window calendar was incomplete.

    return NextResponse.json({ available, blockedDates, listingId });
  } catch (err) {
    console.error(`[/api/stays/${slug}/availability] Error:`, err);
    return NextResponse.json(
      { error: "Failed to fetch availability", available: false, blockedDates: [] },
      { status: 500 }
    );
  }
}
