"use client";

import { useState } from "react";

type QuoteResult = {
  nights: number;
  nightlyRate: number;
  cleaningFee: number;
  subtotal: number;
  currency: string;
};

type Step = "dates" | "quote" | "guest-details" | "redirecting" | "enquiry" | "confirmed";

function fmt(amount: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function BookingWidget({
  listingId,
  propertyName,
  nightlyRate,
  cleaningFee = 0,
  checkInDate,
  checkOutDate,
}: {
  listingId: number;
  propertyName?: string;
  nightlyRate: number;
  cleaningFee?: number;
  checkInDate?: string | null;
  checkOutDate?: string | null;
}) {
  const [step, setStep] = useState<Step>("dates");
  const [checkIn, setCheckIn] = useState(checkInDate ?? "");
  const [checkOut, setCheckOut] = useState(checkOutDate ?? "");
  const [guests, setGuests] = useState(2);
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Guest details (for Reserve flow)
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [messageText, setMessageText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Enquiry-only fallback
  const [showEnquiry, setShowEnquiry] = useState(false);
  const [enquirySubmitting, setEnquirySubmitting] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const nights =
    checkIn && checkOut
      ? Math.max(
          0,
          Math.round(
            (new Date(checkOut).getTime() - new Date(checkIn).getTime()) /
              86400000
          )
        )
      : 0;

  // ─── Step 1: Fetch quote + check availability ──────────────────────────────
  async function handleCheckAvailability(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // Parallel: quote + availability
      const [quoteRes, availRes] = await Promise.all([
        fetch(
          `/api/quote?${new URLSearchParams({
            listingId: String(listingId),
            checkIn,
            checkOut,
            guests: String(guests),
          })}`
        ),
        fetch(
          `/api/stays/${listingId}/availability?${new URLSearchParams({
            checkIn,
            checkOut,
          })}`
        ),
      ]);

      const quoteData = await quoteRes.json();
      if (!quoteRes.ok || quoteData.error) {
        setError(quoteData.error ?? "Could not calculate quote.");
        return;
      }

      // Availability check
      if (availRes.ok) {
        const availData = await availRes.json();
        if (availData.available === false) {
          setError("These dates are not available. Please choose different dates.");
          return;
        }
      }

      setQuote(quoteData);
      setStep("quote");
      setShowEnquiry(false);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // ─── Step 2: "Reserve" → collect guest details ─────────────────────────────
  function handleReserveClick() {
    setStep("guest-details");
    setError(null);
  }

  // ─── Step 3: Create lead + PayPal order + redirect ─────────────────────────
  async function handlePaymentSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!quote) return;
    setError(null);
    setSubmitting(true);

    try {
      // 3a. Create booking draft (lead) in Supabase
      const enquiryRes = await fetch("/api/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone: phone || undefined,
          listingId,
          propertyName: propertyName ?? `Listing #${listingId}`,
          checkIn,
          checkOut,
          guests,
          message: messageText || undefined,
          // Pass confirmed pricing from server-side quote
          total: quote.subtotal,
          nightlyRate: quote.nightlyRate,
          cleaningFee: quote.cleaningFee,
          nights: quote.nights,
        }),
      });

      const enquiryData = await enquiryRes.json();
      if (!enquiryRes.ok || enquiryData.error) {
        setError(enquiryData.error ?? "Failed to save booking details.");
        return;
      }

      const { portalToken, reference } = enquiryData;

      // 3b. Create PayPal order
      const orderRes = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: enquiryData.leadId ?? reference,
          listingId,
          checkIn,
          checkOut,
          nights: quote.nights,
          guests,
          total: quote.subtotal,
          propertyName: propertyName ?? `Listing #${listingId}`,
          portalToken,
        }),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok || orderData.error) {
        setError(orderData.error ?? "Failed to create payment order. Please try again or use enquiry.");
        return;
      }

      // 3c. Redirect to PayPal approval URL
      setStep("redirecting");
      window.location.href = orderData.approveUrl;
    } catch {
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  // ─── Enquiry-only fallback (no payment) ───────────────────────────────────
  async function handleEnquirySubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEnquirySubmitting(true);
    try {
      const res = await fetch("/api/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone: phone || undefined,
          listingId,
          propertyName: propertyName ?? `Listing #${listingId}`,
          checkIn,
          checkOut,
          guests,
          message: messageText || undefined,
          total: quote?.subtotal ?? undefined,
          nightlyRate: quote?.nightlyRate ?? nightlyRate,
          cleaningFee: quote?.cleaningFee ?? cleaningFee,
          nights: quote?.nights ?? nights,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error ?? "Failed to submit enquiry.");
        return;
      }
      setStep("confirmed");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setEnquirySubmitting(false);
    }
  }

  // ─── Redirecting screen ────────────────────────────────────────────────────
  if (step === "redirecting") {
    return (
      <div className="space-y-4 text-center py-8">
        <div className="mx-auto h-10 w-10 rounded-full border-2 border-stone-950 border-t-transparent animate-spin" />
        <p className="text-sm text-stone-600">Redirecting to PayPal…</p>
      </div>
    );
  }

  // ─── Confirmed (enquiry-only path) ─────────────────────────────────────────
  if (step === "confirmed") {
    return (
      <div className="space-y-5 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-stone-950 text-xl text-white">
          ✓
        </div>
        <div>
          <p className="text-xl font-medium text-stone-950">Enquiry received</p>
          <p className="mt-2 text-sm text-stone-500">We&apos;ll confirm within 2 hours.</p>
        </div>
        {checkIn && checkOut && (
          <div className="rounded-xl bg-stone-50 p-4 text-sm text-stone-600">
            <p>{checkIn} → {checkOut}</p>
            <p className="mt-1">{guests} guest{guests !== 1 ? "s" : ""}</p>
          </div>
        )}
        <button
          onClick={() => {
            setStep("dates");
            setQuote(null);
            setCheckIn("");
            setCheckOut("");
            setGuests(2);
            setName("");
            setEmail("");
            setPhone("");
            setMessageText("");
            setShowEnquiry(false);
          }}
          className="text-xs text-stone-400 underline underline-offset-4 hover:text-stone-700"
        >
          Make another enquiry
        </button>
      </div>
    );
  }

  // ─── Guest details form (Reserve → PayPal path) ────────────────────────────
  if (step === "guest-details") {
    return (
      <div className="space-y-5">
        {/* Quote summary */}
        {quote && (
          <div className="rounded-xl bg-stone-50 p-3 space-y-1.5 text-sm">
            <div className="flex justify-between text-stone-600">
              <span>{fmt(quote.nightlyRate)} × {quote.nights} night{quote.nights !== 1 ? "s" : ""}</span>
              <span>{fmt(quote.nightlyRate * quote.nights)}</span>
            </div>
            {quote.cleaningFee > 0 && (
              <div className="flex justify-between text-stone-600">
                <span>Cleaning fee</span>
                <span>{fmt(quote.cleaningFee)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-stone-200 pt-2 font-semibold text-stone-950">
              <span>Total</span>
              <span>{fmt(quote.subtotal)}</span>
            </div>
          </div>
        )}

        <form onSubmit={handlePaymentSubmit} className="space-y-3">
          <p className="text-xs font-medium uppercase tracking-widest text-stone-400">Your details</p>

          <div>
            <label className="mb-1 block text-xs font-medium text-stone-500">Name *</label>
            <input
              required
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-950"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-500">Email *</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-950"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-500">Phone (optional)</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+61 4xx xxx xxx"
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-950"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-500">Special requests (optional)</label>
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Early check-in, dietary needs, etc."
              rows={2}
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-950 resize-none"
            />
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-stone-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60 hover:bg-stone-800 transition-colors"
          >
            {submitting ? "Processing…" : `Pay ${quote ? fmt(quote.subtotal) : ""} via PayPal`}
          </button>

          <p className="text-center text-xs text-stone-400">
            Secure payment via PayPal · Australian dollars
          </p>
        </form>

        <button
          onClick={() => { setStep("quote"); setError(null); }}
          className="text-xs text-stone-400 underline underline-offset-4 hover:text-stone-700"
        >
          ← Back to dates
        </button>

        <hr className="border-stone-100" />

        <button
          onClick={() => setShowEnquiry(!showEnquiry)}
          className="text-sm font-medium text-stone-700 hover:text-stone-950 underline underline-offset-4"
        >
          {showEnquiry ? "Hide" : "Prefer to enquire instead?"}
        </button>

        {showEnquiry && (
          <form onSubmit={handleEnquirySubmit} className="space-y-3">
            {/* Same fields already filled above */}
            <p className="text-xs text-stone-500">Your details above will be used. Add a message and submit.</p>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-500">Message (optional)</label>
              <textarea
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Any questions or special requests?"
                rows={3}
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-950 resize-none"
              />
            </div>
            <button
              type="submit"
              disabled={enquirySubmitting}
              className="w-full rounded-xl border border-stone-950 px-5 py-3 text-sm font-semibold text-stone-950 disabled:opacity-60 hover:bg-stone-50 transition-colors"
            >
              {enquirySubmitting ? "Submitting…" : "Submit enquiry (no payment now)"}
            </button>
          </form>
        )}
      </div>
    );
  }

  // ─── Default: date picker + quote ─────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Price display */}
      <div className="flex items-end justify-between">
        <div>
          <span className="text-2xl font-semibold text-stone-950">{fmt(nightlyRate)}</span>
          <span className="ml-1 text-sm text-stone-500">/ night</span>
        </div>
      </div>

      {/* Date + guest form */}
      <form onSubmit={handleCheckAvailability} className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-500 uppercase tracking-wide">
              Check-in
            </label>
            <input
              required
              type="date"
              min={today}
              value={checkIn}
              onChange={(e) => {
                setCheckIn(e.target.value);
                setQuote(null);
                setStep("dates");
              }}
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-950"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-500 uppercase tracking-wide">
              Check-out
            </label>
            <input
              required
              type="date"
              min={checkIn || today}
              value={checkOut}
              onChange={(e) => {
                setCheckOut(e.target.value);
                setQuote(null);
                setStep("dates");
              }}
              className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-950"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-stone-500 uppercase tracking-wide">
            Guests
          </label>
          <select
            value={guests}
            onChange={(e) => setGuests(Number(e.target.value))}
            className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-950"
          >
            {Array.from({ length: 16 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n} guest{n !== 1 ? "s" : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Live price estimate (before quote fetch) */}
        {nights > 0 && step === "dates" && (
          <div className="rounded-xl bg-stone-50 p-3 space-y-1.5 text-sm">
            <div className="flex justify-between text-stone-600">
              <span>{fmt(nightlyRate)} × {nights} night{nights !== 1 ? "s" : ""}</span>
              <span>{fmt(nightlyRate * nights)}</span>
            </div>
            {cleaningFee > 0 && (
              <div className="flex justify-between text-stone-600">
                <span>Cleaning fee</span>
                <span>{fmt(cleaningFee)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-stone-200 pt-2 font-semibold text-stone-950">
              <span>Estimated total</span>
              <span>{fmt(nightlyRate * nights + cleaningFee)}</span>
            </div>
          </div>
        )}

        {/* Server-confirmed quote */}
        {quote && step === "quote" && (
          <div className="rounded-xl bg-stone-50 p-3 space-y-1.5 text-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 mb-2">
              ✓ Available — confirmed price
            </p>
            <div className="flex justify-between text-stone-600">
              <span>{fmt(quote.nightlyRate)} × {quote.nights} night{quote.nights !== 1 ? "s" : ""}</span>
              <span>{fmt(quote.nightlyRate * quote.nights)}</span>
            </div>
            {quote.cleaningFee > 0 && (
              <div className="flex justify-between text-stone-600">
                <span>Cleaning fee</span>
                <span>{fmt(quote.cleaningFee)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-stone-200 pt-2 font-semibold text-stone-950">
              <span>Total</span>
              <span>{fmt(quote.subtotal)}</span>
            </div>
          </div>
        )}

        {error && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        {step === "quote" ? (
          <button
            type="button"
            onClick={handleReserveClick}
            className="w-full rounded-xl bg-stone-950 px-5 py-3 text-sm font-semibold text-white hover:bg-stone-800 transition-colors"
          >
            Reserve — pay via PayPal
          </button>
        ) : (
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-stone-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60 hover:bg-stone-800 transition-colors"
          >
            {loading ? "Checking…" : "Check availability"}
          </button>
        )}
        <p className="text-center text-xs text-stone-400">You won&apos;t be charged until the next step</p>
      </form>

      <hr className="border-stone-100" />

      {/* Enquiry fallback */}
      <div>
        <button
          onClick={() => setShowEnquiry(!showEnquiry)}
          className="text-sm font-medium text-stone-700 hover:text-stone-950 underline underline-offset-4"
        >
          {showEnquiry ? "Hide enquiry form" : "Send an enquiry instead"}
        </button>

        {showEnquiry && (
          <form onSubmit={handleEnquirySubmit} className="mt-4 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-500">Name *</label>
              <input required type="text" value={name} onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-950" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-500">Email *</label>
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-950" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-500">Phone (optional)</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                placeholder="+61 4xx xxx xxx"
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-950" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-stone-500">Message (optional)</label>
              <textarea value={messageText} onChange={(e) => setMessageText(e.target.value)}
                placeholder="Any questions or special requests?"
                rows={3}
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-950 resize-none" />
            </div>
            {error && (
              <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
            )}
            <button type="submit" disabled={enquirySubmitting}
              className="w-full rounded-xl bg-stone-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60 hover:bg-stone-800 transition-colors">
              {enquirySubmitting ? "Submitting…" : "Submit enquiry"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
