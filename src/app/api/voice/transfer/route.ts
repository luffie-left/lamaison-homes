/**
 * POST /api/voice/transfer
 *
 * Triggers a Twilio outbound call to connect a staff member with a waiting caller.
 * The caller stays on the website while this call goes out to staff.
 *
 * Body: { callSid?: string; to?: string; callerInfo?: { name, phone, intent } }
 *
 * Environment variables required:
 *   TWILIO_ACCOUNT_SID   — from console.twilio.com  TODO: add
 *   TWILIO_AUTH_TOKEN    — from console.twilio.com  TODO: add
 *   TWILIO_FROM_NUMBER   — your Twilio AU number e.g. +61280001234  TODO: add
 *   STAFF_TRANSFER_NUMBER — staff mobile to dial e.g. +61400000000  TODO: add
 */

import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'

// TODO: add these to Vercel / Railway env vars
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID as string
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN as string
const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER as string  // AU Twilio number
const STAFF_TRANSFER_NUMBER = process.env.STAFF_TRANSFER_NUMBER as string  // staff mobile

interface TransferBody {
  callSid?: string
  to?: string
  callerInfo?: {
    name?: string
    phone?: string
    intent?: string
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: TransferBody = await req.json()
    const targetNumber = body.to ?? STAFF_TRANSFER_NUMBER

    if (!targetNumber) {
      return NextResponse.json(
        { error: 'No transfer number specified and STAFF_TRANSFER_NUMBER not set' },
        { status: 400 }
      )
    }

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
      return NextResponse.json(
        { error: 'Twilio credentials not configured — add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER to env vars' },
        { status: 503 }
      )
    }

    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

    // Build a TwiML response that announces who is calling and why
    const callerName = body.callerInfo?.name ?? 'a website visitor'
    const intent = body.callerInfo?.intent ?? 'general enquiry'

    const twiml = `
      <Response>
        <Say voice="Polly.Amy">
          You have a transfer from La Maison Homes. 
          ${callerName} is calling about ${intent}.
          Connecting now.
        </Say>
        <Pause length="1"/>
      </Response>
    `.trim()

    const call = await client.calls.create({
      to: targetNumber,
      from: TWILIO_FROM_NUMBER,
      twiml,
    })

    return NextResponse.json({
      success: true,
      callSid: call.sid,
      status: call.status,
      to: targetNumber,
    })
  } catch (err: any) {
    console.error('[Transfer] Twilio error:', err.message)
    return NextResponse.json(
      { error: err.message ?? 'Transfer failed' },
      { status: 500 }
    )
  }
}
