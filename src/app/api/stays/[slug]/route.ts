import { NextRequest, NextResponse } from "next/server";
import {
  hostawayGet,
  mapToProperty,
  type HostawayListingResponse,
} from "@/lib/hostaway";

export const dynamic = "force-dynamic";
export const revalidate = 300;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  if (!slug || isNaN(Number(slug))) {
    return NextResponse.json({ error: "Invalid listing ID" }, { status: 400 });
  }

  try {
    const data = await hostawayGet<HostawayListingResponse>(
      `/listings/${slug}?includeResources=1`
    );

    if (!data?.result) {
      return NextResponse.json({ error: "Listing not found" }, { status: 404 });
    }

    const stay = mapToProperty(data.result);
    return NextResponse.json({ stay });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const stack = err instanceof Error ? err.stack : ''
    console.error(`[/api/stays/${slug}] Error:`, msg, stack);
    return NextResponse.json(
      { error: "Failed to fetch listing", detail: msg },
      { status: 500 }
    );
  }
}
