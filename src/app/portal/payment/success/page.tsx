'use client'

import { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'

function SuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  // New links distinguish our portal token from PayPal's `token` order ID.
  // Older links used ?token=<portal-token>; capture can fall back to the
  // PayPal order ID already stored on the authenticated lead.
  const portalToken = searchParams.get('portalToken') ?? searchParams.get('token')
  const orderId = searchParams.get('orderId') ??
    (searchParams.has('portalToken') ? searchParams.get('token') : null)

  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'verifying'>('loading')
  const [reference, setReference] = useState<string | null>(null)
  const [transactionId, setTransactionId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(5)
  const captureAttempted = useRef(false)

  useEffect(() => {
    if (!portalToken) {
      setStatus('error')
      setErrorMsg('Missing booking token in URL.')
      return
    }

    // Guard: only attempt capture once per page load
    if (captureAttempted.current) return
    captureAttempted.current = true

    async function capture() {
      try {
        const res = await fetch('/api/payment/capture', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId, portalToken }),
        })
        const data = await res.json()

        if (res.ok && data.success) {
          setReference(data.reference ?? null)
          setTransactionId(data.captureId ?? null)
          setStatus('success')
        } else if (data.state === 'verifying') {
          // P1: stale/ambiguous processing state — distinct retry-safe copy,
          // not the scary generic error. Auto-refresh once after 5s.
          setErrorMsg(data.error ?? 'We are confirming your payment.')
          setStatus('verifying')
          setTimeout(() => { captureAttempted.current = false; captureAttempted.current = true; window.location.reload() }, 5000)
        } else if (data.state === 'retry_shortly') {
          setErrorMsg(data.error ?? 'Booking is being processed — please wait a moment and refresh.')
          setStatus('verifying')
        } else {
          console.error('[success page] Capture failed:', data)
          setErrorMsg(data.error ?? 'Payment could not be confirmed. Please contact support.')
          setStatus('error')
        }
      } catch (err) {
        console.error('[success page] Capture error:', err)
        setErrorMsg('Something went wrong. Please contact support.')
        setStatus('error')
      }
    }

    capture()
  }, [portalToken, orderId])

  // Auto-redirect countdown after success
  useEffect(() => {
    if (status !== 'success') return
    if (countdown <= 0) {
      router.push(`/portal?token=${encodeURIComponent(portalToken ?? '')}`)
      return
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [status, countdown, portalToken, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#f7f2eb] flex flex-col items-center justify-center px-4">
        <div className="w-10 h-10 border-2 border-stone-300 border-t-stone-800 rounded-full animate-spin mb-6" />
        <p className="text-stone-600 text-sm font-medium">Confirming your payment…</p>
        <p className="text-stone-400 text-xs mt-2">This usually takes a few seconds</p>
      </div>
    )
  }

  if (status === 'verifying') {
    // P1: distinct retry-safe state — amber, auto-refreshing; never the red
    // generic error for a transient/ambiguous processing condition.
    return (
      <div className="min-h-screen bg-[#f7f2eb] flex flex-col items-center justify-center px-4">
        <div className="max-w-sm w-full bg-white rounded-2xl border border-stone-200 shadow-sm p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⏳</span>
          </div>
          <h1 className="text-xl font-semibold text-stone-900 mb-2">Confirming your booking</h1>
          <p className="text-sm text-stone-500 mb-6 leading-relaxed">{errorMsg ?? 'We are confirming your payment.'} This page will refresh automatically — please don&apos;t pay again.</p>
          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="block w-full bg-stone-950 text-stone-50 py-3 rounded-full text-sm font-medium hover:bg-stone-800 transition-colors text-center"
            >
              Refresh now
            </button>
            <Link
              href={`/portal?token=${encodeURIComponent(portalToken ?? '')}`}
              className="block text-sm text-stone-400 hover:text-stone-700 underline"
            >
              View booking status
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-[#f7f2eb] flex flex-col items-center justify-center px-4">
        <div className="max-w-sm w-full bg-white rounded-2xl border border-stone-200 shadow-sm p-8 text-center">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <h1 className="text-xl font-semibold text-stone-900 mb-2">Payment issue</h1>
          <p className="text-sm text-stone-500 mb-6 leading-relaxed">{errorMsg}</p>
          <div className="space-y-3">
            <Link
              href={`/portal?token=${encodeURIComponent(portalToken ?? '')}`}
              className="block w-full bg-stone-950 text-stone-50 py-3 rounded-full text-sm font-medium hover:bg-stone-800 transition-colors text-center"
            >
              View booking status
            </Link>
            <a
              href="mailto:stay@lamaisonhomes.com.au"
              className="block text-sm text-stone-400 hover:text-stone-700 underline"
            >
              Contact support
            </a>
          </div>
        </div>
      </div>
    )
  }

  // success
  return (
    <div className="min-h-screen bg-[#f7f2eb] flex flex-col items-center justify-center px-4">
      {/* Sandbox badge */}
      {process.env.NEXT_PUBLIC_PAYPAL_ENVIRONMENT !== 'live' && (
        <div className="mb-4 px-3 py-1 bg-amber-100 border border-amber-300 rounded-full text-xs font-medium text-amber-700">
          🧪 Sandbox mode — test payment only
        </div>
      )}

      <div className="max-w-sm w-full bg-white rounded-2xl border border-stone-200 shadow-sm p-8 text-center">
        {/* Success icon */}
        <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">🎉</span>
        </div>

        <h1 className="text-2xl font-semibold text-stone-900 mb-2">Payment successful</h1>
        <p className="text-stone-500 text-sm mb-6 leading-relaxed">
          Your booking is confirmed! A confirmation email has been sent to you.
        </p>

        {reference && (
          <div className="bg-stone-50 rounded-xl px-4 py-3 mb-6 inline-block">
            <p className="text-xs text-stone-400 uppercase tracking-wide mb-1">Booking reference</p>
            <p className="font-mono font-semibold text-stone-900 text-sm">{reference}</p>
          </div>
        )}

        {transactionId && (
          <div className="bg-stone-50 rounded-xl px-4 py-3 mb-6 text-left">
            <p className="text-xs text-stone-400 uppercase tracking-wide mb-1">PayPal transaction ID</p>
            <p className="font-mono text-stone-900 text-sm break-all">{transactionId}</p>
          </div>
        )}

        <Link
          href={`/portal?token=${encodeURIComponent(portalToken ?? '')}`}
          className="block w-full bg-stone-950 text-stone-50 py-3 rounded-full text-sm font-medium hover:bg-stone-800 transition-colors text-center mb-4"
        >
          View booking details
        </Link>

        <p className="text-xs text-stone-400">
          Redirecting automatically in {countdown}s…
        </p>
      </div>

      <p className="mt-6 text-xs text-stone-400">
        La Maison Homes · <a href="mailto:stay@lamaisonhomes.com.au" className="hover:text-stone-600 underline">stay@lamaisonhomes.com.au</a>
      </p>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f7f2eb] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-stone-300 border-t-stone-700 rounded-full animate-spin" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  )
}
