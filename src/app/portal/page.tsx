"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { MapPin, Calendar, Users, Clock, ChevronRight, Phone, Mail } from "lucide-react";

interface Booking {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  reference: string | null;
  portal_token: string | null;
  property_name: string | null;
  listing_id: number | null;
  check_in: string | null;
  check_out: string | null;
  nights: number | null;
  num_guests: number | null;
  total_amount: number | null;
  nightly_rate: number | null;
  cleaning_fee: number | null;
  status: string;
  created_at: string;
}

interface PropertyInfo {
  heroImage: string | null;
  suburb: string | null;
  city: string | null;
  checkInTime: number | null;
  checkOutTime: number | null;
  address: string | null;
}

function fmtDate(iso: string | null, opts?: Intl.DateTimeFormatOptions): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-AU", opts ?? {
      weekday: "short", day: "numeric", month: "short", year: "numeric"
    });
  } catch { return iso; }
}

function fmtTime(h: number | null): string {
  if (h === null) return "—";
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hour}:00 ${ampm}`;
}

function fmtCurrency(n: number | null): string {
  if (!n) return "—";
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }).format(n);
}

const STATUS_CONFIG: Record<string, { label: string; icon: string; headerBg: string; badgeCls: string }> = {
  new:             { label: "Pending review",  icon: "⏳", headerBg: "bg-amber-500",  badgeCls: "bg-amber-50 text-amber-800 border-amber-200" },
  confirmed:       { label: "Booking confirmed", icon: "✓", headerBg: "bg-[#1a1a1a]", badgeCls: "bg-green-50 text-green-800 border-green-200" },
  declined:        { label: "Unavailable",     icon: "✕", headerBg: "bg-stone-500",   badgeCls: "bg-red-50 text-red-800 border-red-200" },
  pending_payment: { label: "Awaiting payment", icon: "💳", headerBg: "bg-blue-600",  badgeCls: "bg-blue-50 text-blue-800 border-blue-200" },
}

function Divider() {
  return <div className="border-t border-stone-100 my-6" />;
}

function PortalContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [booking, setBooking] = useState<Booking | null>(null);
  const [property, setProperty] = useState<PropertyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState("");
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  // Check sessionStorage for prior verification
  useEffect(() => {
    if (token && typeof window !== "undefined") {
      const prior = sessionStorage.getItem(`portal_verified_${token}`);
      if (prior === "true") setVerified(true);
    }
  }, [token]);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setVerifying(true);
    setVerifyError(null);
    try {
      const res = await fetch("/api/portal/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email: verifyEmail }),
      });
      const data = await res.json();
      if (data.verified) {
        if (typeof window !== "undefined") sessionStorage.setItem(`portal_verified_${token}`, "true");
        setVerified(true);
      } else if (res.status === 429) {
        setVerifyError("Too many attempts. Please try again in an hour.");
      } else {
        setVerifyError("Email doesn\'t match our records. Please check your confirmation email.");
      }
    } catch {
      setVerifyError("Something went wrong. Please try again.");
    } finally {
      setVerifying(false);
    }
  }

  useEffect(() => {
    if (!token) { setError("Invalid link"); setLoading(false); return; }
    if (!verified) { setLoading(false); return; }  // wait for email verification
    fetch(`/api/portal/booking?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(async d => {
        if (d.error) { setError("Booking not found. Please check your confirmation email."); return; }
        setBooking(d.booking);
        // Fetch property info from Hostaway via API
        if (d.booking.listing_id) {
          try {
            const res = await fetch(`/api/stays/${d.booking.listing_id}`);
            if (res.ok) {
              const pd = await res.json();
              const stay = pd.stay;
              setProperty({
                heroImage: stay?.heroImage ?? stay?.gallery?.[0] ?? null,
                suburb: stay?.suburb ?? null,
                city: stay?.city ?? null,
                checkInTime: stay?.checkInTime ?? null,
                checkOutTime: stay?.checkOutTime ?? null,
                address: null, // never expose full address publicly
              });
            }
          } catch { /* property info optional */ }
        }
      })
      .catch(() => setError("Unable to load booking. Please try again."))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f2eb] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-stone-300 border-t-stone-700 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-[#f7f2eb] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <p className="text-4xl mb-4">🔍</p>
          <h1 className="text-xl font-medium text-stone-900 mb-2">Booking not found</h1>
          <p className="text-sm text-stone-500 mb-6">{error ?? "This link may be expired."}</p>
          <Link href="/stays" className="inline-block bg-stone-950 text-stone-50 px-6 py-3 rounded-full text-sm font-medium hover:bg-stone-800">
            Browse stays
          </Link>
        </div>
      </div>
    );
  }

  const st = STATUS_CONFIG[booking.status] ?? STATUS_CONFIG.new;
  const firstName = booking.name.split(" ")[0];
  const isConfirmed = booking.status === "confirmed";
  const isPending = booking.status === "new";

  // Price breakdown
  const nightlyRate = booking.nightly_rate;
  const cleaningFee = booking.cleaning_fee;
  const nights = booking.nights ?? 0;
  const accommodationTotal = nightlyRate && nights ? nightlyRate * nights : null;
  const grandTotal = booking.total_amount;

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Top nav */}
      <div className="bg-white border-b border-stone-100 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <Link href="/" className="text-sm font-semibold tracking-[2px] text-stone-900 uppercase">La Maison</Link>
        <Link href="/stays" className="text-xs text-stone-400 hover:text-stone-700">Browse stays</Link>
      </div>

      {/* Hero image */}
      {property?.heroImage ? (
        <div className="relative h-64 sm:h-80 overflow-hidden">
          <img src={property.heroImage} alt={booking.property_name ?? "Property"} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between">
            <div>
              <p className="text-white/70 text-xs uppercase tracking-widest mb-1">{property.suburb}{property.city && property.suburb !== property.city ? `, ${property.city}` : ''}</p>
              <h1 className="text-white text-2xl font-medium">{booking.property_name ?? `Listing #${booking.listing_id}`}</h1>
            </div>
          </div>
        </div>
      ) : (
        <div className="h-40 bg-stone-900 flex items-end px-5 pb-5">
          <div>
            <p className="text-stone-400 text-xs uppercase tracking-widest mb-1">La Maison Homes</p>
            <h1 className="text-white text-2xl font-medium">{booking.property_name ?? `Listing #${booking.listing_id}`}</h1>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-0">

        {/* Confirmation banner */}
        <div className={`rounded-2xl border px-5 py-4 flex items-center gap-4 mb-6 ${st.badgeCls}`}>
          <span className="text-3xl">{st.icon}</span>
          <div className="flex-1">
            <p className="font-semibold text-base">{st.label}</p>
            {isPending && <p className="text-xs mt-0.5 opacity-70">Our team will review and confirm within 2 hours</p>}
            {isConfirmed && <p className="text-xs mt-0.5 opacity-70">Hi {firstName}! Your stay is all set.</p>}
          </div>
          {booking.reference && (
            <p className="text-xs font-mono opacity-60 flex-shrink-0">{booking.reference}</p>
          )}
        </div>

        {/* Main card */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">

          {/* Trip dates */}
          <div className="p-6">
            <div className="flex items-center gap-2 mb-5">
              <Calendar size={16} className="text-stone-400" />
              <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">Trip details</h2>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div className="bg-stone-50 rounded-xl p-4">
                <p className="text-xs text-stone-400 uppercase tracking-wide mb-2">Check-in</p>
                <p className="text-lg font-semibold text-stone-900">{fmtDate(booking.check_in, { weekday: "short", day: "numeric", month: "short" })}</p>
                <p className="text-xs text-stone-500 mt-1 flex items-center gap-1">
                  <Clock size={10} />
                  {property?.checkInTime ? `After ${fmtTime(property.checkInTime)}` : "After 3:00 PM"}
                </p>
              </div>
              <div className="bg-stone-50 rounded-xl p-4">
                <p className="text-xs text-stone-400 uppercase tracking-wide mb-2">Check-out</p>
                <p className="text-lg font-semibold text-stone-900">{fmtDate(booking.check_out, { weekday: "short", day: "numeric", month: "short" })}</p>
                <p className="text-xs text-stone-500 mt-1 flex items-center gap-1">
                  <Clock size={10} />
                  {property?.checkOutTime ? `Before ${fmtTime(property.checkOutTime)}` : "Before 11:00 AM"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-5 text-sm text-stone-600">
              {nights > 0 && <span className="flex items-center gap-1.5"><Calendar size={13} className="text-stone-400" />{nights} night{nights !== 1 ? "s" : ""}</span>}
              {booking.num_guests && <span className="flex items-center gap-1.5"><Users size={13} className="text-stone-400" />{booking.num_guests} guest{booking.num_guests !== 1 ? "s" : ""}</span>}
            </div>
          </div>

          <Divider />

          {/* Getting there */}
          <div className="px-6 pb-6">
            <div className="flex items-center gap-2 mb-4">
              <MapPin size={16} className="text-stone-400" />
              <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">Getting there</h2>
            </div>
            <div className="bg-stone-50 rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-stone-200 rounded-lg flex items-center justify-center flex-shrink-0">
                <MapPin size={18} className="text-stone-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-stone-900">
                  {property?.suburb ?? ""}{property?.city && property?.suburb !== property?.city ? `, ${property.city}` : ""}
                  {!property?.suburb && !property?.city ? "Melbourne, VIC" : ""}
                </p>
                {isConfirmed ? (
                  <p className="text-xs text-stone-500 mt-0.5">Full address and access code will be sent 48 hours before check-in</p>
                ) : (
                  <p className="text-xs text-stone-400 mt-0.5">Address revealed after confirmation</p>
                )}
              </div>
            </div>
          </div>

          <Divider />

          {/* Price breakdown */}
          <div className="px-6 pb-6">
            <div className="flex items-center gap-2 mb-5">
              <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wide">Price breakdown</h2>
            </div>
            <div className="space-y-3 text-sm">
              {nightlyRate && nights > 0 ? (
                <div className="flex justify-between text-stone-600">
                  <span>{fmtCurrency(nightlyRate)} × {nights} night{nights !== 1 ? "s" : ""}</span>
                  <span>{accommodationTotal ? fmtCurrency(accommodationTotal) : "—"}</span>
                </div>
              ) : grandTotal ? (
                <div className="flex justify-between text-stone-600">
                  <span>Accommodation{nights > 0 ? ` (${nights} nights)` : ""}</span>
                  <span>{fmtCurrency(grandTotal)}</span>
                </div>
              ) : null}
              {cleaningFee && cleaningFee > 0 && (
                <div className="flex justify-between text-stone-600">
                  <span>Cleaning fee</span>
                  <span>{fmtCurrency(cleaningFee)}</span>
                </div>
              )}
              {grandTotal && (
                <div className="flex justify-between font-semibold text-stone-900 border-t border-stone-100 pt-3">
                  <span>Total</span>
                  <span>{fmtCurrency(grandTotal)} AUD</span>
                </div>
              )}
            </div>

            {/* Payment status */}
            <div className={`mt-4 rounded-xl px-4 py-3 flex items-center gap-3 ${
              booking.status === "confirmed" ? "bg-amber-50 border border-amber-200" :
              booking.status === "pending_payment" ? "bg-blue-50 border border-blue-200" :
              "bg-stone-50 border border-stone-200"
            }`}>
              <span className="text-lg">{booking.status === "pending_payment" ? "💳" : "⏳"}</span>
              <div>
                <p className={`text-xs font-semibold ${booking.status === "pending_payment" ? "text-blue-800" : "text-amber-800"}`}>
                  {booking.status === "pending_payment" ? "Payment due" : "Payment details coming soon"}
                </p>
                <p className={`text-xs mt-0.5 ${booking.status === "pending_payment" ? "text-blue-600" : "text-amber-600"}`}>
                  We'll contact you with payment instructions shortly
                </p>
              </div>
            </div>
          </div>

          <Divider />

          {/* What happens next (pending) */}
          {isPending && (
            <>
              <div className="px-6 pb-6">
                <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wide mb-4">What happens next</h2>
                <div className="space-y-4">
                  {[
                    { icon: "✅", text: "Enquiry received", done: true },
                    { icon: "⏳", text: "Team reviews availability (within 2 hours)", done: false },
                    { icon: "📧", text: "Confirmation email sent to you", done: false },
                    { icon: "💳", text: "Payment instructions sent", done: false },
                    { icon: "🔑", text: "Check-in details sent 48 hours before arrival", done: false },
                  ].map((step, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-base w-7 text-center">{step.icon}</span>
                      <span className={`text-sm ${step.done ? "text-stone-900 font-medium" : "text-stone-400"}`}>{step.text}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Divider />
            </>
          )}

          {/* Confirmed — check-in info */}
          {isConfirmed && (
            <>
              <div className="px-6 pb-6">
                <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wide mb-4">Check-in information</h2>
                <div className="space-y-3">
                  {[
                    { icon: "🔑", text: "Access code + full address", sub: "Sent 48 hours before arrival" },
                    { icon: "🏠", text: "Self check-in", sub: "Keypad or lockbox entry — no need to meet anyone" },
                    { icon: "📞", text: "24/7 support", sub: "Contact us anytime via bookings@lamaisonhomes.com.au" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-stone-50 rounded-xl">
                      <span className="text-lg mt-0.5">{item.icon}</span>
                      <div>
                        <p className="text-sm font-medium text-stone-900">{item.text}</p>
                        <p className="text-xs text-stone-500 mt-0.5">{item.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <Divider />
            </>
          )}

          {/* Cancellation policy */}
          <div className="px-6 pb-6">
            <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wide mb-3">Cancellation policy</h2>
            <p className="text-sm text-stone-600 leading-relaxed">
              Please contact us as soon as possible if you need to cancel or modify your booking. Cancellation policies vary by property — full details will be included in your booking confirmation.
            </p>
          </div>

          <Divider />

          {/* Contact */}
          <div className="px-6 pb-6">
            <h2 className="text-sm font-semibold text-stone-700 uppercase tracking-wide mb-4">Contact us</h2>
            <div className="space-y-3">
              <a href="mailto:bookings@lamaisonhomes.com.au" className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl hover:bg-stone-100 transition-colors">
                <Mail size={16} className="text-stone-400" />
                <div>
                  <p className="text-sm font-medium text-stone-900">bookings@lamaisonhomes.com.au</p>
                  <p className="text-xs text-stone-500">Reply to your confirmation email or email us directly</p>
                </div>
                <ChevronRight size={14} className="text-stone-300 ml-auto" />
              </a>
            </div>
            <p className="text-xs text-stone-400 mt-3 text-center">La Maison Homes · Premium short-stay management · Melbourne</p>
          </div>
        </div>

        {/* Bottom spacing */}
        <div className="h-8" />
      </div>
    </div>
  );
}

export default function PortalPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-stone-300 border-t-stone-700 rounded-full animate-spin" />
      </div>
    }>
      <PortalContent />
    </Suspense>
  );
}
