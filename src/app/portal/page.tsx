"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

interface Booking {
  id: string;
  name: string;
  email: string;
  reference: string;
  property_name: string | null;
  listing_id: number | null;
  check_in: string | null;
  check_out: string | null;
  nights: number | null;
  num_guests: number | null;
  total_amount: number | null;
  status: string;
  created_at: string;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-AU", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });
  } catch { return iso; }
}

function formatCurrency(n: number | null | undefined): string {
  if (!n) return "—";
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n);
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  new:              { label: "Pending review", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  confirmed:        { label: "Confirmed",       color: "text-green-700", bg: "bg-green-50 border-green-200" },
  declined:         { label: "Unavailable",     color: "text-red-700",   bg: "bg-red-50 border-red-200" },
  pending_payment:  { label: "Awaiting payment", color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
}

function PortalContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) { setError("Invalid link"); setLoading(false); return; }
    fetch(`/api/portal/booking?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError("Booking not found. Please check your confirmation email.");
        else setBooking(d.booking);
      })
      .catch(() => setError("Unable to load booking. Please try again."))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f2eb] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-stone-300 border-t-stone-700 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-stone-500">Loading your booking…</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-[#f7f2eb] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <p className="text-stone-400 text-4xl mb-4">🔍</p>
          <h1 className="text-xl font-medium text-stone-900 mb-2">Booking not found</h1>
          <p className="text-sm text-stone-500 mb-6">{error ?? "This link may be expired or invalid."}</p>
          <Link href="/stays" className="inline-block bg-stone-950 text-stone-50 px-6 py-3 rounded-full text-sm font-medium hover:bg-stone-800 transition-colors">
            Browse stays
          </Link>
        </div>
      </div>
    );
  }

  const st = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.new;
  const isPending = booking.status === "new";
  const isConfirmed = booking.status === "confirmed";
  const firstName = booking.name.split(" ")[0];

  return (
    <div className="min-h-screen bg-[#f7f2eb]">
      {/* Header */}
      <div className="bg-[#1a1a1a] px-4 py-5">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <p className="text-[#c9a96e] text-xs uppercase tracking-[3px]">La Maison Homes</p>
            <p className="text-white text-sm mt-0.5">Hi {firstName} 👋</p>
          </div>
          <Link href="/stays" className="text-stone-400 text-xs hover:text-stone-200">← Browse stays</Link>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-4">
        {/* Status banner */}
        <div className={`rounded-2xl border p-4 ${st.bg}`}>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className={`font-semibold text-sm ${st.color}`}>{st.label}</p>
              <p className="text-xs text-stone-500 mt-0.5 font-mono">{booking.reference}</p>
            </div>
            <span className={`text-2xl`}>
              {booking.status === "confirmed" ? "✅" : booking.status === "declined" ? "❌" : "⏳"}
            </span>
          </div>
        </div>

        {/* Booking card */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          <div className="bg-stone-950 px-5 py-4">
            <p className="text-stone-400 text-xs uppercase tracking-wide mb-1">Property</p>
            <p className="text-white text-lg font-medium">{booking.property_name ?? `Listing #${booking.listing_id}`}</p>
          </div>
          <div className="p-5 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-stone-400 mb-1">Check-in</p>
                <p className="text-sm font-medium text-stone-900">{formatDate(booking.check_in)}</p>
              </div>
              <div>
                <p className="text-xs text-stone-400 mb-1">Check-out</p>
                <p className="text-sm font-medium text-stone-900">{formatDate(booking.check_out)}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 pt-2 border-t border-stone-100">
              {booking.nights && (
                <div className="text-center">
                  <p className="text-xl font-bold text-stone-900">{booking.nights}</p>
                  <p className="text-xs text-stone-400">nights</p>
                </div>
              )}
              {booking.num_guests && (
                <div className="text-center">
                  <p className="text-xl font-bold text-stone-900">{booking.num_guests}</p>
                  <p className="text-xs text-stone-400">guests</p>
                </div>
              )}
              {booking.total_amount && (
                <div className="text-center">
                  <p className="text-xl font-bold text-stone-900">{formatCurrency(booking.total_amount)}</p>
                  <p className="text-xs text-stone-400">total</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* What happens next (pending) */}
        {isPending && (
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-4">What happens next</p>
            <div className="space-y-4">
              {[
                { icon: "✅", label: "Enquiry received", done: true },
                { icon: "⏳", label: "Awaiting confirmation (within 2 hours)", done: false },
                { icon: "📧", label: "Confirmation email sent", done: false },
                { icon: "🔑", label: "Check-in info sent 48hrs before arrival", done: false },
              ].map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-lg">{step.icon}</span>
                  <span className={`text-sm ${step.done ? "text-stone-900 font-medium" : "text-stone-400"}`}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Confirmed message */}
        {isConfirmed && (
          <div className="bg-green-50 rounded-2xl border border-green-200 p-5 text-center">
            <p className="text-green-800 font-medium mb-1">Your stay is confirmed 🎉</p>
            <p className="text-green-700 text-sm">Check-in details and property access information will be sent to {booking.email} 48 hours before your arrival.</p>
          </div>
        )}

        {/* Invoice */}
        {booking.total_amount && (
          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
              <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide">Invoice</p>
              <p className="text-xs font-mono text-stone-500">{booking.reference}</p>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-stone-600">Accommodation{booking.nights ? ` (${booking.nights} night${booking.nights !== 1 ? 's' : ''})` : ''}</span>
                <span className="text-stone-900 font-medium">{formatCurrency(booking.total_amount)}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-stone-100 pt-3">
                <span className="font-semibold text-stone-900">Total</span>
                <span className="font-bold text-stone-900">{formatCurrency(booking.total_amount)} AUD</span>
              </div>
              <div className={`mt-3 rounded-xl px-4 py-3 text-center text-xs font-medium ${
                booking.status === 'confirmed' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-stone-50 text-stone-500'
              }`}>
                {booking.status === 'confirmed' ? '⏳ Payment details will be sent separately' : 'Awaiting confirmation'}
              </div>
            </div>
          </div>
        )}

        {/* Contact */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5 text-center">
          <p className="text-sm text-stone-500 mb-1">Questions about your booking?</p>
          <a href="mailto:bookings@lamaisonhomes.com.au" className="text-sm font-medium text-stone-900 underline underline-offset-2">
            bookings@lamaisonhomes.com.au
          </a>
        </div>
      </div>
    </div>
  );
}

export default function PortalPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f7f2eb] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-stone-300 border-t-stone-700 rounded-full animate-spin" />
      </div>
    }>
      <PortalContent />
    </Suspense>
  );
}
