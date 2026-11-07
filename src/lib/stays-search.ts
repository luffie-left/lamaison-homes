/**
 * T013 — pure stays-search logic: availability windows, suburb prediction,
 * multi-suburb filtering, and closest-first proximity ranking.
 * Pure functions only — no network, no React; unit-tested in
 * scripts/test-stays-search.mjs.
 */

// ─── Suburb gazetteer (Melbourne) ────────────────────────────────────────────
// Coordinates = suburb centres, used both for autocomplete predictions and as
// proximity anchors for closest-first ranking.
export interface SuburbEntry {
  name: string;
  lat: number;
  lng: number;
  /** Alternate spellings / common aliases for matching. */
  aliases?: string[];
}

export const MELBOURNE_SUBURBS: SuburbEntry[] = [
  { name: "Melbourne CBD", lat: -37.8136, lng: 144.9631, aliases: ["melbourne", "cbd", "city"] },
  { name: "West Melbourne", lat: -37.8065, lng: 144.9443 },
  { name: "North Melbourne", lat: -37.7986, lng: 144.9463 },
  { name: "Docklands", lat: -37.8148, lng: 144.945 },
  { name: "East Melbourne", lat: -37.8167, lng: 144.9837 },
  { name: "Southbank", lat: -37.8224, lng: 144.9631 },
  { name: "South Wharf", lat: -37.8275, lng: 144.9423 },
  { name: "Port Melbourne", lat: -37.8391, lng: 144.9412 },
  { name: "Albert Park", lat: -37.8455, lng: 144.9553 },
  { name: "South Melbourne", lat: -37.8323, lng: 144.9703 },
  { name: "St Kilda", lat: -37.8679, lng: 144.9826 },
  { name: "St Kilda East", lat: -37.8679, lng: 144.9918 },
  { name: "Elwood", lat: -37.8875, lng: 144.9872 },
  { name: "Prahran", lat: -37.8511, lng: 144.9936 },
  { name: "Windsor", lat: -37.8536, lng: 144.9916 },
  { name: "South Yarra", lat: -37.839, lng: 144.9918 },
  { name: "Toorak", lat: -37.8405, lng: 145.0136 },
  { name: "Richmond", lat: -37.8235, lng: 145.0012 },
  { name: "Cremorne", lat: -37.8296, lng: 145.0024 },
  { name: "Burnley", lat: -37.8267, lng: 145.0131 },
  { name: "Hawthorn", lat: -37.8191, lng: 145.0349 },
  { name: "Kew", lat: -37.8405, lng: 145.0221 },
  { name: "Collingwood", lat: -37.7946, lng: 144.9857 },
  { name: "Fitzroy", lat: -37.799, lng: 144.976 },
  { name: "Carlton", lat: -37.7986, lng: 144.968 },
  { name: "Brunswick", lat: -37.7664, lng: 144.9616 },
  { name: "Northcote", lat: -37.7679, lng: 144.9953 },
  { name: "Thornbury", lat: -37.7461, lng: 145.0093 },
  { name: "Preston", lat: -37.7413, lng: 145.0093 },
  { name: "Reservoir", lat: -37.7149, lng: 145.0072 },
  { name: "Coburg", lat: -37.7444, lng: 144.9664 },
  { name: "Pascoe Vale", lat: -37.7444, lng: 144.9331 },
  { name: "Essendon", lat: -37.7495, lng: 144.9086 },
  { name: "Moonee Ponds", lat: -37.7653, lng: 144.9226 },
  { name: "Ascot Vale", lat: -37.7714, lng: 144.9226 },
  { name: "Footscray", lat: -37.7996, lng: 144.9007 },
  { name: "Yarraville", lat: -37.7986, lng: 144.8893 },
  { name: "Williamstown", lat: -37.8596, lng: 144.8857 },
  { name: "Altona", lat: -37.8679, lng: 144.8307 },
  { name: "Sunshine", lat: -37.7853, lng: 144.8312 },
  { name: "Melbourne Airport", lat: -37.669, lng: 144.841, aliases: ["tullamarine", "airport"] },
  { name: "Box Hill", lat: -37.8174, lng: 145.1175 },
  { name: "Doncaster", lat: -37.7893, lng: 145.1253 },
  { name: "Balwyn", lat: -37.8072, lng: 145.0609 },
  { name: "Camberwell", lat: -37.8291, lng: 145.0575 },
  { name: "Surrey Hills", lat: -37.8224, lng: 145.0907 },
  { name: "Glen Iris", lat: -37.8566, lng: 145.0505 },
  { name: "Malvern", lat: -37.8566, lng: 145.0286 },
  { name: "Caulfield", lat: -37.8776, lng: 145.0265 },
  { name: "Bentleigh", lat: -37.9173, lng: 145.0391 },
  { name: "Brighton", lat: -37.9165, lng: 144.9872 },
  { name: "Sandringham", lat: -37.9505, lng: 144.9928 },
  { name: "Elsternwick", lat: -37.8873, lng: 144.9969 },
  { name: "Balaclava", lat: -37.8679, lng: 144.9768 },
  { name: "Kensington", lat: -37.7948, lng: 144.9261 },
  { name: "Flemington", lat: -37.7853, lng: 144.9393 },
  { name: "Travancore", lat: -37.7664, lng: 144.9331 },
  { name: "Brunswick East", lat: -37.7664, lng: 144.976 },
  { name: "Brunswick West", lat: -37.7664, lng: 144.9478 },
  { name: "Carlton North", lat: -37.7908, lng: 144.968 },
  { name: "Fitzroy North", lat: -37.7853, lng: 144.976 },
  { name: "Clifton Hill", lat: -37.7893, lng: 144.9953 },
  { name: "Fairfield", lat: -37.7714, lng: 145.0176 },
  { name: "Ivanhoe", lat: -37.7986, lng: 145.0575 },
  { name: "Heidelberg", lat: -37.7572, lng: 145.0687 },
  { name: "Watsonia", lat: -37.7106, lng: 145.0818 },
  { name: "Greensborough", lat: -37.7013, lng: 145.1032 },
  { name: "Lilydale", lat: -37.7586, lng: 145.3446 },
  { name: "Ringwood", lat: -37.8136, lng: 145.2263 },
  { name: "Wantirna", lat: -37.8679, lng: 145.2107 },
  { name: "Nunawading", lat: -37.8224, lng: 145.1707 },
  { name: "Blackburn", lat: -37.8153, lng: 145.1387 },
  { name: "Vermont", lat: -37.8371, lng: 145.1695 },
  { name: "Forest Hill", lat: -37.8296, lng: 145.1707 },
  { name: "Mount Waverley", lat: -37.8756, lng: 145.1359 },
  { name: "Glen Waverley", lat: -37.8785, lng: 145.1636 },
  { name: "Clayton", lat: -37.9157, lng: 145.1291 },
  { name: "Cheltenham", lat: -37.9505, lng: 145.0431 },
  { name: "Moorabbin", lat: -37.9344, lng: 145.0329 },
  { name: "Dingley Village", lat: -37.9872, lng: 145.0954 },
  { name: "Keysborough", lat: -37.9872, lng: 145.1504 },
  { name: "Endeavour Hills", lat: -37.9753, lng: 145.2345 },
  { name: "Dandenong", lat: -37.9872, lng: 145.2137 },
  { name: "Frankston", lat: -38.1412, lng: 145.1226 },
  { name: "Mornington", lat: -38.3696, lng: 145.0386 },
  { name: "Werribee", lat: -37.9, lng: 144.5807 },
  { name: "Point Cook", lat: -37.9141, lng: 144.7773 },
  { name: "Hoppers Crossing", lat: -37.8955, lng: 144.6967 },
  { name: "Tarneit", lat: -37.8725, lng: 144.6693 },
  { name: "Truganina", lat: -37.8455, lng: 144.7445 },
  { name: "Deer Park", lat: -37.7714, lng: 144.7687 },
  { name: "St Albans", lat: -37.7339, lng: 144.8007 },
  { name: "Keilor", lat: -37.7179, lng: 144.8307 },
  { name: "Craigieburn", lat: -37.5986, lng: 144.9393 },
  { name: "Roxburgh Park", lat: -37.6477, lng: 144.9112 },
  { name: "Mill Park", lat: -37.6566, lng: 145.0575 },
  { name: "Epping", lat: -37.6477, lng: 145.0053 },
  { name: "Bundoora", lat: -37.6826, lng: 145.0687 },
  { name: "Thomastown", lat: -37.6826, lng: 144.9953 },
  { name: "Lalor", lat: -37.6711, lng: 145.0176 },
  { name: "Bayswater", lat: -37.8296, lng: 145.2623 },
  { name: "Boronia", lat: -37.8566, lng: 145.282 },
  { name: "Ferntree Gully", lat: -37.8776, lng: 145.2942 },
];

// ─── Autocomplete / prediction ───────────────────────────────────────────────

function suburbKey(name: string): string {
  return name.toLowerCase().replace(/melbourne\s+/g, "").trim();
}

export function predictSuburbs(
  query: string,
  limit = 6
): SuburbEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const scored: Array<{ entry: SuburbEntry; score: number }> = [];
  for (const entry of MELBOURNE_SUBURBS) {
    const name = suburbKey(entry.name);
    const aliases = (entry.aliases ?? []).map((a) => a.toLowerCase());
    let score = -1;
    if (name.startsWith(q)) score = 0;
    else if (aliases.some((a) => a.startsWith(q))) score = 1;
    else if (name.includes(q)) score = 2;
    else if (aliases.some((a) => a.includes(q))) score = 3;
    if (score >= 0) scored.push({ entry, score });
  }
  // Prefix matches first, then substring; alphabetical within tier for stability.
  return scored
    .sort((a, b) => a.score - b.score || a.entry.name.localeCompare(b.entry.name))
    .slice(0, limit)
    .map((s) => s.entry);
}

/** Resolve a user-typed string to a suburb entry (exact/alias/prefix match). */
export function resolveSuburb(input: string): SuburbEntry | null {
  const q = input.trim().toLowerCase();
  if (!q) return null;
  for (const entry of MELBOURNE_SUBURBS) {
    if (suburbKey(entry.name) === q || (entry.aliases ?? []).some((a) => a === q)) return entry;
  }
  // Fall back to unique prefix match
  const prefixMatches = MELBOURNE_SUBURBS.filter((e) => suburbKey(e.name).startsWith(q));
  return prefixMatches.length === 1 ? prefixMatches[0] : null;
}

// ─── Distance / ranking ──────────────────────────────────────────────────────

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function findSuburbEntry(name: string): SuburbEntry | null {
  const q = name.trim().toLowerCase();
  return (
    MELBOURNE_SUBURBS.find(
      (e) => suburbKey(e.name) === q || (e.aliases ?? []).some((a) => a === q)
    ) ?? null
  );
}

/**
 * Closest-first ranking. Anchor = first selected suburb centre (or CBD when
 * only a date filter is active). Ties broken by slug for a stable order.
 */
export function rankByProximity<T extends { lat?: number; lng?: number; slug: string }>(
  items: T[],
  anchor: { lat: number; lng: number }
): T[] {
  return [...items]
    .map((item) => {
      let dist = Number.POSITIVE_INFINITY;
      if (typeof item.lat === "number" && typeof item.lng === "number") {
        dist = haversineKm(anchor.lat, anchor.lng, item.lat, item.lng);
      }
      return { item, dist };
    })
    .sort((a, b) => a.dist - b.dist || a.item.slug.localeCompare(b.item.slug))
    .map((x) => x.item);
}

// ─── Date / availability windows ─────────────────────────────────────────────

/** Local-date (not UTC) YYYY-MM-DD formatting — avoids TZ off-by-one bugs. */
export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isValidDateStr(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(new Date(s + "T00:00:00").getTime());
}

/** Nights of a stay (check-in inclusive, check-out exclusive). */
export function enumerateNights(checkIn: string, checkOut: string): string[] {
  const nights: string[] = [];
  const start = new Date(checkIn + "T00:00:00");
  const end = new Date(checkOut + "T00:00:00");
  for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
    nights.push(toDateStr(d));
  }
  return nights;
}

export interface AvailabilityCalendarEntry {
  date: string;
  available: boolean;
}

/**
 * A listing is available for the range when EVERY night in
 * [checkIn, checkOut) is available. Fail closed: unknown dates block.
 */
export function isAvailableForRange(
  calendar: AvailabilityCalendarEntry[],
  checkIn: string,
  checkOut: string
): boolean {
  const map = new Map(calendar.map((c) => [c.date, c.available]));
  for (const night of enumerateNights(checkIn, checkOut)) {
    const available = map.get(night);
    if (available !== true) return false; // missing entry = blocked (fail closed)
  }
  return true;
}
