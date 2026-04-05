import { NextRequest, NextResponse } from "next/server";
import {
  hostawayGet,
  type HostawayCalendarResponse,
} from "@/lib/hostaway";

export const revalidate = 0; // Always fresh for availability

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  if (!slug || isNaN(Number(slug))) {
    return NextResponse.json({ error: "Invalid listing ID" }, { status: 400 });
  }

  const today = new Date();
  const endDate = new Date(today);
  endDate.setDate(today.getDate() + 90);

  const fmt = (d: Date) => d.toISOString().split("T")[0];

  try {
    const data = await hostawayGet<HostawayCalendarResponse>(
      `/listings/${slug}/calendar?startDate=${fmt(today)}&endDate=${fmt(endDate)}`,
      0 // no cache for availability
    );

    const entries = data?.result ?? [];

    const blockedDates = entries
      .filter(
        (e) => e.isAvailable === 0 || e.status === "blocked" || e.status === "reserved"
      )
      .map((e) => e.date);

    // Check if requested dates (if any) are available
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

    return NextResponse.json({ available, blockedDates });
  } catch (err) {
    console.error(`[/api/stays/${slug}/availability] Error:`, err);
    return NextResponse.json(
      { error: "Failed to fetch availability", available: false, blockedDates: [] },
      { status: 500 }
    );
  }
}
