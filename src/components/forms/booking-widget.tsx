"use client";

import { useState } from "react";
import {
  DIAL_CODES,
  DEFAULT_DIAL_CODE,
  composeE164,
  isValidE164,
} from "@/lib/phone";
import { serverErrorOr } from "@/lib/client-error";

type QuoteResult = {
  nights: number;
  nightlyRate: number;
  cleaningFee: number;
  subtotal: number;
  currency: string;
  /** Server-confirmed listing default (quote response) — A2 cue only. */
  minStay?: number;
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
  minimumStay,
  checkInDate,
  checkOutDate,
}: {
  listingId: number;
  propertyName?: string;
  nightlyRate: number;
  cleaningFee?: number;
  /** Listing-level default min stay (A2 cue — server check stays authoritative). */
  minimumStay?: number;
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
  // A3: dial code + local number, submitted as E.164 (+61412345678)
  const [phoneDial, setPhoneDial] = useState(DEFAULT_DIAL_CODE);
  const [phoneLocal, setPhoneLocal] = useState("");
  const phone = composeE164(phoneDial, phoneLocal); // null until plausible
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

  // A2: live min-stay cue — server (quote/create-order) stays authoritative.
  // Prefer the server-confirmed minStay from a fresh quote, else listing default.
  const effectiveMinStay =
    (typeof quote?.minStay === "number" && quote.minStay > 0
      ? quote.minStay
      : typeof minimumStay === "number" && minimumStay > 0
        ? minimumStay
        : null);
  const minStayNotMet =
    effectiveMinStay !== null && nights > 0 && nights < effectiveMinStay;

  // >28-night gate (terms v2): online booking capped at 28 nights until
  // rolling block-payment automation ships. Server (quote API) is authoritative.
  const MAX_ONLINE_NIGHTS = 28;
  const overMaxNights = nights > MAX_ONLINE_NIGHTS;

  // A3: full E.164 number ready to submit?
  const phoneValid = phone !== null && isValidE164(phone);
  const phoneError =
    phoneLocal.length > 0 && !phoneValid
      ? "Enter a valid phone number (7\u201315 digits after the country code)"
      : null;

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
        // A1: quoteRes errors already surface the server message (e.g.
        // "Minimum stay is 3 nights for these dates"); keep a safe fallback.
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
    if (!quote || !phoneValid || !phone) {
      if (!phoneValid) setError("Enter a valid phone number (7\u201315 digits after the country code)");
      return;
    }
    setError(null);
    setSubmitting(true);
    let paymentFailedAfterLead = false;

    try {
      // 3a. Create booking draft (lead) in Supabase
      const enquiryRes = await fetch("/api/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
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
      if (!orderRes.ok) {
        // A1: surface the server's real reason (e.g. MIN_STAY_NOT_MET message,
        // pricing-changed guard). A4: the lead was already created — payment
        // didn’t complete, so reassure the guest that the enquiry is safe.
        paymentFailedAfterLead = true;
        setError(
          (await serverErrorOr(orderRes, "")) ||
            "Failed to create payment order. Please try again or use enquiry." +
              " Your enquiry was received — payment didn’t complete, we’ll send a secure payment link."
        );
        return;
      }
      if (orderData.error) {
        paymentFailedAfterLead = true;
        setError(orderData.error);
        return;
      }

      // 3c. Redirect to PayPal approval URL
      setStep("redirecting");
      window.location.href = orderData.approveUrl;
    } catch {
      // A4: network-level failure after the lead was created — the lead is
      // safe; reassure the guest. Server-side marking happens in the
      // create-order failure path where possible.
      setError(
        paymentFailedAfterLead
          ? "Your enquiry was received \u2014 payment didn\u2019t complete, we\u2019ll send a secure payment link."
          : "Something went wrong. Please try again."
      );
      setSubmitting(false);
    }
  }

  // ─── Enquiry-only fallback (no payment) ───────────────────────────────────
  async function handleEnquirySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!phoneValid || !phone) {
      setError("Enter a valid phone number (7\u201315 digits after the country code)");
      return;
    }
    setError(null);
    setEnquirySubmitting(true);
    try {
      const res = await fetch("/api/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
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

  // Reusable phone field (A3): country-code select + local number, stored E.164
  function renderPhoneField(idPrefix: string) {
    return (
      <div>
        <label className="mb-1 block text-xs font-medium text-stone-500">Phone *</label>
        <div className="flex gap-2">
          <label className="sr-only" htmlFor={`${idPrefix}-dial`}>Country code</label>
          <select
            id={`${idPrefix}-dial`}
            value={phoneDial}
            onChange={(e) => setPhoneDial(e.target.value)}
            className="rounded-xl border border-stone-200 bg-white px-2 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-950"
          >
            {DIAL_CODES.map((d) => (
              <option key={d.dial + d.country} value={d.dial}>
                {d.country} {d.dial}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor={`${idPrefix}-local`}>Phone number</label>
          <input
            id={`${idPrefix}-local`}
            required
            type="tel"
            inputMode="tel"
            placeholder="412 345 678"
            value={phoneLocal}
            onChange={(e) => setPhoneLocal(e.target.value)}
            aria-invalid={!!phoneError}
            className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-stone-950"
          />
        </div>
        {phoneError && <p className="mt-1 text-xs text-red-600">{phoneError}</p>}
      </div>
    );
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
          <p className="mt-2 text-sm text-stone-500">We&apos;ll confirm as soon as possible, usually within a few hours.</p>
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
            setPhoneLocal("");
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
          {renderPhoneField("pay")}
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
            disabled={submitting || !phoneValid}
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

        {/* A2: live min-stay cue — client-side early warning; server stays authoritative */}
        {minStayNotMet && (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-700">
            Minimum stay is {effectiveMinStay} night{effectiveMinStay !== 1 ? "s" : ""} for these dates — please extend your stay.
          </p>
        )}

        {/* >28-night gate: long stays go via contact until block payments exist */}
        {overMaxNights && (
          <div className="rounded-xl bg-amber-50 px-3 py-3 text-sm text-amber-800 space-y-1">
            <p className="font-semibold">Staying longer than 28 nights?</p>
            <p>
              Online booking supports stays of up to 28 nights. For longer stays,{" "}
              <a href="/contact" className="underline font-medium">contact us</a> and our team will arrange a tailored
              long-stay rate and payment schedule.
            </p>
          </div>
        )}

        {step === "quote" ? (
          <button
            type="button"
            onClick={handleReserveClick}
            disabled={minStayNotMet || overMaxNights}
            className="w-full rounded-xl bg-stone-950 px-5 py-3 text-sm font-semibold text-white hover:bg-stone-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
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
            {renderPhoneField("enq")}
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
            <button type="submit" disabled={enquirySubmitting || !phoneValid}
              className="w-full rounded-xl bg-stone-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60 hover:bg-stone-800 transition-colors">
              {enquirySubmitting ? "Submitting…" : "Submit enquiry"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
