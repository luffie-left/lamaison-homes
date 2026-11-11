import { NextRequest, NextResponse } from "next/server";
import {
  assertHostawayBookable,
  BookabilityError,
} from "@/lib/hostaway-bookability";

export const dynamic = "force-dynamic";
export const revalidate = 0; // quotes must never be cached — booking-critical

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const listingIdRaw = searchParams.get("listingId");
  const checkIn = searchParams.get("checkIn");
  const checkOut = searchParams.get("checkOut");
  const guests = parseInt(searchParams.get("guests") ?? "1", 10);

  if (!listingIdRaw || !checkIn || !checkOut) {
    return NextResponse.json(
      { error: "listingId, checkIn, and checkOut are required" },
      { status: 400 }
    );
  }

  const listingId = Number(listingIdRaw);
  if (!Number.isInteger(listingId) || listingId <= 0) {
    return NextResponse.json({ error: "Invalid listingId" }, { status: 400 });
  }

  try {
    // Fail-closed: fresh (no-store) listing eligibility + per-overnight
    // calendar validation + capacity + per-arrival minimum stay.
    // Throws BookabilityError (with .status/.code) on any failure, including
    // Hostaway outages — never returns a quote on stale/unverified data.
    const listing = await assertHostawayBookable(listingId, checkIn, checkOut, guests);

    // Dates validated — enumerate overnights (checkout night excluded).
    const start = new Date(`${checkIn}T00:00:00Z`);
    const end = new Date(`${checkOut}T00:00:00Z`);
    const nights = Math.round((end.getTime() - start.getTime()) / 86400000);

    // >28-night gate (terms v2): authoritative server-side cap. Online
    // booking limited to 28 nights until rolling block-payment automation
    // ships. Long stays are handled via contact/lead flow.
    const MAX_ONLINE_NIGHTS = 28;
    if (nights > MAX_ONLINE_NIGHTS) {
      return NextResponse.json(
        {
          error: "Online booking supports stays of up to 28 nights. For longer stays, please contact us and our team will arrange a tailored long-stay rate and payment schedule.",
          code: "MAX_NIGHTS_EXCEEDED",
        },
        { status: 400 }
      );
    }

    const nightlyRate = listing.price ?? 0;
    const cleaningFee = listing.cleaningFee ?? 0;
    const minStay = listing.minimumStay ?? 1;
    const subtotal = nights * nightlyRate + cleaningFee;

    return NextResponse.json({
      nights,
      nightlyRate,
      cleaningFee,
      subtotal,
      currency: "AUD",
      guests,
      minStay,
    });
  } catch (err) {
    if (err instanceof BookabilityError) {
      return NextResponse.json(
        {
          error: err.message,
          code: err.code,
          // DATES_UNAVAILABLE gets a `blocked: true` hint for the frontend
          ...(err.code === "DATES_UNAVAILABLE" ? { blocked: true } : {}),
        },
        { status: err.status }
      );
    }
    console.error("[/api/quote] Error:", err);
    return NextResponse.json(
      { error: "Failed to calculate quote" },
      { status: 500 }
    );
  }
}
