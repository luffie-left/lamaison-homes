import { NextRequest, NextResponse } from "next/server";
import { hostawayGet, type HostawayCalendarResponse } from "@/lib/hostaway";
import {
  isValidDateStr,
  enumerateNights,
  toDateStr,
} from "@/lib/stays-search";

export const dynamic = "force-dynamic";
export const revalidate = 0; // availability is booking-critical: always fresh

/**
 * POST /api/stays/availability
 * Body: { listingIds: number[], checkIn: "YYYY-MM-DD", checkOut: "YYYY-MM-DD" }
 * Response: { availableListingIds: number[] } — listings available EVERY night
 * in [checkIn, checkOut), verified server-side against the Hostaway calendar.
 * Fail closed: listings whose calendar cannot be fetched are NOT available.
 */

interface CalendarEntry {
  date: string;
  isAvailable: number;
}

const MAX_LISTINGS = 60; // hard cap to bound Hostaway API fan-out

export async function POST(req: NextRequest) {
  let body: { listingIds?: unknown; checkIn?: unknown; checkOut?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const listingIds = Array.isArray(body.listingIds)
    ? body.listingIds.filter((id): id is number => typeof id === "number" && Number.isInteger(id))
    : [];
  const checkIn = typeof body.checkIn === "string" ? body.checkIn : "";
  const checkOut = typeof body.checkOut === "string" ? body.checkOut : "";

  if (listingIds.length === 0) {
    return NextResponse.json({ error: "listingIds required" }, { status: 400 });
  }
  if (!isValidDateStr(checkIn) || !isValidDateStr(checkOut) || checkOut <= checkIn) {
    return NextResponse.json({ error: "checkIn/checkOut must be valid dates with checkOut after checkIn" }, { status: 400 });
  }
  // Reject ranges > 30 nights (guest stays, not permanent listings)
  if (enumerateNights(checkIn, checkOut).length > 30) {
    return NextResponse.json({ error: "Range exceeds 30 nights" }, { status: 400 });
  }
  if (checkIn < toDateStr(new Date())) {
    return NextResponse.json({ error: "checkIn cannot be in the past" }, { status: 400 });
  }

  const ids = listingIds.slice(0, MAX_LISTINGS);

  const results = await Promise.all(
    ids.map(async (id): Promise<number | null> => {
      try {
        const cal = await hostawayGet<HostawayCalendarResponse>(
          `/listings/${id}/calendar?startDate=${checkIn}&endDate=${checkOut}`,
          0
        );
        const entries: CalendarEntry[] = Array.isArray(cal?.result) ? cal.result : [];
        // Every night in range must be explicitly available (fail closed)
        const byDate = new Map(entries.map((e) => [e.date, e.isAvailable === 1]));
        const nights = enumerateNights(checkIn, checkOut);
        const ok = nights.every((n) => byDate.get(n) === true);
        return ok ? id : null;
      } catch (err) {
        console.warn(`[availability] listing ${id} calendar fetch failed — treating as unavailable:`, err);
        return null; // fail closed
      }
    })
  );

  const availableListingIds = results.filter((id): id is number => id !== null);
  return NextResponse.json({ availableListingIds });
}
