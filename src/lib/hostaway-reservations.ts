/**
 * Hostaway reservation creation for direct (PayPal) bookings.
 * Creates a reservation in Hostaway which automatically blocks the calendar
 * and syncs the block to all connected channels (Airbnb, Booking.com).
 *
 * channelId 2000 = Direct booking
 */

import { getToken } from '@/lib/hostaway'

const HOSTAWAY_BASE = 'https://api.hostaway.com/v1'

export interface CreateReservationInput {
  listingId: number
  guestName: string
  guestEmail: string
  guestPhone?: string | null
  checkIn: string    // YYYY-MM-DD
  checkOut: string   // YYYY-MM-DD
  nights: number
  guests: number
  totalPrice: number
  cleaningFee?: number | null
  reference: string  // LM-YYYYMMDD-XXXX — stored as confirmationCode
  paypalCaptureId: string
  paypalOrderId: string
}

export interface CreateReservationResult {
  ok: boolean
  hostawayReservationId?: number
  confirmationCode?: string
  error?: string
}

export async function createHostawayReservation(
  input: CreateReservationInput
): Promise<CreateReservationResult> {
  try {
    const token = await getToken()

    const [firstName, ...rest] = input.guestName.trim().split(' ')
    const lastName = rest.join(' ') || firstName

    const body = {
      channelId: 2000,                    // Direct booking
      listingMapId: input.listingId,
      guestName: input.guestName,
      guestFirstName: firstName,
      guestLastName: lastName,
      guestEmail: input.guestEmail,
      phone: input.guestPhone ?? undefined,
      arrivalDate: input.checkIn,
      departureDate: input.checkOut,
      nights: input.nights,
      numberOfGuests: input.guests,
      adults: input.guests,
      totalPrice: input.totalPrice,
      cleaningFee: input.cleaningFee ?? 0,
      currency: 'AUD',
      isPaid: 1,                          // already paid via PayPal
      paymentStatus: 'paid',
      status: 'confirmed',
      confirmationCode: input.reference,
      hostNote: `Direct booking via La Maison Homes website. PayPal order: ${input.paypalOrderId}. Capture: ${input.paypalCaptureId}`,
      comment: `Paid via PayPal — Capture ID: ${input.paypalCaptureId}`,
    }

    const res = await fetch(`${HOSTAWAY_BASE}/reservations`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await res.json()

    if (!res.ok || data.status === 'fail') {
      console.error('[hostaway-reservations] Create failed:', data)
      return { ok: false, error: data.message ?? `HTTP ${res.status}` }
    }

    const reservation = data.result ?? data
    return {
      ok: true,
      hostawayReservationId: reservation.id ?? reservation.hostawayReservationId,
      confirmationCode: reservation.confirmationCode ?? input.reference,
    }
  } catch (err) {
    console.error('[hostaway-reservations] Unexpected error:', err)
    return { ok: false, error: String(err) }
  }
}
