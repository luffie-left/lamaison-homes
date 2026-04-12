'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function CancelContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  return (
    <div className="min-h-screen bg-[#f7f2eb] flex flex-col items-center justify-center px-4">
      <div className="max-w-sm w-full bg-white rounded-2xl border border-stone-200 shadow-sm p-8 text-center">
        {/* Icon */}
        <div className="w-14 h-14 rounded-full bg-stone-100 flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">↩️</span>
        </div>

        <h1 className="text-xl font-semibold text-stone-900 mb-2">Payment cancelled</h1>
        <p className="text-stone-500 text-sm mb-6 leading-relaxed">
          No payment was taken. Your enquiry is still saved — you can complete payment any time.
        </p>

        <div className="space-y-3">
          {token && (
            <Link
              href={`/portal?token=${token}`}
              className="block w-full bg-stone-950 text-stone-50 py-3 rounded-full text-sm font-medium hover:bg-stone-800 transition-colors text-center"
            >
              Back to my booking
            </Link>
          )}

          <Link
            href="/stays"
            className="block w-full bg-white border border-stone-200 text-stone-700 py-3 rounded-full text-sm font-medium hover:bg-stone-50 transition-colors text-center"
          >
            Browse all stays
          </Link>
        </div>

        <p className="mt-6 text-xs text-stone-400">
          Need help? <a href="mailto:bookings@lamaisonhomes.com.au" className="underline hover:text-stone-700">bookings@lamaisonhomes.com.au</a>
        </p>
      </div>
    </div>
  )
}

export default function PaymentCancelPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f7f2eb] flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-stone-300 border-t-stone-700 rounded-full animate-spin" />
        </div>
      }
    >
      <CancelContent />
    </Suspense>
  )
}
