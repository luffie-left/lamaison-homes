/**
 * Hostaway bookability — fail-closed validation layer.
 *
 * Every booking-critical decision (quote, payment, availability) must go
 * through `assertHostawayBookable`. Its data fetchers can be injected for offline tests.
 *
 * FAIL-CLOSED POLICY:
 *  - Unknown `specialStatus` values  → listing ineligible (only documented null passes; absent fails closed).
 *  - Explicit archived/unlisted/inactive/deleted flags → ineligible.
 *  - Hostaway API failure during validation → HOSTAWAY_UNAVAILABLE (503), never "available".
 *  - Missing calendar day for any requested overnight → CALENDAR_INCOMPLETE.
 *  - No cached/stale data is ever trusted; listing + calendar are fetched with
 *    no-store (revalidate=0) on every validation.
 *
 * NOTE: individual OTA "unpublished" flags (e.g. channel-level
 * listingUnpublishedOnAirbnb) do NOT affect *direct* booking eligibility and
 * are intentionally ignored here.
 */

import type { HostawayListing, HostawayCalendarEntry } from "./hostaway";
import { hostawayGet, type HostawayListingResponse, type HostawayCalendarResponse } from "./hostaway";

// ─── Errors ──────────────────────────────────────────────────────────────────

export type BookabilityErrorCode =
  | "INVALID_REQUEST"
  | "LISTING_NOT_FOUND"
  | "LISTING_INELIGIBLE"
  | "CAPACITY_EXCEEDED"
  | "MIN_STAY_NOT_MET"
  | "DATES_UNAVAILABLE"
  | "CALENDAR_INCOMPLETE"
  | "HOSTAWAY_UNAVAILABLE";

export class BookabilityError extends Error {
  readonly status: number;
  readonly code: BookabilityErrorCode;

  constructor(code: BookabilityErrorCode, status: number, message: string) {
    super(message);
    this.name = "BookabilityError";
    this.code = code;
    this.status = status;
  }
}

// ─── Listing eligibility (pure) ──────────────────────────────────────────────

/** specialStatus values that permit direct booking. Anything else fails closed. */
// Hostaway documents null (normal) or "archived". Missing and unknown values
// cannot establish current eligibility and must fail closed.


/** Explicit deny list on the legacy `status` field. */
const INELIGIBLE_STATUSES = new Set([
  "archived",
  "unlisted",
  "inactive",
  "deleted",
  "paused",
  "snoozed",
]);

/**
 * Pure eligibility check for direct booking on the current Hostaway listing.
 * Fails closed: anything not explicitly known-good is ineligible.
 */
export function isHostawayListingEligible(listing: HostawayListing | null | undefined): boolean {
  if (!listing || typeof listing !== "object") return false;

  // 1. Legacy status field — explicit deny list, plus unknown non-active values fail closed.
  const status = (listing.status ?? "").toString().trim().toLowerCase();
  if (INELIGIBLE_STATUSES.has(status)) return false;
  if (status !== "" && status !== "active" && status !== "1") return false;

  // 2. Explicit boolean/numeric exclusion flags when present (fail closed only on true/1).
  if (listing.archived === true || listing.archived === 1) return false;
  if (listing.unlisted === true || listing.unlisted === 1) return false;
  if (listing.deleted === true || listing.deleted === 1) return false;
  if (listing.isBookable === false || listing.isBookable === 0) return false;

  // 3. specialStatus — allowlist. Unknown values (e.g. "archived") fail closed.
  //    Observed live values: 387779 → "archived" (ineligible), 303598 → null (eligible).
  //    NOTE: channel-level "unpublished" flags are NOT checked here — an OTA
  //    unpublished listing can still be directly bookable on our own site.
  const special = (listing as { specialStatus?: string | null }).specialStatus;
  if (special !== null) {
    return false;
  }

  return true;
}

// ─── Date helpers (pure) ─────────────────────────────────────────────────────

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function parseIsoDate(value: string): Date | null {
  if (typeof value !== "string" || !ISO_DATE.test(value)) return null;
  const d = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  // Reject rollover dates like 2026-02-31
  if (d.toISOString().slice(0, 10) !== value) return null;
  return d;
}

export function enumerateOvernights(checkIn: string, checkOut: string): string[] | null {
  const start = parseIsoDate(checkIn);
  const end = parseIsoDate(checkOut);
  if (!start || !end) return null;
  const nights: string[] = [];
  const cursor = new Date(start);
  while (cursor < end) {
    nights.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    if (nights.length > 365) return null; // sanity cap
  }
  return nights.length > 0 ? nights : null;
}

// ─── Calendar validation (pure) ──────────────────────────────────────────────

export interface CalendarValidation {
  ok: boolean;
  code: BookabilityErrorCode | null;
  message?: string;
  minStayOnArrival: number | null;
}

const BLOCKED_CALENDAR_STATUSES = new Set(["blocked", "reserved", "unavailable"]);

/**
 * Validates that every overnight (check-in .. night before checkout) is present
 * in the calendar and available. Missing days are a hard failure (fail closed).
 * Also returns the minimum stay applicable to the arrival date.
 */
export function validateCalendar(
  overnights: string[],
  entries: HostawayCalendarEntry[] | null | undefined
): CalendarValidation {
  if (!Array.isArray(entries)) {
    return { ok: false, code: "CALENDAR_INCOMPLETE", message: "Calendar data missing", minStayOnArrival: null };
  }

  const byDate = new Map<string, HostawayCalendarEntry>();
  for (const e of entries) {
    if (e && typeof e.date === "string") byDate.set(e.date.slice(0, 10), e);
  }

  const arrival = byDate.get(overnights[0]);
  const minStayOnArrival =
    arrival && typeof arrival.minimumStay === "number" && arrival.minimumStay > 0
      ? arrival.minimumStay
      : null;

  // Gap detection FIRST — scan every requested overnight for a missing entry
  // before considering any blocked status, so a blocked early date can never
  // mask a missing later date (calendar completeness is a 503-class failure,
  // blocked nights are 409-class — never let a 409 hide a 503).
  for (const date of overnights) {
    if (!byDate.has(date)) {
      return {
        ok: false,
        code: "CALENDAR_INCOMPLETE",
        message: `Calendar has no entry for ${date}`,
        minStayOnArrival,
      };
    }
  }

  for (const date of overnights) {
    const entry = byDate.get(date)!;
    if (!entry) {
      return {
        ok: false,
        code: "CALENDAR_INCOMPLETE",
        message: `Calendar has no entry for ${date}`,
        minStayOnArrival,
      };
    }
    const status = (entry.status ?? "").toString().toLowerCase();
    if (entry.isAvailable !== 1 || BLOCKED_CALENDAR_STATUSES.has(status)) {
      return {
        ok: false,
        code: "DATES_UNAVAILABLE",
        message: `${date} is not available`,
        minStayOnArrival,
      };
    }
  }

  return { ok: true, code: null, minStayOnArrival };
}

// ─── Full assertion (fetches fresh, no-store data) ───────────────────────────

export interface BookabilityDeps {
  getListing: (listingId: number) => Promise<HostawayListing>;
  getCalendar: (listingId: number, startDate: string, endDate: string) => Promise<HostawayCalendarEntry[]>;
}

function defaultDeps(): BookabilityDeps {
  return {
    getListing: async (listingId) => {
      const data = await hostawayGet<HostawayListingResponse>(
        `/listings/${listingId}?includeResources=1`,
        0 // no-store — never trust cached listing state for booking decisions
      );
      if (!data?.result) throw new BookabilityError("LISTING_NOT_FOUND", 404, "Listing not found");
      return data.result;
    },
    getCalendar: async (listingId, startDate, endDate) => {
      const data = await hostawayGet<HostawayCalendarResponse>(
        `/listings/${listingId}/calendar?startDate=${startDate}&endDate=${endDate}`,
        0 // no-store
      );
      return data?.result ?? [];
    },
  };
}

/**
 * Fail-closed bookability assertion for payment/quote routes.
 * Throws BookabilityError on any failure; returns the validated listing on success.
 */
export async function assertHostawayBookable(
  listingId: number,
  checkIn: string,
  checkOut: string,
  guests: number,
  deps: BookabilityDeps = defaultDeps()
): Promise<HostawayListing> {
  if (!Number.isInteger(listingId) || listingId <= 0) {
    throw new BookabilityError("INVALID_REQUEST", 400, "Invalid listingId");
  }
  if (!Number.isInteger(guests) || guests < 1) {
    throw new BookabilityError("INVALID_REQUEST", 400, "Guests must be a positive integer");
  }

  const overnights = enumerateOvernights(checkIn, checkOut);
  if (!overnights || !parseIsoDate(checkIn) || !parseIsoDate(checkOut)) {
    throw new BookabilityError("INVALID_REQUEST", 400, "checkIn/checkOut must be valid ISO dates (YYYY-MM-DD) with check-out after check-in");
  }
  const nights = overnights.length;

  let listing: HostawayListing;
  let calendar: HostawayCalendarEntry[];
  try {
    [listing, calendar] = await Promise.all([
      deps.getListing(listingId),
      deps.getCalendar(listingId, checkIn, checkOut),
    ]);
  } catch (err) {
    if (err instanceof BookabilityError) throw err;
    const msg = err instanceof Error ? err.message : String(err);
    // Hostaway currently returns 403 to direct API calls from this host — do
    // NOT retry; classify as unavailable and fail closed immediately.
    throw new BookabilityError("HOSTAWAY_UNAVAILABLE", 503, `Hostaway lookup failed: ${msg}`);
  }

  if (!isHostawayListingEligible(listing)) {
    throw new BookabilityError("LISTING_INELIGIBLE", 409, "Listing is not eligible for direct booking");
  }

  if (guests > (listing.personCapacity ?? 0)) {
    throw new BookabilityError(
      "CAPACITY_EXCEEDED",
      400,
      `This property sleeps ${listing.personCapacity} guests`
    );
  }

  const validation = validateCalendar(overnights, calendar);
  if (!validation.ok) {
    const status = validation.code === "CALENDAR_INCOMPLETE" ? 503 : 409;
    throw new BookabilityError(
      validation.code ?? "DATES_UNAVAILABLE",
      status,
      validation.message ?? "Dates not available"
    );
  }

  // Minimum stay — per-arrival-date value from calendar wins, else listing default.
  const minStay = validation.minStayOnArrival ?? listing.minimumStay ?? 1;
  if (nights < minStay) {
    throw new BookabilityError(
      "MIN_STAY_NOT_MET",
      400,
      `Minimum stay is ${minStay} night${minStay !== 1 ? "s" : ""} for these dates`
    );
  }

  return listing;
}
