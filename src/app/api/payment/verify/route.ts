/**
 * GET /api/payment/verify?orderId=xxx&token=xxx
 * Used by the success redirect page to verify payment before showing confirmation.
 * Does NOT capture — just checks current order status + DB state.
 *
 * ENV: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *      PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_ENVIRONMENT
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyPayPalOrder } from '@/lib/paypal'

export const dynamic = 'force-dynamic'

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\n/g, '')
const SERVICE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').replace(/\n/g, '')

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const orderId = searchParams.get('orderId')
    const token = searchParams.get('token')

    if (!orderId || !token) {
      return NextResponse.json(
        { error: 'orderId and token are required' },
        { status: 400 }
      )
    }

    if (!SUPABASE_URL || !SERVICE_KEY) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // Verify lead exists + token matches
    const leadRes = await fetch(
      `${SUPABASE_URL}/rest/v1/leads?portal_token=eq.${encodeURIComponent(token)}&select=id,reference,status,payment_status,total_amount,paypal_order_id`,
      {
        headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
        cache: 'no-store',
      }
    )

    if (!leadRes.ok) {
      return NextResponse.json({ error: 'Failed to verify lead' }, { status: 500 })
    }

    const leads = await leadRes.json()
    if (!leads || leads.length === 0) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    const lead = leads[0]

    // If already paid in DB — trust the DB, skip PayPal call
    if (lead.payment_status === 'paid') {
      return NextResponse.json({
        verified: true,
        status: 'COMPLETED',
        reference: lead.reference,
        alreadyPaid: true,
      })
    }

    // Otherwise check with PayPal
    const ppResult = await verifyPayPalOrder(orderId)

    return NextResponse.json({
      verified: ppResult.verified,
      status: ppResult.status,
      reference: lead.reference,
      amount: ppResult.amount,
    })
  } catch (err) {
    console.error('[verify] Error:', err)
    return NextResponse.json({ error: 'Failed to verify payment' }, { status: 500 })
  }
}
