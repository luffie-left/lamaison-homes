"use client";

import dynamic from "next/dynamic";

const AvailabilityCalendarInner = dynamic(
  () =>
    import("./availability-calendar").then((m) => m.AvailabilityCalendar),
  {
    ssr: false,
    loading: () => (
      <div className="py-8 text-sm text-stone-400">Loading calendar…</div>
    ),
  }
);

export function CalendarWrapper(props: {
  slug: string;
  onDatesChange?: (checkIn: string | null, checkOut: string | null) => void;
}) {
  return <AvailabilityCalendarInner {...props} />;
}
