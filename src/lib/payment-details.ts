/** Distinguishable, non-sensitive payment metadata; do not infer a funding source. */
export type PayPalEnvironment = 'sandbox' | 'live' | 'unknown'

export function paypalEnvironment(value: string | undefined): PayPalEnvironment {
  return value === 'live' || value === 'sandbox' ? value : 'unknown'
}

export function paymentMethodLabel(environment: PayPalEnvironment): string {
  if (environment === 'sandbox') return 'PayPal Sandbox — TEST ONLY (no real charge)'
  if (environment === 'live') return 'PayPal'
  return 'PayPal — environment unverified'
}

export function paymentAuditNote(input: {
  environment: PayPalEnvironment
  reference: string
  captureId: string
  orderId: string
  amount: number
  currency: string
}): string {
  return [
    `Payment method: ${paymentMethodLabel(input.environment)}`,
    `Booking reference: ${input.reference}`,
    `PayPal capture/transaction ID: ${input.captureId || 'Unavailable'}`,
    `PayPal order ID: ${input.orderId || 'Unavailable'}`,
    `Captured amount: ${input.currency} ${input.amount.toFixed(2)}`,
  ].join('\n')
}
