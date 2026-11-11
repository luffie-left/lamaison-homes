/**
 * T016 — Hostaway listing → Supabase `properties` sync (drafts only).
 *
 * Rules (per Mick's 2026-11-08 13:42 GO):
 *  - Eligible Hostaway listings not in Supabase → INSERT as draft
 *    (is_published=false, is_active=true). NEVER auto-publish.
 *  - Existing DRAFT rows → update content fields in place (idempotent).
 *  - Existing PUBLISHED rows → NEVER overwritten; differences are flagged
 *    for human review via the returned report (is_published untouched).
 *  - Hostaway ineligible listings (archived etc., per the validated
 *    fail-closed rules) are never imported; if one exists as a local draft
 *    it is flagged (and is_active set false) — fail closed.
 *  - Idempotent: rows keyed by hostaway_listing_id; re-runs update, never
 *    duplicate.
 */

import { isHostawayListingEligible } from "./hostaway-bookability";
import type { HostawayListing } from "./hostaway";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SupabasePropertyRow {
  id: string;
  hostaway_listing_id: number;
  slug: string;
  name: string;
  address: string | null;
  suburb: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  max_guests: number | null;
  description: string | null;
  house_rules: string | null;
  check_in_time: string | null;
  check_out_time: string | null;
  base_price_per_night: number | null;
  cleaning_fee: number | null;
  currency: string | null;
  amenities: string[] | null;
  photos: string[] | null;
  is_active: boolean;
  is_published: boolean;
  sync_status: string | null;
  last_synced_at: string | null;
  tier: string | null;
  raw_hostaway_data: unknown;
}

export interface SyncReport {
  ranAt: string;
  imported: number;
  importedIds: number[];
  draftsUpdated: number;
  publishedFlagged: number;
  flagged: Array<{
    listingId: number;
    reason: string;
    published: boolean;
  }>;
  deactivatedDrafts: number;
  skippedIneligible: number[];
  heroCollisions: Array<{ listingId: number; collidesWith: number }>;
  errors: string[];
}

/** Field-level diff between a Hostaway listing and a local property row. */
export interface FieldDiff {
  listingId: number;
  field: string;
  local: unknown;
  remote: unknown;
}

// ─── Pure mapping (testable without network) ────────────────────────────────

/** "15" → "15:00"; already "15:00" → unchanged; null → null */
export function normalizeTime(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim();
  if (!s) return null;
  if (/^\d{1,2}:\d{2}$/.test(s)) return s.padStart(5, "0");
  if (/^\d{1,2}$/.test(s)) return `${s.padStart(2, "0")}:00`;
  return s;
}

/** Description preference: publicDescription → description → airbnbSummary → "" */
export function pickDescription(l: HostawayListing): string {
  const pub = (l as { publicDescription?: string }).publicDescription ?? "";
  if (pub.trim()) return pub;
  const plain = (l as { description?: string }).description ?? "";
  if (plain.trim()) return plain;
  return (l as { airbnbSummary?: string }).airbnbSummary ?? "";
}

/** Amenity names for amenities present (isPresent=1). */
export function mapAmenities(
  listingAmenities: Array<{ amenityName?: string; isPresent?: number }> | undefined
): string[] {
  return (listingAmenities ?? [])
    .filter((a) => a && a.isPresent === 1 && typeof a.amenityName === "string")
    .map((a) => a.amenityName as string)
    .filter(Boolean);
}

/** Suburb from publicAddress/city — same heuristic the site already uses.
 *
 * T016 fix (2026-11-11): Hostaway publicAddress now appends trailing
 * country + postcode segments (e.g. "…, Box Hill, Victoria, Australia, 3128").
 * Taking the raw last segment returned "3128" instead of "Box Hill", so we
 * skip trailing pure-numeric (postcodes) and country-name segments before
 * selecting the last remaining segment. */
const TRAILING_NON_SUBURB = new Set([
  "australia",
  "au",
  "victoria",
  "vic",
  "australia (au)",
  "澳大利亚",
]);

export function pickSuburb(l: HostawayListing): string | null {
  const raw = l.publicAddress || l.address || "";
  if (!raw) return l.city ?? null;
  const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
  // Prefer the 2nd segment ("25 Osullivan Road, Glen Waverley") else city.
  // Strip trailing postcode / country / state segments first.
  const isNonSuburb = (s: string) =>
    /^\d{3,5}$/.test(s) || TRAILING_NON_SUBURB.has(s.toLowerCase());
  while (parts.length > 2 && isNonSuburb(parts[parts.length - 1])) {
    parts.pop();
  }
  if (parts.length >= 2) {
    return parts[parts.length - 1];
  }
  return l.city ?? null;
}

/** Map a Hostaway listing to a Supabase properties INSERT payload. */
export function mapListingToDraft(l: HostawayListing): Record<string, unknown> {
  const images = (l.listingImages ?? [])
    .slice()
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((i) => i.url)
    .filter(Boolean);

  return {
    hostaway_listing_id: l.id,
    slug: String(l.id),
    name: l.name,
    address: l.address ?? l.publicAddress ?? null,
    suburb: pickSuburb(l),
    city: l.city ?? null,
    state: l.state ?? null,
    country: l.country ?? "Australia",
    bedrooms: l.bedroomsNumber ?? null,
    bathrooms: l.bathroomsNumber ?? null,
    max_guests: l.personCapacity ?? null,
    description: pickDescription(l),
    house_rules: l.houseRules ?? null,
    check_in_time: normalizeTime(l.checkInTime ?? (l as { checkInTimeStart?: unknown }).checkInTimeStart),
    check_out_time: normalizeTime((l as { checkOutTime?: unknown }).checkOutTime),
    base_price_per_night: typeof l.price === "number" ? l.price : null,
    cleaning_fee: typeof l.cleaningFee === "number" ? l.cleaningFee : null,
    currency: (l as { currencyCode?: string }).currencyCode ?? "AUD",
    amenities: mapAmenities((l as { listingAmenities?: never[] }).listingAmenities),
    photos: images,
    is_active: true,
    is_published: false, // NEVER auto-publish
    sync_status: "synced",
    last_synced_at: new Date().toISOString(),
    tier: "standard",
    raw_hostaway_data: l,
  };
}

/** Compare content fields for a published row; returns diffs (never patches). */
export function diffAgainstRow(
  l: HostawayListing,
  row: SupabasePropertyRow
): FieldDiff[] {
  const draft = mapListingToDraft(l) as Record<string, unknown>;
  const fields = [
    "name", "address", "suburb", "city", "state", "country",
    "bedrooms", "bathrooms", "max_guests", "description", "house_rules",
    "check_in_time", "check_out_time", "base_price_per_night", "cleaning_fee",
  ] as const;
  const diffs: FieldDiff[] = [];
  for (const f of fields) {
    const local = row[f as keyof SupabasePropertyRow];
    const remote = draft[f];
    // Treat null/undefined/"" as equivalent; numbers compared loosely.
    const norm = (v: unknown) =>
      v === null || v === undefined ? "" : typeof v === "number" ? v : String(v).trim();
    if (norm(local) !== norm(remote)) {
      diffs.push({ listingId: l.id, field: f, local, remote });
    }
  }
  return diffs;
}

// ─── Sync runner (network) ───────────────────────────────────────────────────

export interface SyncDeps {
  /** Fully paginated eligible Hostaway listings (all fields). */
  fetchListings: () => Promise<HostawayListing[] | null>;
  /** All Supabase property rows. */
  fetchRows: () => Promise<SupabasePropertyRow[] | null>;
  /** Insert a draft row; returns success. */
  insertDraft: (payload: Record<string, unknown>) => Promise<boolean>;
  /** Update a draft row's content fields; returns success. */
  updateDraft: (listingId: number, payload: Record<string, unknown>) => Promise<boolean>;
  /** Deactivate a local draft whose Hostaway listing became ineligible. */
  deactivateDraft: (listingId: number) => Promise<boolean>;
}

export async function runListingSync(deps: SyncDeps): Promise<SyncReport> {
  const report: SyncReport = {
    ranAt: new Date().toISOString(),
    imported: 0,
    importedIds: [],
    draftsUpdated: 0,
    publishedFlagged: 0,
    flagged: [],
    deactivatedDrafts: 0,
    skippedIneligible: [],
    heroCollisions: [],
    errors: [],
  };

  const [listings, rows] = await Promise.all([deps.fetchListings(), deps.fetchRows()]);
  if (!listings) { report.errors.push("Hostaway listing fetch failed"); return report; }
  if (!rows) { report.errors.push("Supabase properties fetch failed"); return report; }

  const byId = new Map(rows.map((r) => [r.hostaway_listing_id, r]));
  const eligible = listings.filter((l) => isHostawayListingEligible(l));
  const eligibleIds = new Set(eligible.map((l) => l.id));

  // Hero-uniqueness invariant: a listing's first (sortOrder) photo must not
  // equal another listing's hero. Cross-listing collisions are flagged for
  // review — never silently imported/published.
  const heroByUrl = new Map<string, number>(); // url → first listingId
  for (const l of eligible) {
    const sorted = (l.listingImages ?? [])
      .slice()
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    const hero = sorted[0]?.url;
    if (!hero) continue;
    const prev = heroByUrl.get(hero);
    if (prev !== undefined) {
      report.heroCollisions.push({ listingId: l.id, collidesWith: prev });
    } else {
      heroByUrl.set(hero, l.id);
    }
  }

  for (const l of eligible) {
    const row = byId.get(l.id);
    if (!row) {
      // New eligible listing → import as draft
      const ok = await deps.insertDraft(mapListingToDraft(l));
      if (ok) { report.imported++; report.importedIds.push(l.id); }
      else report.errors.push(`insert failed for ${l.id}`);
      continue;
    }
    if (row.is_published) {
      // NEVER touch published rows — flag differences for review only.
      const diffs = diffAgainstRow(l, row);
      if (diffs.length > 0) {
        report.publishedFlagged++;
        report.flagged.push({
          listingId: l.id,
          reason: `${diffs.length} field(s) differ: ${diffs.map((d) => d.field).join(", ")}`,
          published: true,
        });
      }
      continue;
    }
    // Existing draft → refresh content in place (idempotent)
    const payload = mapListingToDraft(l);
    const ok = await deps.updateDraft(l.id, payload);
    if (ok) report.draftsUpdated++;
    else report.errors.push(`draft update failed for ${l.id}`);
  }

  // Local drafts whose Hostaway listing is gone/ineligible → deactivate + flag
  for (const row of rows) {
    if (row.is_published) continue; // published rows are human-controlled
    if (!eligibleIds.has(row.hostaway_listing_id)) {
      const ok = await deps.deactivateDraft(row.hostaway_listing_id);
      if (ok) report.deactivatedDrafts++;
      report.flagged.push({
        listingId: row.hostaway_listing_id,
        reason: "Hostaway listing missing or ineligible (fail closed)",
        published: false,
      });
    }
  }

  return report;
}
