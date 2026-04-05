import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, listingId, checkIn, checkOut, guests, message } = body;

    if (!name || !email || !listingId) {
      return NextResponse.json(
        { error: "name, email, and listingId are required" },
        { status: 400 }
      );
    }

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SERVICE_KEY) {
      console.error("[/api/enquiry] Supabase env vars not configured");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const notes = [
      checkIn ? `Check-in: ${checkIn}` : null,
      checkOut ? `Check-out: ${checkOut}` : null,
      guests ? `Guests: ${guests}` : null,
      message ? message : null,
    ]
      .filter(Boolean)
      .join(", ");

    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        name,
        email,
        phone: phone ?? null,
        lead_type: "booking_enquiry",
        source_page: `/stays/${listingId}`,
        notes,
        status: "new",
      }),
    });

    if (!insertRes.ok) {
      const errText = await insertRes.text();
      console.error("[/api/enquiry] Supabase insert failed:", insertRes.status, errText);
      return NextResponse.json(
        { error: "Failed to save enquiry" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "We'll be in touch within 2 hours",
    });
  } catch (err) {
    console.error("[/api/enquiry] Error:", err);
    return NextResponse.json(
      { error: "Failed to process enquiry" },
      { status: 500 }
    );
  }
}
