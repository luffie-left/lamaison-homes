/**
 * POST /api/webhooks/paypal
 * Server-side PayPal webhook handler — PAYMENT.CAPTURE.COMPLETED safety net.
 *
 * This handler fires when PayPal confirms a capture on their side.
 * It is the authoritative fallback for cases where the client-side capture call
 * fails (browser closed mid-redirect, network drop, PayPal redirect loop, etc).
 *
 * Security: PayPal signs webhooks with PAYPAL-TRANSMISSION-SIG. We verify the
 * signature using the PayPal SDK verification API before processing anything.
 *
 * ENV required:
 *   PAYPAL_CLIENT_ID
 *   PAYPAL_CLIENT_SECRET
 *   PAYPAL_ENVIRONMENT        (sandbox | live)
 *   PAYPAL_WEBHOOK_ID         — from PayPal Developer dashboard (per webhook endpoint)
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   RESEND_API_KEY            (optional — sends confirmation email if not already sent)
 *   EMAIL_FROM                (optional)
 *   NEXT_PUBLIC_SITE_URL
 *
 * Register this URL in PayPal Developer Dashboard → Webhooks:
 *   https://lamaison-homes.vercel.app/api/webhooks/paypal
 * Events to subscribe:
 *   - PAYMENT.CAPTURE.COMPLETED
 *   - PAYMENT.CAPTURE.DENIED
 *   - PAYMENT.CAPTURE.REVERSED
 *   - CHECKOUT.ORDER.COMPLETED
 */

import { NextRequest, NextResponse } from "next/server";
import { capturePayPalOrder } from "@/lib/paypal";
import { createHostawayReservation } from "@/lib/hostaway-reservations";

export const dynamic = "force-dynamic";

const PAYPAL_BASE =
  process.env.PAYPAL_ENVIRONMENT === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\n/g, "");
const SERVICE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").replace(/\n/g, "");
const RESEND_API_KEY = (process.env.RESEND_API_KEY ?? "").replace(/\n/g, "");
const EMAIL_FROM = (process.env.EMAIL_FROM ?? "La Maison Homes <onboarding@resend.dev>").replace(/\n/g, "");
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://lamaison-homes.vercel.app").replace(/\n/g, "");
const WEBHOOK_ID = (process.env.PAYPAL_WEBHOOK_ID ?? "").replace(/\n/g, "");

// ─── PayPal signature verification ────────────────────────────────────────────

async function getPayPalToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID ?? "";
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET ?? "";
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`PayPal token failed: ${res.status}`);
  const data = await res.json();
  return data.access_token;
}

async function verifyWebhookSignature(
  headers: Record<string, string>,
  rawBody: string
): Promise<boolean> {
  if (!WEBHOOK_ID) {
    // WEBHOOK_ID not set — skip verification in dev, fail in production
    if (process.env.PAYPAL_ENVIRONMENT === "live") {
      console.error("[paypal-webhook] PAYPAL_WEBHOOK_ID not set — rejecting in live mode");
      return false;
    }
    console.warn("[paypal-webhook] PAYPAL_WEBHOOK_ID not set — skipping sig verify in sandbox");
    return true;
  }

  try {
    const token = await getPayPalToken();
    const res = await fetch(`${PAYPAL_BASE}/v1/notifications/verify-webhook-signature`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        auth_algo: headers["paypal-auth-algo"],
        cert_url: headers["paypal-cert-url"],
        transmission_id: headers["paypal-transmission-id"],
        transmission_sig: headers["paypal-transmission-sig"],
        transmission_time: headers["paypal-transmission-time"],
        webhook_id: WEBHOOK_ID,
        webhook_event: JSON.parse(rawBody),
      }),
    });

    if (!res.ok) {
      console.error("[paypal-webhook] Signature verification API failed:", res.status);
      return false;
    }

    const data = await res.json();
    return data.verification_status === "SUCCESS";
  } catch (err) {
    console.error("[paypal-webhook] Signature verification error:", err);
    return false;
  }
}

// ─── Supabase helpers ─────────────────────────────────────────────────────────

async function findLeadByPaypalOrderId(orderId: string) {
  if (!SUPABASE_URL || !SERVICE_KEY) return null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/leads?paypal_order_id=eq.${encodeURIComponent(orderId)}&select=*`,
      {
        headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
        cache: "no-store",
      }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  } catch {
    return null;
  }
}

async function markLeadPaid(
  leadId: string,
  captureId: string,
  payerEmail: string | null,
  rawPayload: unknown
) {
  if (!SUPABASE_URL || !SERVICE_KEY) return false;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/leads?id=eq.${encodeURIComponent(leadId)}`,
      {
        method: "PATCH",
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify({
          status: "confirmed",
          payment_status: "paid",
          paypal_capture_id: captureId,
          paypal_payer_email: payerEmail,
          paid_at: new Date().toISOString(),
          paypal_raw_capture: JSON.stringify(rawPayload),
          webhook_confirmed: true,
        }),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

// ─── Email confirmation (fallback send if not already sent) ───────────────────

async function sendConfirmationEmail(lead: {
  email: string;
  name: string;
  property_name?: string;
  reference?: string;
  check_in?: string;
  check_out?: string;
  nights?: number;
  total_amount?: number;
  portal_token?: string;
}, captureId: string | null) {
  if (!RESEND_API_KEY) return;

  const firstName = lead.name.split(" ")[0];
  const portalUrl = `${SITE_URL}/portal?token=${lead.portal_token ?? ""}`;
  const propName = lead.property_name ?? "your La Maison property";

  function formatDate(iso?: string) {
    if (!iso) return "—";
    try { return new Date(iso).toLocaleDateString("en-AU", { weekday: "long", year: "numeric", month: "long", day: "numeric" }); }
    catch { return iso; }
  }
  function formatCurrency(n?: number) {
    if (!n) return "—";
    return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n);
  }

  const html = `
<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f7f2eb;font-family:Georgia,serif;">
<div style="max-width:600px;margin:0 auto;padding:40px 20px;">
  <div style="background:#1a1a1a;padding:24px 32px;border-radius:12px 12px 0 0;">
    <p style="color:#c9a96e;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 4px;">La Maison Homes</p>
    <p style="color:#fff;font-size:20px;margin:0;font-weight:normal;">✓ Booking confirmed</p>
  </div>
  <div style="background:#fff;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e8e0d6;border-top:none;">
    <p style="color:#1a1a1a;font-size:16px;margin:0 0 24px;">Hi ${firstName},</p>
    <p style="color:#5a5a5a;line-height:1.7;margin:0 0 24px;">Your payment has been received and your booking at <strong>${propName}</strong> is confirmed.</p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin:0 0 24px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:6px 0;color:#166534;font-size:13px;width:40%;">Reference</td>
            <td style="padding:6px 0;color:#14532d;font-size:13px;font-family:monospace;font-weight:bold;">${lead.reference ?? "—"}</td></tr>
        <tr><td style="padding:6px 0;color:#166534;font-size:13px;">Check-in</td>
            <td style="padding:6px 0;color:#14532d;font-size:13px;">${formatDate(lead.check_in)}</td></tr>
        <tr><td style="padding:6px 0;color:#166534;font-size:13px;">Check-out</td>
            <td style="padding:6px 0;color:#14532d;font-size:13px;">${formatDate(lead.check_out)}</td></tr>
        <tr><td style="padding:6px 0;color:#166534;font-size:13px;">Amount paid</td>
            <td style="padding:6px 0;color:#14532d;font-size:13px;font-weight:bold;">${formatCurrency(lead.total_amount)} AUD</td></tr>
        ${captureId ? `<tr><td style="padding:6px 0;color:#166534;font-size:13px;">PayPal ref</td>
            <td style="padding:6px 0;color:#14532d;font-size:11px;font-family:monospace;">${captureId}</td></tr>` : ""}
      </table>
    </div>
    <p style="color:#5a5a5a;font-size:14px;line-height:1.7;margin:0 0 24px;">Check-in instructions and property access details will be sent 48 hours before arrival.</p>
    <a href="${portalUrl}" style="display:block;background:#1a1a1a;color:#fff;text-align:center;padding:14px 24px;border-radius:50px;text-decoration:none;font-size:14px;margin:0 0 24px;">View booking details →</a>
    <p style="color:#aaa;font-size:13px;">Questions? <a href="mailto:bookings@lamaisonhomes.com.au" style="color:#c9a96e;">bookings@lamaisonhomes.com.au</a></p>
  </div>
</div></body></html>`;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [lead.email],
        subject: `Booking confirmed — ${propName} · Ref: ${lead.reference ?? "—"}`,
        html,
      }),
    });
  } catch (err) {
    console.error("[paypal-webhook] Email send failed:", err);
  }
}

// ─── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // 1. Read raw body (needed for signature verification)
  const rawBody = await req.text();

  // 2. Extract PayPal signature headers
  const headers: Record<string, string> = {
    "paypal-auth-algo": req.headers.get("paypal-auth-algo") ?? "",
    "paypal-cert-url": req.headers.get("paypal-cert-url") ?? "",
    "paypal-transmission-id": req.headers.get("paypal-transmission-id") ?? "",
    "paypal-transmission-sig": req.headers.get("paypal-transmission-sig") ?? "",
    "paypal-transmission-time": req.headers.get("paypal-transmission-time") ?? "",
  };

  // 3. Verify signature (reject if invalid)
  const isValid = await verifyWebhookSignature(headers, rawBody);
  if (!isValid) {
    console.warn("[paypal-webhook] Invalid signature — rejecting");
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  // 4. Parse event
  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = event.event_type as string;
  const resource = event.resource as Record<string, unknown> | undefined;

  console.log(`[paypal-webhook] Received: ${eventType}`);

  // ─── Handle: PAYMENT.CAPTURE.COMPLETED ─────────────────────────────────────
  if (eventType === "PAYMENT.CAPTURE.COMPLETED") {
    const captureId = resource?.id as string | undefined;
    const orderId = (resource?.supplementary_data as Record<string, unknown> | undefined)
      ?.related_ids
      ? ((resource.supplementary_data as Record<string, unknown>).related_ids as Record<string, string>)?.order_id
      : undefined;

    // Try to find the order ID from the resource links or purchase units
    const orderIdFallback =
      orderId ??
      (resource?.links as Array<{ rel: string; href: string }> | undefined)
        ?.find((l) => l.rel === "up")
        ?.href.split("/")
        .pop();

    const payerEmail =
      (event.resource as Record<string, unknown> | undefined)?.payer_email as string | undefined ??
      null;

    if (!captureId) {
      console.error("[paypal-webhook] PAYMENT.CAPTURE.COMPLETED missing captureId");
      return NextResponse.json({ received: true }); // Acknowledge to stop retries
    }

    if (!orderIdFallback) {
      console.error("[paypal-webhook] PAYMENT.CAPTURE.COMPLETED missing orderId — cannot match lead");
      return NextResponse.json({ received: true });
    }

    // Find matching lead
    const lead = await findLeadByPaypalOrderId(orderIdFallback);

    if (!lead) {
      console.warn(`[paypal-webhook] No lead found for order ${orderIdFallback} — may have been processed client-side already`);
      return NextResponse.json({ received: true });
    }

    // Idempotency: already paid
    if (lead.payment_status === "paid" && lead.status === "confirmed") {
      console.log(`[paypal-webhook] Lead ${lead.id} already confirmed — skipping`);
      return NextResponse.json({ received: true });
    }

    // Mark lead as paid
    const updated = await markLeadPaid(lead.id, captureId, payerEmail ?? null, event.resource);

    if (!updated) {
      console.error(`[paypal-webhook] Failed to update lead ${lead.id} — will retry`);
      return NextResponse.json({ error: "DB update failed" }, { status: 500 }); // PayPal will retry
    }

    console.log(`[paypal-webhook] Lead ${lead.id} (${lead.reference}) marked as paid via webhook`);

    // Push to Hostaway (if not already done by client-side capture)
    if (!lead.hostaway_reservation_id) {
      const hostawayResult = await createHostawayReservation({
        listingId: lead.listing_id,
        guestName: lead.name,
        guestEmail: lead.email,
        guestPhone: lead.phone ?? null,
        checkIn: lead.check_in,
        checkOut: lead.check_out,
        nights: lead.nights ?? 1,
        guests: lead.num_guests ?? 1,
        totalPrice: lead.total_amount ?? 0,
        cleaningFee: lead.cleaning_fee ?? 0,
        reference: lead.reference ?? orderIdFallback,
        paypalCaptureId: captureId,
        paypalOrderId: orderIdFallback,
      }).catch((err: unknown) => {
        console.error("[paypal-webhook] Hostaway push failed:", err);
        return { ok: false, error: String(err) };
      });

      if (hostawayResult.ok) {
        // Update lead with Hostaway reservation ID
        await fetch(
          `${SUPABASE_URL}/rest/v1/leads?id=eq.${encodeURIComponent(lead.id)}`,
          {
            method: "PATCH",
            headers: {
              apikey: SERVICE_KEY,
              Authorization: `Bearer ${SERVICE_KEY}`,
              "Content-Type": "application/json",
              Prefer: "return=minimal",
            },
            body: JSON.stringify({ hostaway_reservation_id: hostawayResult.hostawayReservationId }),
          }
        ).catch(console.error);
        console.log(`[paypal-webhook] Hostaway reservation created: ${hostawayResult.hostawayReservationId}`);
      } else {
        console.error(`[paypal-webhook] ⚠️ HOSTAWAY PUSH FAILED for lead ${lead.id} — calendar NOT blocked!`);
      }
    }

    // Send confirmation email if not yet sent (payment_status was not 'paid' before)
    sendConfirmationEmail(lead, captureId).catch(console.error);

    return NextResponse.json({ received: true });
  }

  // ─── Handle: PAYMENT.CAPTURE.DENIED / REVERSED ─────────────────────────────
  if (eventType === "PAYMENT.CAPTURE.DENIED" || eventType === "PAYMENT.CAPTURE.REVERSED") {
    const orderId = (resource?.supplementary_data as Record<string, unknown> | undefined)
      ?.related_ids
      ? ((resource!.supplementary_data as Record<string, unknown>).related_ids as Record<string, string>)?.order_id
      : undefined;

    if (orderId) {
      const lead = await findLeadByPaypalOrderId(orderId);
      if (lead) {
        await fetch(
          `${SUPABASE_URL}/rest/v1/leads?id=eq.${encodeURIComponent(lead.id)}`,
          {
            method: "PATCH",
            headers: {
              apikey: SERVICE_KEY,
              Authorization: `Bearer ${SERVICE_KEY}`,
              "Content-Type": "application/json",
              Prefer: "return=minimal",
            },
            body: JSON.stringify({ payment_status: "failed", status: "cancelled" }),
          }
        ).catch(console.error);
        console.log(`[paypal-webhook] Lead ${lead.id} marked failed/cancelled (${eventType})`);
      }
    }
    return NextResponse.json({ received: true });
  }

  // ─── All other events: acknowledge ─────────────────────────────────────────
  return NextResponse.json({ received: true });
}
