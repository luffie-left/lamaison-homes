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
import { capturePayPalOrder, verifyPayPalOrder } from '@/lib/paypal'
import { createHostawayReservation } from '@/lib/hostaway-reservations'
import { paymentMethodLabel, paypalEnvironment } from '@/lib/payment-details'
import { assertHostawayBookable, BookabilityError } from '@/lib/hostaway-bookability'
import { claimableFilter, decideLostClaim } from '@/lib/capture-claim'

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
        <tr><td style="padding:6px 0;color:#166534;font-size:13px;">Payment method</td>
            <td style="padding:6px 0;color:#14532d;font-size:13px;">${paymentMethodLabel(paypalEnvironment(process.env.PAYPAL_ENVIRONMENT))}</td></tr>
        ${opts.captureId ? `<tr><td style="padding:6px 0;color:#166534;font-size:13px;">PayPal transaction ID</td>
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
      Questions? <a href="mailto:stay@lamaisonhomes.com.au" style="color:#c9a96e;">stay@lamaisonhomes.com.au</a>
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
    // orderId optional: falls back to lead.paypal_order_id when PayPal returns
    // to the success page without an explicit orderId param.
    const { orderId, portalToken } = body

    if (!portalToken) {
      return NextResponse.json(
        { error: 'portalToken is required' },
        { status: 400 }
      )
    }
    if (!orderId) {
      console.warn('[capture] No orderId in request — will fall back to stored paypal_order_id')
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

    // Avoid duplicate sequential captures. Concurrent attempts still require an
    // atomic processing claim; this preview is not production-ready. A paid lead without PMS linkage needs manual
    // reconciliation — not a second charge and not a booking confirmation.
    if (lead.payment_status === 'paid') {
      if (!lead.hostaway_reservation_id) {
        return NextResponse.json({ success: false, paymentCaptured: true, needsReview: true, reference: lead.reference, captureId: lead.paypal_capture_id, error: 'Payment was captured but your booking needs review. Please contact us; do not pay again.' }, { status: 409 })
      }
      return NextResponse.json({ success: true, reference: lead.reference, captureId: lead.paypal_capture_id, hostawayReservationId: lead.hostaway_reservation_id, alreadyPaid: true })
    }

    // RACE GUARD (T012, P1 fix): atomically claim the pre-payment→processing
    // transition BEFORE charging PayPal. Exactly one concurrent request
    // (capture vs webhook) can win; losers must not charge, re-book, or
    // re-email. Claimable set is unpaid|pending|payment_failed (P1 root cause:
    // 'pending' rows — written by create-order — were never claimable, which
    // dead-ended every success-page visit into a permanent 409).
    // Idempotency guard: 'paid'/'processing' (fresh) are NOT in the filter set,
    // so a failed-retry claim can never clobber a paid or actively-processing row.
    const claimRes = await fetch(
      `${SUPABASE_URL}/rest/v1/leads?id=eq.${encodeURIComponent(lead.id)}&payment_status=in.${claimableFilter()}`,
      {
        method: 'PATCH',
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify({
          // Processing claim — payment_status stays 'processing' until capture
          // completes; the webhook safety net can still take over from here.
          payment_status: 'processing',
          // Lease timestamp: staleness detection (see capture-claim.ts). Cleared
          // implicitly by the paid transition; stale leases are re-claimable.
          processing_claimed_at: new Date().toISOString(),
        }),
      }
    )
    if (!claimRes.ok) {
      console.error('[capture] Claim patch failed:', await claimRes.text())
      return NextResponse.json({ error: 'Failed to claim booking for processing' }, { status: 500 })
    }
    const claimed = await claimRes.json()
    if (!Array.isArray(claimed) || claimed.length === 0) {
      // Lost the claim race. Reread the lead (P1 fix) and decide precisely:
      // paid → render success; stale lease → reclaim; fresh lease → retry.
      console.warn('[capture] Lost processing race for lead', lead.id)
      const rereadRes = await fetch(
        `${SUPABASE_URL}/rest/v1/leads?id=eq.${encodeURIComponent(lead.id)}&select=payment_status,processing_claimed_at,hostaway_reservation_id,paypal_capture_id,reference`,
        { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }, cache: 'no-store' }
      )
      if (!rereadRes.ok) {
        return NextResponse.json({ success: false, paymentCaptured: false, retryShortly: true, state: 'verifying', error: 'We are confirming your payment — please refresh in a moment.' }, { status: 409 })
      }
      const reread = (await rereadRes.json()) as Array<Record<string, unknown>>
      const after = reread?.[0]
      if (!after) {
        return NextResponse.json({ error: 'Lead not found after claim race' }, { status: 404 })
      }
      const action = decideLostClaim({ payment_status: String(after.payment_status), processing_claimed_at: (after.processing_claimed_at as string | null) ?? null })
      if (action.kind === 'render-success') {
        return NextResponse.json({ success: true, reference: after.reference ?? lead.reference, captureId: after.paypal_capture_id ?? null, hostawayReservationId: after.hostaway_reservation_id ?? null, alreadyPaid: true })
      }
      if (action.kind === 'reclaim') {
        // Stale lease (or a claimable state re-observed): attempt one re-claim.
        // The claim PATCH remains state-filtered, so this can never clobber a
        // paid row that raced in between, and can only take 'processing' when
        // the previous holder wrote a stale lease (we also re-filter on it).
        const reclaimRes = await fetch(
          `${SUPABASE_URL}/rest/v1/leads?id=eq.${encodeURIComponent(lead.id)}&payment_status=in.${claimableFilter()}`,
          {
            method: 'PATCH',
            headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
            body: JSON.stringify({ payment_status: 'processing', processing_claimed_at: new Date().toISOString() }),
          }
        )
        const reclaimed = reclaimRes.ok ? await reclaimRes.json() : []
        if (Array.isArray(reclaimed) && reclaimed.length > 0) {
          // Re-claimed under this request — fall through to normal capture below
          // using the existing lead object (still valid: not paid).
        } else {
          // Someone else won the re-claim — genuine concurrent processing now.
          return NextResponse.json({ success: false, paymentCaptured: false, retryShortly: true, state: 'retry_shortly', error: 'Booking is being processed — please wait a moment and refresh.' }, { status: 409 })
        }
      } else {
        // Fresh, active lease held by another handler (capture or webhook).
        return NextResponse.json({ success: false, paymentCaptured: false, retryShortly: true, state: 'retry_shortly', error: 'Booking is being processed — please wait a moment and refresh.' }, { status: 409 })
      }
    }
    // NOTE on claim lifecycle: if this request fails after claiming (capture
    // error, DB error, Hostaway failure), payment_status remains 'processing'
    // with a lease timestamp. The PayPal webhook safety net can complete the
    // paid transition from 'processing', and any capture attempt after
    // LEASE_STALE_AFTER_MS (5 min) may re-claim safely (filters prevent
    // double-charge against a paid row).

    // Verify the PayPal order ID matches what we stored (prevents order swapping).
    // If no orderId in URL, fall back to the stored paypal_order_id on the lead.
    const effectiveOrderId = orderId ?? lead.paypal_order_id
    if (!effectiveOrderId) {
      return NextResponse.json({ error: 'No PayPal order ID for this booking' }, { status: 400 })
    }
    if (lead.paypal_order_id && lead.paypal_order_id !== effectiveOrderId) {
      console.error('[capture] Order ID mismatch — stored:', lead.paypal_order_id, 'received:', effectiveOrderId)
      return NextResponse.json({ error: 'Order ID mismatch' }, { status: 400 })
    }

    // Recheck the actual stored booking immediately before charging. A quote
    // or a previously created PayPal order is not a reservation or calendar hold.
    const propertyRes = await fetch(
      `${SUPABASE_URL}/rest/v1/properties?hostaway_listing_id=eq.${encodeURIComponent(lead.listing_id)}&is_active=eq.true&is_published=eq.true&select=id&limit=1`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }, cache: 'no-store' }
    )
    if (!propertyRes.ok) return NextResponse.json({ error: 'Unable to verify property publication; payment not captured' }, { status: 503 })
    const properties = await propertyRes.json()
    if (!Array.isArray(properties) || properties.length === 0) {
      return NextResponse.json({ error: 'This property is not available; payment not captured' }, { status: 409 })
    }
    await assertHostawayBookable(Number(lead.listing_id), lead.check_in, lead.check_out, Number(lead.num_guests))

    // Verify order identity and amount with PayPal before taking payment.
    const order = await verifyPayPalOrder(effectiveOrderId)
    const expectedAmount = Number(lead.total_amount)
    if (lead.total_amount === null || lead.total_amount === undefined || !order.verified || order.status !== 'APPROVED' || !Number.isFinite(expectedAmount) || order.amount === null || Math.abs(order.amount - expectedAmount) > 0.02 || order.currency !== 'AUD' || order.reference !== lead.reference) {
      return NextResponse.json({ error: 'PayPal order details do not match this booking; payment not captured' }, { status: 409 })
    }

    // --- Capture the PayPal order ---
    const captureResult = await capturePayPalOrder(effectiveOrderId)

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
          // Payment is authoritative; booking remains pending until Hostaway accepts it.
          payment_status: 'paid',
          // payment is now durable; claim released implicitly by the transition
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

    // --- Push reservation to Hostaway (blocks calendar on all channels) ---
    // Run after payment is durably recorded. Payment and booking statuses remain separate.
    // Launch blocker: a capture/webhook atomic claim is still required to prevent races.
    const hostawayResult: { ok: boolean; hostawayReservationId?: number; error?: string } =
      await createHostawayReservation({
        listingId: lead.listing_id,
        guestName: lead.name,
        guestEmail: lead.email,
        guestPhone: lead.phone ?? null,
        checkIn: lead.check_in,
        checkOut: lead.check_out,
        nights: lead.nights ?? 1,
        guests: lead.num_guests ?? 1,
        totalPrice: captureResult.amount ?? lead.total_amount ?? 0,
        cleaningFee: lead.cleaning_fee ?? 0,
        reference: lead.reference ?? effectiveOrderId,
        paypalCaptureId: captureResult.captureId ?? '',
        paypalOrderId: effectiveOrderId,
      }).catch(err => {
        console.error('[capture] Hostaway push failed (non-fatal):', err)
        return { ok: false, error: String(err) }
      })

    if (!hostawayResult.ok || !hostawayResult.hostawayReservationId) {
      console.error(`[capture] HOSTAWAY PUSH FAILED for lead ${lead.id} (${lead.reference}): ${hostawayResult.error}`)
      return NextResponse.json({
        success: false,
        paymentCaptured: true,
        needsReview: true,
        reference: lead.reference,
        captureId: captureResult.captureId,
        error: 'Payment was captured but the booking needs review. Please contact us; do not pay again.',
      }, { status: 409 })
    }
    // The reservation ID and booking state are stored together only after PMS success.
    const bookingPatch = await fetch(
      `${SUPABASE_URL}/rest/v1/leads?id=eq.${encodeURIComponent(lead.id)}`,
      {
        method: 'PATCH',
        headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ hostaway_reservation_id: hostawayResult.hostawayReservationId, status: 'confirmed' }),
      }
    )
    if (!bookingPatch.ok) {
      console.error('[capture] Hostaway reservation exists but link update failed:', hostawayResult.hostawayReservationId)
      return NextResponse.json({ success: false, paymentCaptured: true, needsReview: true, reference: lead.reference, captureId: captureResult.captureId, error: 'Payment was captured; booking reconciliation is required. Please contact us; do not pay again.' }, { status: 500 })
    }
    console.log('[capture] Hostaway reservation created:', hostawayResult.hostawayReservationId)

    // --- Send confirmation email (non-blocking) ---
    sendPaymentConfirmationEmail({
      guestEmail: lead.email,
      guestName: lead.name,
      propertyName: lead.property_name ?? `Listing #${lead.listing_id}`,
      reference: lead.reference ?? effectiveOrderId,
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
      hostawayReservationId: hostawayResult.ok ? hostawayResult.hostawayReservationId : null,
      // A Hostaway reservation exists; channel propagation is not independently verified.
      calendarBlocked: null,
    })
  } catch (err) {
    if (err instanceof BookabilityError) {
      return NextResponse.json({ error: `${err.message}; payment not captured`, code: err.code }, { status: err.status })
    }
    console.error('[capture] Unhandled error:', err)
    return NextResponse.json({ error: 'Failed to process payment capture' }, { status: 500 })
  }
}
