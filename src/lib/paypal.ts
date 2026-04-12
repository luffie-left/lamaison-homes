/**
 * PayPal server-side client lib
 * All PayPal API calls go through here — never expose client secret to browser.
 * ENV: PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_ENVIRONMENT (sandbox|live)
 */

// Token cache — module-level, survives across requests in same Node.js process
let _token: { value: string; exp: number } | null = null

const PAYPAL_BASE =
  process.env.PAYPAL_ENVIRONMENT === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com'

export { PAYPAL_BASE }

export async function getPayPalToken(): Promise<string> {
  if (_token && Date.now() < _token.exp) return _token.value

  const clientId = process.env.PAYPAL_CLIENT_ID ?? ''
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET ?? ''

  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: 'grant_type=client_credentials',
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`[paypal] Token fetch failed: ${res.status} ${text}`)
  }

  const data = await res.json()
  _token = {
    value: data.access_token,
    exp: Date.now() + (data.expires_in - 60) * 1000,
  }
  return _token.value
}

export async function createPayPalOrder(opts: {
  amount: number    // AUD decimal e.g. 450.00
  currency: string  // 'AUD'
  reference: string // LM-YYYYMMDD-XXXX
  description: string
  returnUrl: string
  cancelUrl: string
}): Promise<{ id: string; approveUrl: string }> {
  const token = await getPayPalToken()

  const res = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          reference_id: opts.reference,
          description: opts.description,
          amount: {
            currency_code: opts.currency,
            value: opts.amount.toFixed(2),
          },
        },
      ],
      payment_source: {
        paypal: {
          experience_context: {
            payment_method_preference: 'IMMEDIATE_PAYMENT_REQUIRED',
            return_url: opts.returnUrl,
            cancel_url: opts.cancelUrl,
          },
        },
      },
    }),
  })

  const data = await res.json()

  if (!res.ok) {
    console.error('[paypal] createOrder error:', JSON.stringify(data))
    throw new Error(`[paypal] createOrder failed: ${res.status}`)
  }

  // PayPal uses rel=payer-action (v2) or rel=approve (legacy)
  const approveUrl =
    data.links?.find(
      (l: { rel: string; href: string }) =>
        l.rel === 'payer-action' || l.rel === 'approve'
    )?.href ?? null

  if (!approveUrl) {
    console.error('[paypal] No approveUrl in response:', JSON.stringify(data))
    throw new Error('[paypal] No approve URL returned')
  }

  return { id: data.id, approveUrl }
}

export async function capturePayPalOrder(orderId: string): Promise<{
  success: boolean
  captureId: string | null
  amount: number | null
  payerEmail: string | null
  status: string
  rawPayload: unknown // stored for audit trail
}> {
  const token = await getPayPalToken()

  const res = await fetch(
    `${PAYPAL_BASE}/v2/checkout/orders/${orderId}/capture`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }
  )

  const data = await res.json()
  const capture = data.purchase_units?.[0]?.payments?.captures?.[0]

  return {
    success: data.status === 'COMPLETED',
    captureId: capture?.id ?? null,
    amount: capture?.amount?.value ? parseFloat(capture.amount.value) : null,
    payerEmail: data.payer?.email_address ?? null,
    status: data.status ?? 'UNKNOWN',
    rawPayload: data,
  }
}

export async function verifyPayPalOrder(orderId: string): Promise<{
  verified: boolean
  status: string
  amount: number | null
  reference: string | null
}> {
  const token = await getPayPalToken()

  const res = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    return { verified: false, status: 'FETCH_ERROR', amount: null, reference: null }
  }

  const data = await res.json()
  const amount = data.purchase_units?.[0]?.amount?.value
  const reference = data.purchase_units?.[0]?.reference_id

  return {
    verified: ['APPROVED', 'COMPLETED'].includes(data.status ?? ''),
    status: data.status ?? 'UNKNOWN',
    amount: amount ? parseFloat(amount) : null,
    reference: reference ?? null,
  }
}
