/**
 * POST /api/payment/create-order
 * Creates a PayPal order for a lead and stores the order ID in Supabase.
 * Returns { orderId, approveUrl } — client must redirect to approveUrl.
 *
 * ENV: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *      PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_ENVIRONMENT,
 *      NEXT_PUBLIC_SITE_URL
 */

import { NextRequest, NextResponse } from 'next/server'
import { createPayPalOrder } from '@/lib/paypal'
import { assertHostawayBookable, BookabilityError } from '@/lib/hostaway-bookability'

export const dynamic = 'force-dynamic'

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\n/g, '')
const SERVICE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').replace(/\n/g, '')

/**
 * Mark a lead's payment_status as 'payment_failed' (A4, additive + replay-safe).
 *
 * Guarantees:
 *  - Only ever downgrades terminal-safe states: guarded to rows currently in
 *    payment_status 'pending' or 'unpaid' — it can never touch 'paid' or
 *    'processing' (capture in flight), so replays and races are harmless.
 *  - Token-scoped (portal_token must match), so the caller must already have
 *    proven ownership of the lead.
 *  - Never throws — status marking is best-effort and must not mask the
 *    original create-order error returned to the guest.
 */
async function markLeadPaymentFailed(
  leadId: string,
  portalToken: string,
  reason: string
): Promise<void> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/leads?id=eq.${encodeURIComponent(leadId)}&portal_token=eq.${encodeURIComponent(portalToken)}&payment_status=in.(pending,unpaid)`,
      {
        method: 'PATCH',
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          payment_status: 'payment_failed',
          // Append to notes is not atomic; keep an explicit audit field instead.
          // TODO(live): verify the `payment_failed_reason` column exists in the
          // leads table (see sql-schema) — drop this field if it doesn't.
          payment_failed_reason: reason.slice(0, 200),
        }),
      }
    )
    if (!res.ok) {
      console.error('[create-order] markLeadPaymentFailed failed:', await res.text())
    }
  } catch (err) {
    console.error('[create-order] markLeadPaymentFailed error:', err)
  }
}
// Keep sandbox callbacks on their Vercel preview instead of sending a test
// buyer to the public site's (potentially different) deployed checkout code.
const SITE_URL = (
  process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NEXT_PUBLIC_SITE_URL ?? 'https://lamaison-homes.vercel.app'
).replace(/\n/g, '')

export async function POST(req: NextRequest) {
  // Hoisted so the catch block can read portalToken/leadId for A4 failure marking.
  let body: Record<string, unknown> | null = null
  try {
    body = (await req.json()) as Record<string, unknown>
    const bodyObj = body
    const {
      leadId,
      listingId,
      nights,
      propertyName,
      portalToken,
    }: {
      leadId?: string | null
      listingId?: number
      nights?: number
      propertyName?: string
      portalToken?: string
    } = bodyObj

    // --- Validate required fields ---
    // Pay Now creates the enquiry immediately before this call and authenticates
    // with its random portal token. It intentionally does not need to send the
    // database lead ID back to us.
    if (!portalToken) {
      return NextResponse.json(
        { error: 'portalToken is required' },
        { status: 400 }
      )
    }

    if (!SUPABASE_URL || !SERVICE_KEY) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // --- Verify lead exists in Supabase ---
    const leadLookup = leadId
      ? `id=eq.${encodeURIComponent(leadId)}&portal_token=eq.${encodeURIComponent(portalToken)}`
      : `portal_token=eq.${encodeURIComponent(portalToken)}`
    const leadRes = await fetch(
      `${SUPABASE_URL}/rest/v1/leads?${leadLookup}&select=id,reference,property_name,total_amount,status,payment_status,listing_id,check_in,check_out,num_guests`,
      {
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
        },
        cache: 'no-store',
      }
    )

    if (!leadRes.ok) {
      console.error('[create-order] Supabase lead lookup failed:', await leadRes.text())
      return NextResponse.json({ error: 'Failed to verify lead' }, { status: 500 })
    }

    const leads = await leadRes.json()
    if (!leads || leads.length === 0) {
      return NextResponse.json({ error: 'Lead not found or token mismatch' }, { status: 404 })
    }

    const lead = leads[0]

    // Guard: don't double-charge
    if (lead.status === 'confirmed' || lead.payment_status === 'paid') {
      return NextResponse.json(
        { error: 'This booking is already confirmed and paid' },
        { status: 409 }
      )
    }

    // Only the authenticated lead determines property/dates/guests, never the
    // request body. Fail closed on an unpublished local property or live PMS
    // outage, then check every occupied night immediately before order creation.
    const propertyRes = await fetch(
      `${SUPABASE_URL}/rest/v1/properties?hostaway_listing_id=eq.${encodeURIComponent(lead.listing_id)}&is_active=eq.true&is_published=eq.true&select=id&limit=1`,
      { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }, cache: 'no-store' }
    )
    if (!lead.listing_id || !lead.check_in || !lead.check_out || !lead.num_guests) {
      return NextResponse.json({ error: 'Booking details are incomplete' }, { status: 400 })
    }
    if (!propertyRes.ok) return NextResponse.json({ error: 'Unable to verify property publication' }, { status: 503 })
    const properties = await propertyRes.json()
    if (!Array.isArray(properties) || properties.length === 0) {
      return NextResponse.json({ error: 'This property is not available for direct booking' }, { status: 409 })
    }
    // Build a nice reference/description
    const reference = lead.reference ?? `LM-${lead.id.slice(0, 8).toUpperCase()}`
    const propName = propertyName ?? lead.property_name ?? `Listing #${listingId}`
    // Enquiries are stored from client input; rederive the price from fresh
    // Hostaway data before creating an order. Reject stale/tampered totals.
    const storedTotal = Number(lead.total_amount)
    const validatedListing = await assertHostawayBookable(Number(lead.listing_id), lead.check_in, lead.check_out, Number(lead.num_guests))
    const nightsCount = (Date.parse(`${lead.check_out}T00:00:00Z`) - Date.parse(`${lead.check_in}T00:00:00Z`)) / 86400000
    const amount = nightsCount * Number(validatedListing.price) + Number(validatedListing.cleaningFee ?? 0)
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'A valid booking total is required' }, { status: 400 })
    }
    if (lead.total_amount === null || lead.total_amount === undefined || !Number.isFinite(storedTotal) || Math.abs(storedTotal - amount) > 0.02) {
      return NextResponse.json({ error: 'Pricing changed; please request a fresh quote' }, { status: 409 })
    }
    const nightsLabel = nights ? `, ${nights} night${nights !== 1 ? 's' : ''}` : ''
    const description = `La Maison Homes — ${propName}${nightsLabel}`

    // PayPal appends its own `token` query parameter. Keep the portal token in
    // a distinct field so it cannot be mistaken for the PayPal order ID.
    const returnUrl = `${SITE_URL}/portal/payment/success?portalToken=${encodeURIComponent(portalToken)}`
    const cancelUrl = `${SITE_URL}/portal/payment/cancel?token=${encodeURIComponent(portalToken)}`

    // --- Create PayPal order ---
    const { id: orderId, approveUrl } = await createPayPalOrder({
      amount,
      currency: 'AUD',
      reference,
      description,
      returnUrl,
      cancelUrl,
    })

    // --- Store paypal_order_id in leads table ---
    const patchRes = await fetch(
      `${SUPABASE_URL}/rest/v1/leads?id=eq.${encodeURIComponent(lead.id)}&portal_token=eq.${encodeURIComponent(portalToken)}`,
      {
        method: 'PATCH',
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          paypal_order_id: orderId,
          payment_status: 'pending',
        }),
      }
    )

    if (!patchRes.ok) {
      console.error('[create-order] Failed to store paypal_order_id:', await patchRes.text())
      // Non-fatal — order was created; log and continue
    }

    return NextResponse.json({ orderId, approveUrl })
  } catch (err) {
    if (err instanceof BookabilityError) {
      // A4: a freshly created lead (Pay Now flow) should not stay 'pending' —
      // mark payment_failed (replay-safe; never touches paid/processing).
      const token = typeof body?.portalToken === 'string' ? body.portalToken : ''
      const leadId = typeof body?.leadId === 'string' ? body.leadId : null
      if (token && leadId) {
        await markLeadPaymentFailed(leadId, token, `create-order: ${err.code}`)
      }
      return NextResponse.json({ error: err.message, code: err.code }, { status: err.status })
    }
    console.error('[create-order] Error:', err)
    return NextResponse.json({ error: 'Failed to create PayPal order' }, { status: 500 })
  }
}
