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

export const dynamic = 'force-dynamic'

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\n/g, '')
const SERVICE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').replace(/\n/g, '')
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://lamaison-homes.vercel.app').replace(/\n/g, '')

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      leadId,
      listingId,
      checkIn,
      checkOut,
      nights,
      guests,
      total,
      propertyName,
      portalToken,
    } = body

    // --- Validate required fields ---
    if (!leadId || !total || !portalToken) {
      return NextResponse.json(
        { error: 'leadId, total, and portalToken are required' },
        { status: 400 }
      )
    }

    if (!SUPABASE_URL || !SERVICE_KEY) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // --- Verify lead exists in Supabase ---
    const leadRes = await fetch(
      `${SUPABASE_URL}/rest/v1/leads?id=eq.${encodeURIComponent(leadId)}&portal_token=eq.${encodeURIComponent(portalToken)}&select=id,reference,name,total_amount,status`,
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
    if (lead.status === 'confirmed') {
      return NextResponse.json(
        { error: 'This booking is already confirmed and paid' },
        { status: 409 }
      )
    }

    // Build a nice reference/description
    const reference = lead.reference ?? `LM-${leadId.slice(0, 8).toUpperCase()}`
    const propName = propertyName ?? `Listing #${listingId}`
    const nightsLabel = nights ? `, ${nights} night${nights !== 1 ? 's' : ''}` : ''
    const description = `La Maison Homes — ${propName}${nightsLabel}`

    // PayPal return/cancel URLs — orderId placeholder is filled by PayPal in redirect
    const returnUrl = `${SITE_URL}/portal/payment/success?token=${encodeURIComponent(portalToken)}&orderId={id}`
    const cancelUrl = `${SITE_URL}/portal/payment/cancel?token=${encodeURIComponent(portalToken)}`

    // --- Create PayPal order ---
    const { id: orderId, approveUrl } = await createPayPalOrder({
      amount: Number(total),
      currency: 'AUD',
      reference,
      description,
      returnUrl,
      cancelUrl,
    })

    // --- Store paypal_order_id in leads table ---
    const patchRes = await fetch(
      `${SUPABASE_URL}/rest/v1/leads?id=eq.${encodeURIComponent(leadId)}`,
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
    console.error('[create-order] Error:', err)
    return NextResponse.json({ error: 'Failed to create PayPal order' }, { status: 500 })
  }
}
