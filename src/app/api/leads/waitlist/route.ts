/**
 * POST /api/leads/waitlist
 * Captures email-only waitlist signups (homepage CTA, early access).
 * Stores in Supabase leads table as type "waitlist".
 *
 * Body: { email, name?, source_page? }
 * Returns: { success: true }
 */

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\n/g, "").trim();
const SERVICE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").replace(/\n/g, "").trim();
const RESEND_API_KEY = (process.env.RESEND_API_KEY ?? "").replace(/\n/g, "").trim();
const EMAIL_FROM = (process.env.EMAIL_FROM ?? "La Maison Homes <onboarding@resend.dev>").replace(/\n/g, "").trim();

async function sendWaitlistConfirmation(email: string, name?: string) {
  if (!RESEND_API_KEY) return;
  const greeting = name ? `Hi ${name.split(" ")[0]},` : "Thanks for joining us.";
  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [email],
        subject: "You're on the La Maison waitlist",
        html: `
<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f7f2eb;font-family:Georgia,serif;">
<div style="max-width:540px;margin:0 auto;padding:40px 20px;">
  <div style="background:#1a1a1a;padding:24px 32px;border-radius:12px 12px 0 0;">
    <p style="color:#c9a96e;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0;">La Maison Homes</p>
  </div>
  <div style="background:#fff;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e8e0d6;border-top:none;">
    <p style="color:#1a1a1a;font-size:16px;margin:0 0 16px;">${greeting}</p>
    <p style="color:#5a5a5a;line-height:1.7;margin:0 0 16px;">
      You&apos;re on the list. We&apos;ll notify you as new properties become available and when early access opens.
    </p>
    <p style="color:#5a5a5a;font-size:13px;line-height:1.6;margin:0;">
      You can unsubscribe at any time by replying to this email.
    </p>
  </div>
  <p style="color:#aaa;font-size:11px;text-align:center;margin:16px 0 0;">La Maison Homes &middot; Melbourne</p>
</div></body></html>`,
      }),
    });
  } catch (err) {
    console.error("[waitlist] Email failed:", err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, name, source_page } = body;

    if (!email) {
      return NextResponse.json({ error: "email is required" }, { status: 400 });
    }

    if (!SUPABASE_URL || !SERVICE_KEY) {
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    // Upsert to avoid duplicates — if same email exists, update source_page and updated_at
    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
        // On conflict (email + lead_type), do nothing (don't re-email)
        Prefer: "return=minimal,resolution=ignore-duplicates",
      },
      body: JSON.stringify({
        name: name ?? null,
        email,
        lead_type: "waitlist",
        source_page: source_page ?? "/",
        status: "new",
      }),
    });

    if (!insertRes.ok) {
      const text = await insertRes.text();
      // Ignore duplicate key violations — person is already on the list
      if (!text.includes("duplicate") && !text.includes("unique")) {
        console.error("[waitlist] Supabase insert failed:", text);
        return NextResponse.json({ error: "Failed to join waitlist" }, { status: 500 });
      }
      // Already on waitlist — still return success (don't expose DB state)
    }

    // Send confirmation email (best-effort — don't fail request)
    sendWaitlistConfirmation(email, name).catch(console.error);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[waitlist] Error:", err);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}
