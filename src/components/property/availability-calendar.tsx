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
  parseISO,
  isWithinInterval,
  startOfDay,
} from "date-fns";

interface AvailabilityCalendarProps {
  slug: string;
  onDatesChange?: (checkIn: string | null, checkOut: string | null) => void;
}

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
  const startDow = getDay(start); // 0=Sun

  const rangeEnd = selectedStart && !selectedEnd && hovered ? hovered : selectedEnd;

  return (
    <div>
      <p className="mb-3 text-center text-sm font-medium text-stone-900">
        {format(monthDate, "MMMM yyyy")}
      </p>
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
          <div key={d} className="pb-2 text-xs font-medium text-stone-400">
            {d}
          </div>
        ))}
        {/* Spacers */}
        {Array.from({ length: startDow }).map((_, i) => (
          <div key={`sp-${i}`} />
        ))}
        {days.map((day) => {
          const iso = format(day, "yyyy-MM-dd");
          const isBlocked = blockedDates.has(iso);
          const isPast = isBefore(day, today);
          const isDisabled = isBlocked || isPast;

          const isStart = selectedStart && isSameDay(day, selectedStart);
          const isEnd = rangeEnd && isSameDay(day, rangeEnd);
          const isInRange =
            selectedStart &&
            rangeEnd &&
            isWithinInterval(day, {
              start: isAfter(selectedStart, rangeEnd) ? rangeEnd : selectedStart,
              end: isAfter(selectedStart, rangeEnd) ? selectedStart : rangeEnd,
            });

          let cellClass =
            "relative flex items-center justify-center w-8 h-8 mx-auto rounded-full text-sm transition-colors ";

          if (isDisabled) {
            cellClass += "text-stone-300 cursor-not-allowed ";
            if (isBlocked) cellClass += "line-through ";
          } else if (isStart || isEnd) {
            cellClass += "bg-stone-950 text-white font-medium cursor-pointer ";
          } else if (isInRange) {
            cellClass += "bg-stone-200 text-stone-800 cursor-pointer rounded-none ";
          } else {
            cellClass += "text-stone-700 hover:bg-stone-100 cursor-pointer ";
          }

          return (
            <div
              key={iso}
              className={cellClass}
              onClick={() => !isDisabled && onDayClick(day)}
              onMouseEnter={() => !isDisabled && onDayHover(day)}
              onMouseLeave={() => onDayHover(null)}
            >
              {format(day, "d")}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AvailabilityCalendar({
  slug,
  onDatesChange,
}: AvailabilityCalendarProps) {
  const [blockedDates, setBlockedDates] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selectedStart, setSelectedStart] = useState<Date | null>(null);
  const [selectedEnd, setSelectedEnd] = useState<Date | null>(null);
  const [hovered, setHovered] = useState<Date | null>(null);

  const month0 = startOfMonth(new Date());
  const month1 = addMonths(month0, 1);

  const fetchAvailability = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/stays/${slug}/availability`);
      if (!res.ok) return;
      const data = await res.json();
      setBlockedDates(new Set(data.blockedDates ?? []));
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  function handleDayClick(day: Date) {
    if (!selectedStart || (selectedStart && selectedEnd)) {
      setSelectedStart(day);
      setSelectedEnd(null);
      onDatesChange?.(format(day, "yyyy-MM-dd"), null);
    } else {
      // second click — set end
      if (isBefore(day, selectedStart)) {
        setSelectedEnd(selectedStart);
        setSelectedStart(day);
        onDatesChange?.(format(day, "yyyy-MM-dd"), format(selectedStart, "yyyy-MM-dd"));
      } else {
        setSelectedEnd(day);
        onDatesChange?.(format(selectedStart, "yyyy-MM-dd"), format(day, "yyyy-MM-dd"));
      }
    }
  }

  function handleClear() {
    setSelectedStart(null);
    setSelectedEnd(null);
    setHovered(null);
    onDatesChange?.(null, null);
  }

  const selectedStartIso = selectedStart ? format(selectedStart, "yyyy-MM-dd") : null;
  const selectedEndIso = selectedEnd ? format(selectedEnd, "yyyy-MM-dd") : null;

  return (
    <div>
      {loading && (
        <p className="mb-3 text-sm text-stone-400">Loading availability…</p>
      )}

      <div className="grid gap-8 sm:grid-cols-2">
        <CalendarMonth
          monthDate={month0}
          blockedDates={blockedDates}
          selectedStart={selectedStart}
          selectedEnd={selectedEnd}
          hovered={hovered}
          onDayClick={handleDayClick}
          onDayHover={setHovered}
        />
        <CalendarMonth
          monthDate={month1}
          blockedDates={blockedDates}
          selectedStart={selectedStart}
          selectedEnd={selectedEnd}
          hovered={hovered}
          onDayClick={handleDayClick}
          onDayHover={setHovered}
        />
      </div>

      {(selectedStartIso || selectedEndIso) && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-stone-600">
            {selectedStartIso ?? "—"} → {selectedEndIso ?? "select check-out"}
          </span>
          <button
            onClick={handleClear}
            className="text-stone-500 underline underline-offset-2 hover:text-stone-800"
          >
            Clear dates
          </button>
        </div>
      )}
    </div>
  );
}

// Suppress unused import warning — parseISO used in type-safe date handling
void parseISO;
