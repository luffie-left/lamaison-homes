import { NextRequest, NextResponse } from "next/server";
import {
  hostawayGet,
  type HostawayCalendarResponse,
} from "@/lib/hostaway";

export const revalidate = 0; // Always fresh for availability

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(
  /\n/g,
  ""
);
const SERVICE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").replace(
  /\n/g,
  ""
);

const fmt = (d: Date): string => d.toISOString().split("T")[0];

async function getBlockedDatesFromSupabase(
  slug: string,
  startDate: string,
  endDate: string
): Promise<string[] | null> {
  if (!SUPABASE_URL || !SERVICE_KEY) return null;

  // Look up the listing id from the slug (which IS the hostaway_listing_id as string)
  if (isNaN(Number(slug))) return null;

  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/calendar_blocks?hostaway_listing_id=eq.${slug}&date=gte.${startDate}&date=lte.${endDate}&status=neq.available&select=date`,
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

    if (!Array.isArray(data) || data.length === 0) {
      // Empty could mean: no blocks (all available) OR table not synced yet
      // We can't tell the difference, so we fall through to Hostaway
      return null;
    }

    return data.map((d: { date: string }) => d.date);
  } catch {
    return null;
  }
}

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

  const startStr = fmt(today);
  const endStr = fmt(endDate);

  try {
    // Priority 1: Check Supabase calendar_blocks
    const supabaseBlocked = await getBlockedDatesFromSupabase(
      slug,
      startStr,
      endStr
    );

    let blockedDates: string[];

    if (supabaseBlocked !== null) {
      // Supabase has data — use it
      blockedDates = supabaseBlocked;
    } else {
      // Fallback: fetch directly from Hostaway
      const data = await hostawayGet<HostawayCalendarResponse>(
        `/listings/${slug}/calendar?startDate=${startStr}&endDate=${endStr}`,
        0 // no cache for availability
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
      {
        error: "Failed to fetch availability",
        available: false,
        blockedDates: [],
      },
      { status: 500 }
    );
  }
}
