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
    const data = await hostawayGet<HostawayListingResponse>(
      `/listings/${listingId}?includeResources=1`
    );

    if (!data?.result) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    const listing = data.result;
    const nightlyRate = listing.price ?? 0;
    const cleaningFee = listing.cleaningFee ?? 0;
    const subtotal = nights * nightlyRate + cleaningFee;

    return NextResponse.json({
      nights,
      nightlyRate,
      cleaningFee,
      subtotal,
      currency: "AUD",
      guests,
    });
  } catch (err) {
    console.error("[/api/quote] Error:", err);
    return NextResponse.json(
      { error: "Failed to calculate quote" },
      { status: 500 }
    );
  }
}
