/**
 * POST /api/payment/capture
 * Server-side capture of a PayPal order after guest approval.
 * NEVER confirms from frontend alone — we re-verify amount from DB.
 *
 * Body: { orderId, portalToken }
 * Returns: { success: true, reference }
 *
 * ENV: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *      PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_ENVIRONMENT,
 *      RESEND_API_KEY, EMAIL_FROM, NEXT_PUBLIC_SITE_URL
 */

import { NextRequest, NextResponse } from 'next/server'
import { capturePayPalOrder } from '@/lib/paypal'

export const dynamic = 'force-dynamic'

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\n/g, '')
const SERVICE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').replace(/\n/g, '')
const RESEND_API_KEY = (process.env.RESEND_API_KEY ?? '').replace(/\n/g, '')
const EMAIL_FROM = (process.env.EMAIL_FROM ?? 'La Maison Homes <onboarding@resend.dev>').replace(/\n/g, '')
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://lamaison-homes.vercel.app').replace(/\n/g, '')

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-AU', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    })
  } catch { return iso }
}

function formatCurrency(n: number | null): string {
  if (!n) return '—'
  return new Intl.NumberFormat('en-AU', {
    style: 'currency', currency: 'AUD', maximumFractionDigits: 0,
  }).format(n)
}

async function sendPaymentConfirmationEmail(opts: {
  guestEmail: string
  guestName: string
  propertyName: string
  reference: string
  checkIn: string | null
  checkOut: string | null
  nights: number | null
  total: number | null
  portalToken: string
  captureId: string | null
}): Promise<void> {
  if (!RESEND_API_KEY) { console.warn('[capture] No RESEND_API_KEY'); return }

  const firstName = opts.guestName.split(' ')[0]
  const portalUrl = `${SITE_URL}/portal?token=${opts.portalToken}`

  const html = `
<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f7f2eb;font-family:Georgia,serif;">
<div style="max-width:600px;margin:0 auto;padding:40px 20px;">
  <div style="background:#1a1a1a;padding:24px 32px;border-radius:12px 12px 0 0;">
    <p style="color:#c9a96e;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin:0 0 4px;">La Maison Homes</p>
    <p style="color:#fff;font-size:20px;margin:0;font-weight:normal;">✓ Payment received &amp; booking confirmed</p>
  </div>
  <div style="background:#fff;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e8e0d6;border-top:none;">
    <p style="color:#1a1a1a;font-size:16px;margin:0 0 24px;">Hi ${firstName},</p>
    <p style="color:#5a5a5a;line-height:1.7;margin:0 0 24px;">
      Your payment has been received and your booking at <strong>${opts.propertyName}</strong> is confirmed. 🎉
    </p>

    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin:0 0 24px;">
      <p style="color:#166534;font-size:12px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;margin:0 0 12px;">✓ Confirmed &amp; Paid</p>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:6px 0;color:#166534;font-size:13px;width:40%;">Reference</td>
            <td style="padding:6px 0;color:#14532d;font-size:13px;font-family:monospace;font-weight:bold;">${opts.reference}</td></tr>
        <tr><td style="padding:6px 0;color:#166534;font-size:13px;">Property</td>
            <td style="padding:6px 0;color:#14532d;font-size:13px;">${opts.propertyName}</td></tr>
        <tr><td style="padding:6px 0;color:#166534;font-size:13px;">Check-in</td>
            <td style="padding:6px 0;color:#14532d;font-size:13px;">${formatDate(opts.checkIn)}</td></tr>
        <tr><td style="padding:6px 0;color:#166534;font-size:13px;">Check-out</td>
            <td style="padding:6px 0;color:#14532d;font-size:13px;">${formatDate(opts.checkOut)}</td></tr>
        ${opts.nights ? `<tr><td style="padding:6px 0;color:#166534;font-size:13px;">Nights</td>
            <td style="padding:6px 0;color:#14532d;font-size:13px;">${opts.nights}</td></tr>` : ''}
        ${opts.total ? `<tr><td style="padding:6px 0;color:#166534;font-size:13px;">Amount paid</td>
            <td style="padding:6px 0;color:#14532d;font-size:13px;font-weight:bold;">${formatCurrency(opts.total)} AUD</td></tr>` : ''}
        ${opts.captureId ? `<tr><td style="padding:6px 0;color:#166534;font-size:13px;">PayPal ref</td>
            <td style="padding:6px 0;color:#14532d;font-size:11px;font-family:monospace;">${opts.captureId}</td></tr>` : ''}
      </table>
    </div>

    <p style="color:#5a5a5a;font-size:14px;line-height:1.7;margin:0 0 24px;">
      Your full check-in instructions, property address, and access code will be sent <strong>48 hours before your arrival</strong>.
    </p>

    <a href="${portalUrl}" style="display:block;background:#1a1a1a;color:#fff;text-align:center;padding:14px 24px;border-radius:50px;text-decoration:none;font-size:14px;margin:0 0 24px;">
      View booking details →
    </a>

    <p style="color:#aaa;font-size:13px;line-height:1.6;margin:0;">
      Questions? <a href="mailto:bookings@lamaisonhomes.com.au" style="color:#c9a96e;">bookings@lamaisonhomes.com.au</a>
    </p>
  </div>
  <p style="color:#aaa;font-size:11px;text-align:center;margin:16px 0 0;">La Maison Homes · Premium short-stay management · Melbourne</p>
</div>
</body></html>`

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [opts.guestEmail],
        subject: `Payment confirmed — ${opts.propertyName} · Ref: ${opts.reference}`,
        html,
      }),
    })
    if (!res.ok) console.error('[capture] Resend error:', await res.text())
  } catch (err) {
    console.error('[capture] Email send failed:', err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { orderId, portalToken } = body

    if (!orderId || !portalToken) {
      return NextResponse.json(
        { error: 'orderId and portalToken are required' },
        { status: 400 }
      )
    }

    if (!SUPABASE_URL || !SERVICE_KEY) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // --- Look up lead by portalToken (includes expected total) ---
    const leadRes = await fetch(
      `${SUPABASE_URL}/rest/v1/leads?portal_token=eq.${encodeURIComponent(portalToken)}&select=*`,
      {
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
        },
        cache: 'no-store',
      }
    )

    if (!leadRes.ok) {
      console.error('[capture] Lead lookup failed:', await leadRes.text())
      return NextResponse.json({ error: 'Failed to verify lead' }, { status: 500 })
    }

    const leads = await leadRes.json()
    if (!leads || leads.length === 0) {
      return NextResponse.json({ error: 'Lead not found for this token' }, { status: 404 })
    }

    const lead = leads[0]

    // Idempotency: already confirmed + paid → return success
    if (lead.payment_status === 'paid' && lead.status === 'confirmed') {
      return NextResponse.json({ success: true, reference: lead.reference, alreadyPaid: true })
    }

    // Verify the PayPal order ID matches what we stored (prevents order swapping)
    if (lead.paypal_order_id && lead.paypal_order_id !== orderId) {
      console.error('[capture] Order ID mismatch — stored:', lead.paypal_order_id, 'received:', orderId)
      return NextResponse.json({ error: 'Order ID mismatch' }, { status: 400 })
    }

    // --- Capture the PayPal order ---
    const captureResult = await capturePayPalOrder(orderId)

    // --- Amount verification: NEVER trust frontend amount ---
    // Compare captured amount to stored expected total
    const expectedTotal = lead.total_amount ? Number(lead.total_amount) : null

    if (expectedTotal !== null && captureResult.amount !== null) {
      const diff = Math.abs(captureResult.amount - expectedTotal)
      // Allow ±$0.02 rounding tolerance
      if (diff > 0.02) {
        console.error(
          `[capture] Amount mismatch! Expected: ${expectedTotal}, Captured: ${captureResult.amount}, Order: ${orderId}`
        )
        // Log raw payload for reconciliation, but don't silently accept
        return NextResponse.json(
          {
            error: 'Payment amount mismatch — please contact support',
            expected: expectedTotal,
            captured: captureResult.amount,
          },
          { status: 422 }
        )
      }
    }

    if (!captureResult.success) {
      console.error('[capture] Capture not COMPLETED. Status:', captureResult.status, 'Raw:', JSON.stringify(captureResult.rawPayload))
      return NextResponse.json(
        { error: `PayPal capture status: ${captureResult.status}` },
        { status: 402 }
      )
    }

    // --- Update lead in Supabase ---
    const patchRes = await fetch(
      `${SUPABASE_URL}/rest/v1/leads?id=eq.${encodeURIComponent(lead.id)}`,
      {
        method: 'PATCH',
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          status: 'confirmed',
          payment_status: 'paid',
          paypal_capture_id: captureResult.captureId,
          paypal_payer_email: captureResult.payerEmail,
          paid_at: new Date().toISOString(),
          // Store raw payload for audit trail
          paypal_raw_capture: JSON.stringify(captureResult.rawPayload),
        }),
      }
    )

    if (!patchRes.ok) {
      console.error('[capture] Failed to update lead:', await patchRes.text())
      // Payment was captured but DB update failed — log urgently, return error for retry
      return NextResponse.json(
        { error: 'Payment captured but failed to update booking — please contact support immediately', captureId: captureResult.captureId },
        { status: 500 }
      )
    }

    // --- Send confirmation email (non-blocking) ---
    sendPaymentConfirmationEmail({
      guestEmail: lead.email,
      guestName: lead.name,
      propertyName: lead.property_name ?? `Listing #${lead.listing_id}`,
      reference: lead.reference ?? orderId,
      checkIn: lead.check_in,
      checkOut: lead.check_out,
      nights: lead.nights,
      total: captureResult.amount ?? lead.total_amount,
      portalToken,
      captureId: captureResult.captureId,
    }).catch(err => console.error('[capture] Email failed (non-fatal):', err))

    return NextResponse.json({
      success: true,
      reference: lead.reference,
      captureId: captureResult.captureId,
    })
  } catch (err) {
    console.error('[capture] Unhandled error:', err)
    return NextResponse.json({ error: 'Failed to process payment capture' }, { status: 500 })
  }
}
