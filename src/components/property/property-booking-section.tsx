"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { BookingWidget } from "@/components/forms/booking-widget";

const AvailabilityCalendarInner = dynamic(
  () => import("./availability-calendar").then((m) => m.AvailabilityCalendar),
  {
    ssr: false,
    loading: () => <div className="py-8 text-sm text-stone-400">Loading calendar…</div>,
  }
);

interface PropertyBookingSectionProps {
  slug: string;
  listingId: number;
  nightlyRate: number;
  cleaningFee: number;
}

/**
 * Client component that owns check-in/check-out state.
 * Connects the availability calendar to the booking widget so
 * selected dates flow directly into the reserve form.
 */
export function PropertyBookingSection({
  slug,
  listingId,
  nightlyRate,
  cleaningFee,
}: PropertyBookingSectionProps) {
  const [checkIn, setCheckIn] = useState<string | null>(null);
  const [checkOut, setCheckOut] = useState<string | null>(null);

  function handleDatesChange(ci: string | null, co: string | null) {
    setCheckIn(ci);
    setCheckOut(co);
  }

  return (
    <>
      {/* Availability — hidden, date state managed here for widget pre-fill */}
      <div className="hidden">
        <AvailabilityCalendarInner slug={slug} onDatesChange={handleDatesChange} />
      </div>

        {/* Reserve button that appears once both dates are selected */}
        {checkIn && checkOut && (
          <div className="mt-6 rounded-2xl border border-[#c9a96e] bg-[#f7f2eb] p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-stone-900">Ready to reserve?</p>
                <p className="text-xs text-stone-500 mt-0.5">{checkIn} → {checkOut}</p>
              </div>
              <button
                onClick={() => {
                  // Scroll to booking widget and pre-fill dates
                  const widget = document.getElementById("booking-widget");
                  if (widget) {
                    widget.scrollIntoView({ behavior: "smooth", block: "center" });
                    // Dispatch custom event for widget to pick up
                    widget.dispatchEvent(
                      new CustomEvent("set-dates", {
                        detail: { checkIn, checkOut },
                        bubbles: true,
                      })
                    );
                  }
                }}
                className="rounded-full bg-stone-950 px-5 py-2.5 text-sm font-medium text-stone-50 hover:bg-stone-800 transition-colors"
              >
                Reserve →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile booking widget with pre-filled dates */}
      <div id="booking-widget" className="py-8 lg:hidden">
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-xl">
          <BookingWidget
            listingId={listingId}
            nightlyRate={nightlyRate}
            cleaningFee={cleaningFee}
            checkInDate={checkIn ?? undefined}
            checkOutDate={checkOut ?? undefined}
          />
        </div>
      </div>
    </>
  );
}

/**
 * Desktop sticky widget — also receives dates from calendar via props.
 */
export function DesktopBookingWidget({
  listingId,
  nightlyRate,
  cleaningFee,
  checkIn,
  checkOut,
}: {
  listingId: number;
  nightlyRate: number;
  cleaningFee: number;
  checkIn?: string | null;
  checkOut?: string | null;
}) {
  return (
    <BookingWidget
      listingId={listingId}
      nightlyRate={nightlyRate}
      cleaningFee={cleaningFee}
      checkInDate={checkIn ?? undefined}
      checkOutDate={checkOut ?? undefined}
    />
  );
}
