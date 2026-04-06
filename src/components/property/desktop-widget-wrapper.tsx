"use client";

import { useState, useEffect, useRef } from "react";
import { BookingWidget } from "@/components/forms/booking-widget";

export function DesktopWidgetWrapper({
  listingId,
  nightlyRate,
  cleaningFee,
}: {
  listingId: number;
  nightlyRate: number;
  cleaningFee: number;
}) {
  const [checkIn, setCheckIn] = useState<string | undefined>(undefined);
  const [checkOut, setCheckOut] = useState<string | undefined>(undefined);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Listen for date selections from the calendar Reserve button
    function handleSetDates(e: Event) {
      const ce = e as CustomEvent<{ checkIn: string; checkOut: string }>;
      setCheckIn(ce.detail.checkIn);
      setCheckOut(ce.detail.checkOut);
    }
    const el = ref.current;
    if (el) el.addEventListener("set-dates", handleSetDates);

    // Also listen on the document (calendar dispatches with bubbles:true)
    document.addEventListener("set-dates", handleSetDates as EventListener);
    return () => {
      document.removeEventListener("set-dates", handleSetDates as EventListener);
    };
  }, []);

  return (
    <div ref={ref} id="booking-widget">
      <BookingWidget
        listingId={listingId}
        nightlyRate={nightlyRate}
        cleaningFee={cleaningFee}
        checkInDate={checkIn}
        checkOutDate={checkOut}
      />
    </div>
  );
}
