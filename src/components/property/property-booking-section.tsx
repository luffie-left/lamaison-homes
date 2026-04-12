"use client";

import { useState, useEffect, useCallback } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  addMonths,
  isBefore,
  isAfter,
  isSameDay,
  isWithinInterval,
  startOfDay,
} from "date-fns";

// ── Inline calendar (no separate file needed) ─────────────────────────────────

function CalendarMonth({
  monthDate,
  blockedDates,
  selectedStart,
  selectedEnd,
  hovered,
  onDayClick,
  onDayHover,
}: {
  monthDate: Date;
  blockedDates: Set<string>;
  selectedStart: Date | null;
  selectedEnd: Date | null;
  hovered: Date | null;
  onDayClick: (d: Date) => void;
  onDayHover: (d: Date | null) => void;
}) {
  const today = startOfDay(new Date());
  const start = startOfMonth(monthDate);
  const end = endOfMonth(monthDate);
  const days = eachDayOfInterval({ start, end });
  const startDow = getDay(start);
  const rangeEnd = selectedStart && !selectedEnd && hovered ? hovered : selectedEnd;

  return (
    <div>
      <p className="mb-3 text-center text-sm font-medium text-stone-900">
        {format(monthDate, "MMMM yyyy")}
      </p>
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div key={d} className="pb-2 text-xs font-medium text-stone-400">{d}</div>
        ))}
        {Array.from({ length: startDow }).map((_, i) => <div key={`sp-${i}`} />)}
        {days.map((day) => {
          const iso = format(day, "yyyy-MM-dd");
          const isBlocked = blockedDates.has(iso);
          const isPast = isBefore(day, today);
          const isDisabled = isBlocked || isPast;
          const isStart = selectedStart ? isSameDay(day, selectedStart) : false;
          const isEnd = rangeEnd ? isSameDay(day, rangeEnd) : false;
          const isInRange =
            selectedStart && rangeEnd
              ? isWithinInterval(day, {
                  start: isAfter(selectedStart, rangeEnd) ? rangeEnd : selectedStart,
                  end: isAfter(selectedStart, rangeEnd) ? selectedStart : rangeEnd,
                })
              : false;

          let cls = "relative flex items-center justify-center w-8 h-8 mx-auto rounded-full text-sm transition-colors ";
          if (isBlocked) cls += "bg-stone-100 text-stone-300 cursor-not-allowed line-through ";
          else if (isPast) cls += "text-stone-300 cursor-not-allowed ";
          else if (isStart || isEnd) cls += "bg-stone-950 text-white font-medium cursor-pointer ";
          else if (isInRange) cls += "bg-stone-200 text-stone-800 cursor-pointer rounded-none ";
          else cls += "text-stone-700 hover:bg-stone-100 cursor-pointer ";

          return (
            <div
              key={iso}
              className={cls}
              onClick={() => !isDisabled && onDayClick(day)}
              onMouseEnter={() => !isDisabled && onDayHover(day)}
              onMouseLeave={() => onDayHover(null)}
              title={isBlocked ? "Not available" : undefined}
            >
              {format(day, "d")}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Booking widget ────────────────────────────────────────────────────────────

type Step = "dates" | "enquiry" | "confirmed";

function fmt(n: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: 0 }).format(n);
}

function nightsBetween(a: string, b: string) {
  if (!a || !b) return 0;
  return Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000));
}

// ── Main component ────────────────────────────────────────────────────────────

const IS_SANDBOX = process.env.NEXT_PUBLIC_PAYPAL_ENVIRONMENT !== 'live'

export function PropertyBookingSection({
  slug,
  listingId,
  nightlyRate,
  cleaningFee,
}: {
  slug: string;
  listingId: number;
  nightlyRate: number;
  cleaningFee: number;
}) {
  const [blockedDates, setBlockedDates] = useState<Set<string>>(new Set());
  const [calLoading, setCalLoading] = useState(true);
  const [selectedStart, setSelectedStart] = useState<Date | null>(null);
  const [selectedEnd, setSelectedEnd] = useState<Date | null>(null);
  const [hovered, setHovered] = useState<Date | null>(null);
  const [calendarOffset, setCalendarOffset] = useState(0); // months from today
  const month0 = addMonths(startOfMonth(new Date()), calendarOffset);
  const month1 = addMonths(month0, 1); // second month (still show 2 for context)
  const maxOffset = 11; // show up to 12 months ahead

  // Form state
  const [step, setStep] = useState<Step>("dates");
  const [guests, setGuests] = useState(2);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [payNowLoading, setPayNowLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookingRef, setBookingRef] = useState<string | null>(null);
  const [portalToken, setPortalToken] = useState<string | null>(null);

  const checkIn = selectedStart ? format(selectedStart, "yyyy-MM-dd") : null;
  const checkOut = selectedEnd ? format(selectedEnd, "yyyy-MM-dd") : null;
  const nights = checkIn && checkOut ? nightsBetween(checkIn, checkOut) : 0;
  const total = nights * nightlyRate + (nights > 0 ? cleaningFee : 0);

  const fetchAvailability = useCallback(async () => {
    try {
      setCalLoading(true);
      const res = await fetch(`/api/stays/${slug}/availability`);
      if (!res.ok) return;
      const data = await res.json();
      setBlockedDates(new Set(data.blockedDates ?? []));
    } catch { /* ignore */ }
    finally { setCalLoading(false); }
  }, [slug]);

  useEffect(() => { fetchAvailability(); }, [fetchAvailability]);

  // Broadcast dates for desktop widget
  useEffect(() => {
    document.dispatchEvent(new CustomEvent("set-dates", { detail: { checkIn, checkOut }, bubbles: true }));
  }, [checkIn, checkOut]);

  function handleDayClick(day: Date) {
    if (!selectedStart || (selectedStart && selectedEnd)) {
      setSelectedStart(day);
      setSelectedEnd(null);
      setStep("dates");
    } else {
      if (isBefore(day, selectedStart)) {
        setSelectedEnd(selectedStart);
        setSelectedStart(day);
      } else {
        setSelectedEnd(day);
      }
    }
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!name || !email) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, listingId, checkIn, checkOut, guests, message, total: total > 0 ? total : null, nightlyRate, cleaningFee }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setBookingRef(data.reference ?? null);
      setPortalToken(data.portalToken ?? null);
      setStep("confirmed");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // Pay Now — creates enquiry then immediately redirects to PayPal
  async function handlePayNow(e: React.FormEvent) {
    e.preventDefault();
    setPayNowLoading(true);
    setError(null);
    try {
      // Step 1: Create enquiry in Supabase
      const enquiryRes = await fetch("/api/enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, email, phone, listingId, checkIn, checkOut, guests, message,
          total: total > 0 ? total : null, nightlyRate, cleaningFee,
          propertyName: undefined, // filled by API from listing
        }),
      });
      if (!enquiryRes.ok) throw new Error("Failed to create enquiry");
      const enquiryData = await enquiryRes.json();
      const leadPortalToken = enquiryData.portalToken;

      // Step 2: Create PayPal order
      const orderRes = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: null, // token-based lookup
          listingId,
          checkIn,
          checkOut,
          nights,
          guests,
          total,
          portalToken: leadPortalToken,
        }),
      });
      if (!orderRes.ok) throw new Error("Failed to create PayPal order");
      const orderData = await orderRes.json();

      if (!orderData.approveUrl) throw new Error("No PayPal redirect URL");

      // Step 3: Redirect to PayPal hosted checkout
      window.location.href = orderData.approveUrl;
    } catch (err) {
      console.error("[pay-now]", err);
      setError("Something went wrong. Please try again or use Enquire.");
      setPayNowLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xl">
      {step === "confirmed" ? (
        <div className="text-center py-6">
          <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-3">
            <span className="text-green-600 text-xl">✓</span>
          </div>
          <p className="text-lg font-medium text-stone-900 mb-1">Enquiry received</p>
          {bookingRef && (
            <p className="text-xs font-mono bg-stone-100 text-stone-700 px-3 py-1.5 rounded-lg inline-block mb-3">{bookingRef}</p>
          )}
          <p className="text-sm text-stone-500 mb-4">Check your email — we&apos;ll confirm within 2 hours.</p>
          {portalToken && (
            <a href={`/portal?token=${portalToken}`} className="inline-block text-sm text-stone-950 underline underline-offset-2 hover:text-stone-600">
              View booking details →
            </a>
          )}
        </div>
      ) : (
        <>
          {/* Price header */}
          <div className="mb-5">
            <span className="text-2xl font-semibold text-stone-950">{fmt(nightlyRate)}</span>
            <span className="text-stone-500 text-sm"> / night</span>
          </div>

          {/* Calendar — with blocked dates */}
          <div className="mb-5">
            <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-3">
              {checkIn && checkOut
                ? `${checkIn} → ${checkOut} · ${nights} night${nights !== 1 ? "s" : ""}`
                : checkIn
                ? "Select check-out date"
                : "Select dates"}
            </p>
            {calLoading ? (
              <p className="text-xs text-stone-400 py-4 text-center">Loading availability…</p>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <button
                    type="button"
                    onClick={() => setCalendarOffset(o => Math.max(0, o - 1))}
                    disabled={calendarOffset === 0}
                    className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    aria-label="Previous months"
                  >
                    ‹
                  </button>
                  <span className="text-xs text-stone-400">
                    {format(month0, 'MMM yyyy')} – {format(month1, 'MMM yyyy')}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCalendarOffset(o => Math.min(maxOffset - 1, o + 1))}
                    disabled={calendarOffset >= maxOffset - 1}
                    className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    aria-label="Next months"
                  >
                    ›
                  </button>
                </div>
                <div className="grid gap-6 sm:grid-cols-2">
                  <CalendarMonth monthDate={month0} blockedDates={blockedDates} selectedStart={selectedStart} selectedEnd={selectedEnd} hovered={hovered} onDayClick={handleDayClick} onDayHover={setHovered} />
                  <CalendarMonth monthDate={month1} blockedDates={blockedDates} selectedStart={selectedStart} selectedEnd={selectedEnd} hovered={hovered} onDayClick={handleDayClick} onDayHover={setHovered} />
                </div>
              </div>
            )}
            {(checkIn || checkOut) && (
              <button onClick={() => { setSelectedStart(null); setSelectedEnd(null); }} className="mt-2 text-xs text-stone-400 underline hover:text-stone-700">
                Clear dates
              </button>
            )}
          </div>

          {/* Guests */}
          <div className="mb-5">
            <label className="text-xs font-medium text-stone-500 uppercase tracking-wide block mb-2">Guests</label>
            <select
              value={guests}
              onChange={e => setGuests(Number(e.target.value))}
              className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm text-stone-800 focus:outline-none focus:ring-1 focus:ring-stone-400"
            >
              {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n} guest{n !== 1 ? "s" : ""}</option>)}
            </select>
          </div>

          {/* Price breakdown */}
          {nights > 0 && (
            <div className="mb-5 space-y-2 text-sm border-t border-stone-100 pt-4">
              <div className="flex justify-between text-stone-600">
                <span>{fmt(nightlyRate)} × {nights} night{nights !== 1 ? "s" : ""}</span>
                <span>{fmt(nightlyRate * nights)}</span>
              </div>
              <div className="flex justify-between text-stone-600">
                <span>Cleaning fee</span>
                <span>{fmt(cleaningFee)}</span>
              </div>
              <div className="flex justify-between font-semibold text-stone-900 border-t border-stone-100 pt-2">
                <span>Total</span>
                <span>{fmt(total)}</span>
              </div>
            </div>
          )}

          {/* Reserve button or enquiry form */}
          {step === "dates" && (
            <>
              <button
                onClick={() => { if (checkIn && checkOut) setStep("enquiry"); }}
                disabled={!checkIn || !checkOut}
                className="w-full rounded-full bg-stone-950 py-3 text-sm font-medium text-stone-50 hover:bg-stone-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {checkIn && checkOut ? "Reserve" : "Select dates to reserve"}
              </button>
              <p className="mt-2 text-center text-xs text-stone-400">You won&apos;t be charged yet</p>
            </>
          )}

          {step === "enquiry" && (
            <form className="space-y-3">
              <p className="text-sm font-medium text-stone-800 mb-3">Your details</p>
              <input required placeholder="Full name" value={name} onChange={e => setName(e.target.value)}
                className="w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-stone-400" />
              <input required type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-stone-400" />
              <input placeholder="Phone (optional)" value={phone} onChange={e => setPhone(e.target.value)}
                className="w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-stone-400" />
              <textarea placeholder="Any questions or special requests?" value={message} onChange={e => setMessage(e.target.value)} rows={3}
                className="w-full rounded-xl border border-stone-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-stone-400" />
              {error && <p className="text-xs text-red-500">{error}</p>}

              {/* Action row: Enquire + Pay Now */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting || payNowLoading || !name || !email}
                  className="rounded-full border border-stone-300 bg-white py-3 text-sm font-medium text-stone-800 hover:bg-stone-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {submitting ? "Sending…" : "Enquire"}
                </button>
                <button
                  type="button"
                  onClick={handlePayNow}
                  disabled={payNowLoading || submitting || !name || !email || total <= 0}
                  className="rounded-full bg-[#003087] py-3 text-sm font-medium text-white hover:bg-[#002266] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                >
                  {payNowLoading ? (
                    <><span className="w-3.5 h-3.5 border border-white/40 border-t-white rounded-full animate-spin" /> Processing…</>
                  ) : (
                    <>Pay {fmt(total)}</>
                  )}
                </button>
              </div>

              {/* PayPal trust badge */}
              <div className="rounded-xl bg-stone-50 border border-stone-100 px-4 py-3 text-center">
                <p className="text-xs text-stone-500 mb-1">
                  🔒 Pay securely with PayPal · 3D Secure
                </p>
                <p className="text-[11px] text-stone-400">
                  Your payment is protected by PayPal Buyer Protection
                </p>
                {IS_SANDBOX && (
                  <p className="mt-1 text-[10px] text-amber-600 font-medium">🧪 Sandbox mode — no real charges</p>
                )}
              </div>

              <button type="button" onClick={() => setStep("dates")} className="w-full text-xs text-stone-400 underline hover:text-stone-700">
                ← Back to dates
              </button>
            </form>
          )}
        </>
      )}
    </div>
  );
}
