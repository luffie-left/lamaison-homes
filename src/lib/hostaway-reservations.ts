/**
 * Hostaway reservation creation for direct (PayPal) bookings.
 * Creates a reservation in Hostaway which automatically blocks the calendar
 * and syncs the block to all connected channels (Airbnb, Booking.com).
 *
 * channelId 2000 = Direct booking
 */

import { getToken } from '@/lib/hostaway'
import { paymentAuditNote, paypalEnvironment } from '@/lib/payment-details'

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
  reference: string  // LM-YYYYMMDD-XXXX — included in the audit note
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

    const auditNote = paymentAuditNote({
      environment: paypalEnvironment(process.env.PAYPAL_ENVIRONMENT),
      reference: input.reference,
      captureId: input.paypalCaptureId,
      orderId: input.paypalOrderId,
      amount: input.totalPrice,
      currency: 'AUD',
    })

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
      // Hostaway documents `paypal` as a payment method. Do not force paid or
      // confirmed flags: sandbox never moves real funds, and earlier tests
      // showed Hostaway ignored unsupported payment/status fields.
      paymentMethod: 'paypal',
      hostNote: `Direct booking via La Maison Homes website.\n${auditNote}`,
      comment: auditNote,
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
    const reservationId = reservation.id ?? reservation.hostawayReservationId
    if (!Number.isInteger(reservationId) || reservationId <= 0) {
      console.error('[hostaway-reservations] Create returned no reservation ID; reconciliation required')
      return { ok: false, error: 'Hostaway response did not contain a reservation ID; reconcile before retrying' }
    }
    return {
      ok: true,
      hostawayReservationId: reservationId,
      confirmationCode: reservation.confirmationCode ?? undefined,
    }
  } catch (err) {
    console.error('[hostaway-reservations] Unexpected error:', err)
    return { ok: false, error: String(err) }
  }
}
