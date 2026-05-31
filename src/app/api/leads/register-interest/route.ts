/**
 * POST /api/leads/register-interest
 * Captures high-intent guest leads who aren't ready to book.
 * Stores in Supabase leads table as type "register_interest".
 *
 * Body: { name, email, phone?, message?, suburb?, checkIn?, checkOut?, guests?, source_page? }
 * Returns: { success: true, reference }
 */

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\n/g, "").trim();
const SERVICE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").replace(/\n/g, "").trim();
const RESEND_API_KEY = (process.env.RESEND_API_KEY ?? "").replace(/\n/g, "").trim();
const EMAIL_FROM = (process.env.EMAIL_FROM ?? "La Maison Homes <onboarding@resend.dev>").replace(/\n/g, "").trim();
const STAFF_EMAIL = (process.env.STAFF_NOTIFICATION_EMAIL ?? "bookings@lamaisonhomes.com.au").replace(/\n/g, "").trim();

function generateReference(): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).toUpperCase().slice(2, 6);
  return `LMI-${date}-${rand}`;
}

async function sendAcknowledgementEmail(opts: {
  guestEmail: string;
  guestName: string;
  reference: string;
}) {
  if (!RESEND_API_KEY) return;
  const firstName = opts.guestName.split(" ")[0];
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [opts.guestEmail],
        subject: "La Maison Homes — We've received your interest",
        html: `
<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f7f2eb;font-family:Georgia,serif;">
<div style="max-width:580px;margin:0 auto;padding:40px 20px;">
  <div style="background:#1a1a1a;padding:24px 32px;border-radius:12px 12px 0 0;">
    <p style="color:#c9a96e;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0;">La Maison Homes</p>
  </div>
  <div style="background:#fff;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e8e0d6;border-top:none;">
    <p style="color:#1a1a1a;font-size:16px;margin:0 0 16px;">Hi ${firstName},</p>
    <p style="color:#5a5a5a;line-height:1.7;margin:0 0 16px;">
      Thank you for registering your interest with La Maison Homes. We&apos;ve received your details and a member of our team will be in touch shortly.
    </p>
    <p style="color:#5a5a5a;line-height:1.7;margin:0 0 24px;">
      Your reference is <strong style="font-family:monospace;">${opts.reference}</strong>.
    </p>
    <p style="color:#5a5a5a;font-size:14px;line-height:1.7;margin:0;">
      In the meantime, browse our available properties at
      <a href="https://lamaison-homes.vercel.app/stays" style="color:#c9a96e;">lamaison-homes.vercel.app/stays</a>
    </p>
  </div>
  <p style="color:#aaa;font-size:11px;text-align:center;margin:16px 0 0;">La Maison Homes &middot; Melbourne</p>
</div></body></html>`,
      }),
    });
  } catch (err) {
    console.error("[register-interest] Email failed:", err);
  }
}

async function sendStaffAlert(opts: {
  guestName: string;
  guestEmail: string;
  guestPhone?: string | null;
  suburb?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
  guests?: number | null;
  message?: string | null;
  reference: string;
  sourcePage?: string | null;
}) {
  if (!RESEND_API_KEY) return;
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [STAFF_EMAIL],
        subject: `New interest: ${opts.guestName} — ${opts.reference}`,
        html: `<pre style="font-family:monospace;font-size:13px;">
New Register Interest Lead
===========================
Ref:     ${opts.reference}
Name:    ${opts.guestName}
Email:   ${opts.guestEmail}
Phone:   ${opts.guestPhone ?? "—"}
Suburb:  ${opts.suburb ?? "—"}
Check-in: ${opts.checkIn ?? "—"}
Check-out: ${opts.checkOut ?? "—"}
Guests:  ${opts.guests ?? "—"}
Source:  ${opts.sourcePage ?? "—"}
Message: ${opts.message ?? "—"}
        </pre>`,
      }),
    });
  } catch (err) {
    console.error("[register-interest] Staff alert failed:", err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, message, suburb, checkIn, checkOut, guests, source_page } = body;

    if (!name || !email) {
      return NextResponse.json({ error: "name and email are required" }, { status: 400 });
    }

    if (!SUPABASE_URL || !SERVICE_KEY) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const reference = generateReference();
    const portalToken = randomUUID();

    const nights =
      checkIn && checkOut
        ? Math.max(0, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000))
        : null;

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
        lead_type: "register_interest",
        source_page: source_page ?? "/register-interest",
        notes: message ?? null,
        status: "new",
        reference,
        portal_token: portalToken,
        suburb: suburb ?? null,
        check_in: checkIn ?? null,
        check_out: checkOut ?? null,
        nights,
        num_guests: guests ? Number(guests) : null,
      }),
    });

    if (!insertRes.ok) {
      console.error("[register-interest] Supabase insert failed:", await insertRes.text());
      return NextResponse.json({ error: "Failed to save interest" }, { status: 500 });
    }

    // Fire-and-forget emails
    Promise.allSettled([
      sendAcknowledgementEmail({ guestEmail: email, guestName: name, reference }),
      sendStaffAlert({ guestName: name, guestEmail: email, guestPhone: phone ?? null, suburb: suburb ?? null, checkIn: checkIn ?? null, checkOut: checkOut ?? null, guests: guests ? Number(guests) : null, message: message ?? null, reference, sourcePage: source_page ?? null }),
    ]).catch(console.error);

    return NextResponse.json({ success: true, reference });
  } catch (err) {
    console.error("[register-interest] Error:", err);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
