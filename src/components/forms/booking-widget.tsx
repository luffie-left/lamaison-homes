"use client";

import { useState } from "react";
import Link from "next/link";

type QuoteResult = {
  nights: number;
  nightlyRate: number;
  cleaningFee: number;
  subtotal: number;
  currency: string;
};

type Step = "dates" | "quote" | "confirmed";

function formatCurrencyAUD(amount: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function BookingWidget({
  listingId,
  nightlyRate,
}: {
  listingId: number;
  nightlyRate: number;
}) {
  const [step, setStep] = useState<Step>("dates");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(2);
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Enquiry form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [messageText, setMessageText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  async function handleCheckAvailability(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const params = new URLSearchParams({
        listingId: String(listingId),
        checkIn,
        checkOut,
        guests: String(guests),
      });

      const res = await fetch(`/api/quote?${params}`);
      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error ?? "Could not calculate quote. Please try again.");
        setLoading(false);
        return;
      }

      setQuote(data);
      setStep("quote");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitEnquiry(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone: phone || undefined,
          listingId,
          checkIn,
          checkOut,
          guests,
          message: messageText || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error ?? "Failed to submit enquiry. Please try again.");
        setSubmitting(false);
        return;
      }

      setStep("confirmed");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (step === "confirmed") {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-stone-800 text-2xl">
          ✓
        </div>
        <div>
          <p className="text-xl font-medium text-stone-50">Enquiry received</p>
          <p className="mt-2 text-sm leading-6 text-stone-300">
            We&apos;ll confirm your booking within 2 hours.
          </p>
        </div>
        {checkIn && checkOut && (
          <div className="rounded-[20px] bg-white/5 p-4 text-sm text-stone-300">
            <p>
              {checkIn} → {checkOut}
            </p>
            <p className="mt-1">{guests} guest{guests !== 1 ? "s" : ""}</p>
          </div>
        )}
        <Link
          href="/contact"
          className="block rounded-full border border-stone-400/40 px-5 py-3 text-center text-sm font-medium text-stone-50"
        >
          Questions? Contact us
        </Link>
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
          }}
          className="text-xs text-stone-500 underline-offset-4 hover:underline"
        >
          Make another enquiry
        </button>
      </div>
    );
  }

  if (step === "quote" && quote) {
    return (
      <form onSubmit={handleSubmitEnquiry} className="space-y-5">
        <div className="rounded-[20px] bg-white/5 p-4 text-sm text-stone-300 space-y-2">
          <div className="flex justify-between">
            <span>
              {formatCurrencyAUD(quote.nightlyRate)} × {quote.nights} night
              {quote.nights !== 1 ? "s" : ""}
            </span>
            <span>{formatCurrencyAUD(quote.nightlyRate * quote.nights)}</span>
          </div>
          {quote.cleaningFee > 0 && (
            <div className="flex justify-between">
              <span>Cleaning fee</span>
              <span>{formatCurrencyAUD(quote.cleaningFee)}</span>
            </div>
          )}
          <div className="border-t border-white/10 pt-2 flex justify-between font-medium text-stone-50">
            <span>Total</span>
            <span>{formatCurrencyAUD(quote.subtotal)}</span>
          </div>
          <p className="text-xs text-stone-500 pt-1">
            {checkIn} → {checkOut} · {guests} guest{guests !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-stone-400">
              Name <span className="text-stone-500">*</span>
            </label>
            <input
              required
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your full name"
              className="w-full rounded-2xl bg-white/10 px-4 py-3 text-sm text-stone-50 placeholder-stone-500 outline-none ring-1 ring-white/10 focus:ring-stone-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-stone-400">
              Email <span className="text-stone-500">*</span>
            </label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full rounded-2xl bg-white/10 px-4 py-3 text-sm text-stone-50 placeholder-stone-500 outline-none ring-1 ring-white/10 focus:ring-stone-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-stone-400">
              Phone <span className="text-stone-500">(optional)</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+61 4xx xxx xxx"
              className="w-full rounded-2xl bg-white/10 px-4 py-3 text-sm text-stone-50 placeholder-stone-500 outline-none ring-1 ring-white/10 focus:ring-stone-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-stone-400">
              Message <span className="text-stone-500">(optional)</span>
            </label>
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Any questions or special requests?"
              rows={3}
              className="w-full rounded-2xl bg-white/10 px-4 py-3 text-sm text-stone-50 placeholder-stone-500 outline-none ring-1 ring-white/10 focus:ring-stone-400 resize-none"
            />
          </div>
        </div>

        {error && (
          <p className="rounded-xl bg-red-900/40 px-4 py-3 text-sm text-red-300">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-stone-50 px-5 py-3 text-sm font-medium text-stone-950 disabled:opacity-60"
        >
          {submitting ? "Submitting…" : "Submit enquiry"}
        </button>
        <button
          type="button"
          onClick={() => {
            setStep("dates");
            setError(null);
          }}
          className="w-full rounded-full border border-stone-400/40 px-5 py-3 text-sm font-medium text-stone-50"
        >
          ← Change dates
        </button>
      </form>
    );
  }

  // Step 1: Dates + guests
  return (
    <form onSubmit={handleCheckAvailability} className="space-y-4">
      <div>
        <label className="mb-1 block text-xs text-stone-400">Check-in</label>
        <input
          required
          type="date"
          min={today}
          value={checkIn}
          onChange={(e) => setCheckIn(e.target.value)}
          className="w-full rounded-2xl bg-white/10 px-4 py-3 text-sm text-stone-50 outline-none ring-1 ring-white/10 focus:ring-stone-400 [color-scheme:dark]"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-stone-400">Check-out</label>
        <input
          required
          type="date"
          min={checkIn || today}
          value={checkOut}
          onChange={(e) => setCheckOut(e.target.value)}
          className="w-full rounded-2xl bg-white/10 px-4 py-3 text-sm text-stone-50 outline-none ring-1 ring-white/10 focus:ring-stone-400 [color-scheme:dark]"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-stone-400">Guests</label>
        <select
          value={guests}
          onChange={(e) => setGuests(Number(e.target.value))}
          className="w-full rounded-2xl bg-white/10 px-4 py-3 text-sm text-stone-50 outline-none ring-1 ring-white/10 focus:ring-stone-400 [color-scheme:dark]"
        >
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n} guest{n !== 1 ? "s" : ""}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="rounded-xl bg-red-900/40 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-full bg-stone-50 px-5 py-3 text-sm font-medium text-stone-950 disabled:opacity-60"
      >
        {loading ? "Checking…" : "Check availability"}
      </button>

      <p className="text-center text-xs leading-5 text-stone-500">
        From {formatCurrencyAUD(nightlyRate)} / night
      </p>
    </form>
  );
}
