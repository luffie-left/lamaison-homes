/**
 * Pure phone helpers — dial-code composition + E.164 validation.
 * Client-side only; server-side validation remains authoritative for storage.
 *
 * Exported functions are pure (no React, no fetch) so they can be tested
 * with plain node (scripts/test-booking-ux.mjs).
 */

export interface DialCodeOption {
  /** Dial code including leading "+", e.g. "+61" */
  dial: string;
  /** Short country label, e.g. "AU" */
  country: string;
  /** Longer label for the select, e.g. "Australia" */
  label: string;
}

/** Curated dial-code list (no heavy deps — a plain <select> is fine). */
export const DIAL_CODES: DialCodeOption[] = [
  { dial: "+61", country: "AU", label: "Australia" },
  { dial: "+64", country: "NZ", label: "New Zealand" },
  { dial: "+86", country: "CN", label: "China" },
  { dial: "+65", country: "SG", label: "Singapore" },
  { dial: "+44", country: "UK", label: "United Kingdom" },
  { dial: "+1", country: "US", label: "United States" },
];

export const DEFAULT_DIAL_CODE = "+61";

/** Strip everything except digits from a user-typed local number. */
export function localDigits(local: string): string {
  return (local ?? "").replace(/\D/g, "");
}

/**
 * Compose an E.164 number from a dial code and a local number.
 * Returns null when the digit count after the dial code is implausible
 * (fewer than 7 or more than 15 digits, per E.164 subscriber-number rules).
 */
export function composeE164(dial: string, local: string): string | null {
  const d = (dial ?? "").replace(/\D/g, "");
  if (!d) return null;
  const subscriber = localDigits(local);
  // Trunk-prefix "0" is dropped when dialling internationally (e.g. 0412… → 412…)
  const normalized = subscriber.startsWith("0") ? subscriber.slice(1) : subscriber;
  if (normalized.length < 7 || normalized.length > 15) return null;
  return `+${d}${normalized}`;
}

/** Strict check that a full number is plausible E.164 (7–15 digits after country code). */
export function isValidE164(value: string): boolean {
  const m = /^\+(\d{1,3})(\d+)$/.exec((value ?? "").trim());
  if (!m) return false;
  return m[2].length >= 7 && m[2].length <= 15;
}

/** Split a stored E.164 value back into {dial, local} for form display, if possible. */
export function splitE164(
  value: string
): { dial: string; local: string } | null {
  const v = (value ?? "").trim();
  // Prefer a known curated dial code (longest first) so "+658…" resolves as
  // +65 / 8… rather than the unknown prefix +658.
  for (const d of [...DIAL_CODES].sort((a, b) => b.dial.length - a.dial.length)) {
    if (v.startsWith(d.dial)) {
      const local = v.slice(d.dial.length);
      if (/^\d{7,15}$/.test(local)) return { dial: d.dial, local };
    }
  }
  const m = /^\+(\d{1,3})(\d{7,15})$/.exec(v);
  if (!m) return null;
  return { dial: `+${m[1]}`, local: m[2] };
}
