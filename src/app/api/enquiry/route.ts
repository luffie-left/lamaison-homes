import { NextRequest, NextResponse } from "next/server";
import { sendEnquiryConfirmation, sendStaffNotification } from "@/lib/email";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

function generateReference(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).toUpperCase().slice(2, 6);
  return `LM-${date}-${rand}`;
}

function nightsBetween(a: string | null, b: string | null): number | null {
  if (!a || !b) return null;
  const diff = new Date(b).getTime() - new Date(a).getTime();
  return Math.max(0, Math.round(diff / 86400000));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, listingId, checkIn, checkOut, guests, message, propertyName, total, nightlyRate, cleaningFee } = body;

    if (!name || !email || !listingId) {
      return NextResponse.json({ error: "name, email, and listingId are required" }, { status: 400 });
    }

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\n/g, "") ?? "";
    const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY?.replace(/\n/g, "") ?? "";

    if (!SUPABASE_URL || !SERVICE_KEY) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const reference = generateReference();
    const portalToken = randomUUID();
    const nights = nightsBetween(checkIn, checkOut);

    // Insert lead with all fields
    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        name,
        email,
        phone: phone ?? null,
        lead_type: "booking_enquiry",
        source_page: `/stays/${listingId}`,
        notes: message ?? null,
        status: "new",
        reference,
        portal_token: portalToken,
        property_name: propertyName ?? null,
        listing_id: listingId ? Number(listingId) : null,
        check_in: checkIn ?? null,
        check_out: checkOut ?? null,
        nights: nights,
        num_guests: guests ? Number(guests) : null,
        total_amount: total ? Number(total) : null,
        nightly_rate: nightlyRate ? Number(nightlyRate) : null,
        cleaning_fee: cleaningFee ? Number(cleaningFee) : null,
      }),
    });

    if (!insertRes.ok) {
      console.error("[/api/enquiry] Supabase insert failed:", await insertRes.text());
      return NextResponse.json({ error: "Failed to save enquiry" }, { status: 500 });
    }

    // Send emails (non-blocking — don't fail the request if email fails)
    const propName = propertyName ?? `Listing #${listingId}`;
    await Promise.allSettled([
      sendEnquiryConfirmation({
        guestEmail: email,
        guestName: name,
        propertyName: propName,
        reference,
        checkIn: checkIn ?? null,
        checkOut: checkOut ?? null,
        nights,
        guests: guests ? Number(guests) : null,
        total: total ? Number(total) : null,
        portalToken,
      }),
      sendStaffNotification({
        guestName: name,
        guestEmail: email,
        guestPhone: phone ?? null,
        propertyName: propName,
        reference,
        checkIn: checkIn ?? null,
        checkOut: checkOut ?? null,
        nights,
        guests: guests ? Number(guests) : null,
        total: total ? Number(total) : null,
        message: message ?? null,
      }),
    ]);

    return NextResponse.json({
      success: true,
      reference,
      portalToken,
      message: "We'll confirm your booking within 2 hours",
    });
  } catch (err) {
    console.error("[/api/enquiry] Error:", err);
    return NextResponse.json({ error: "Failed to process enquiry" }, { status: 500 });
  }
}
