import { NextResponse } from "next/server";
import {
  hostawayGet,
  mapToProperty,
  type HostawayListingsResponse,
} from "@/lib/hostaway";

export const dynamic = "force-dynamic";
export const revalidate = 300;

export async function GET() {
  try {
    const data = await hostawayGet<HostawayListingsResponse>(
      "/listings?limit=100&includeResources=1"
    );

    const listings = data?.result ?? [];

    // Only include active listings
    const active = listings.filter(
      (l) => !l.status || l.status === "active" || l.status === "1"
    );

    const stays = active.map(mapToProperty);

    return NextResponse.json({ stays, total: stays.length });
  } catch (err) {
    console.error("[/api/stays] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch listings", stays: [], total: 0 },
      { status: 500 }
    );
  }
}
