import { NextRequest, NextResponse } from "next/server";
import {
  hostawayGet,
  type HostawayListingResponse,
} from "@/lib/hostaway";

export const dynamic = "force-dynamic";
export const revalidate = 300;

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const listingId = searchParams.get("listingId");
  const checkIn = searchParams.get("checkIn");
  const checkOut = searchParams.get("checkOut");
  const guests = parseInt(searchParams.get("guests") ?? "1", 10);

  if (!listingId || !checkIn || !checkOut) {
    return NextResponse.json(
      { error: "listingId, checkIn, and checkOut are required" },
      { status: 400 }
    );
  }

  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);

  if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
    return NextResponse.json({ error: "Invalid dates" }, { status: 400 });
  }

  const nights = Math.round(
    (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (nights <= 0) {
    return NextResponse.json(
      { error: "Check-out must be after check-in" },
      { status: 400 }
    );
  }

  try {
    // Fetch listing details + availability in parallel
    const [data, availRes] = await Promise.allSettled([
      hostawayGet<HostawayListingResponse>(`/listings/${listingId}?includeResources=1`),
      hostawayGet<{ result: Array<{ date: string; isAvailable: number; status: string; minimumStay?: number }> }>(
        `/listings/${listingId}/calendar?startDate=${checkIn}&endDate=${checkOut}`,
        0 // no cache for availability
      ),
    ]);

    if (data.status === 'rejected' || !data.value?.result) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    const listing = data.value.result;
    const nightlyRate = listing.price ?? 0;
    const cleaningFee = listing.cleaningFee ?? 0;
    const minStay = listing.minimumStay ?? 1;

    // Minimum stay validation
    if (nights < minStay) {
      return NextResponse.json(
        { error: `Minimum stay is ${minStay} night${minStay !== 1 ? 's' : ''} for this property.`, minStay },
        { status: 400 }
      );
    }

    // Availability check from calendar
    if (availRes.status === 'fulfilled' && availRes.value?.result) {
      const calEntries = availRes.value.result;
      const blockedEntry = calEntries.find(
        (e) => e.isAvailable === 0 || e.status === 'blocked' || e.status === 'reserved'
      );
      if (blockedEntry) {
        return NextResponse.json(
          { error: "These dates are not available. Please choose different dates.", blocked: true },
          { status: 409 }
        );
      }
    }

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
    console.error("[/api/quote] Error:", err);
    return NextResponse.json(
      { error: "Failed to calculate quote" },
      { status: 500 }
    );
  }
}
