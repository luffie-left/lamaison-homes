/**
 * T016 listing-sync unit tests (pure functions + runListingSync with fake deps).
 * Run: node scripts/test-listing-sync.mjs
 * Uses tsx-less approach: imports the TS module via the repo's compiled logic?
 * — Simpler: these tests re-implement nothing; they import from a JS
 * transcription kept in sync? NO. Instead run with node --experimental-strip-types.
 */
import { strict as assert } from "node:assert";
import {
  normalizeTime, pickDescription, mapAmenities, pickSuburb,
  mapListingToDraft, diffAgainstRow, runListingSync,
} from "../src/lib/listing-sync.ts";

let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; console.log("  ✓", name); } catch (e) { fail++; console.log("  ✗", name, "-", e.message); } };

const fakeListing = {
  id: 572300, name: "Luxury 2BR", city: "Glen Waverley", address: "25 Osullivan Road",
  publicAddress: "25 Osullivan Road, Glen Waverley", state: "VIC", country: "Australia",
  bedroomsNumber: 2, bathroomsNumber: 2, personCapacity: 4, price: 176, cleaningFee: 135,
  publicDescription: "", houseRules: "No smoking", checkInTime: 15, checkOutTime: 10,
  listingImages: [{ url: "b", sortOrder: 2 }, { url: "a", sortOrder: 1 }],
  amenities: [], listingAmenities: [{ amenityName: "Wifi", isPresent: 1 }, { amenityName: "Pool", isPresent: 0 }],
  status: "", specialStatus: null, description: "Fallback desc", currencyCode: "AUD",
};

console.log("normalizeTime");
t("15 → 15:00", () => assert.equal(normalizeTime(15), "15:00"));
t("null → null", () => assert.equal(normalizeTime(null), null));
t('"15:00" unchanged', () => assert.equal(normalizeTime("15:00"), "15:00"));

console.log("pickDescription");
t("falls back to description when publicDescription empty", () =>
  assert.equal(pickDescription(fakeListing), "Fallback desc"));
t("prefers publicDescription", () =>
  assert.equal(pickDescription({ ...fakeListing, publicDescription: "Pub" }), "Pub"));

console.log("mapAmenities");
t("filters isPresent=0", () => assert.deepEqual(mapAmenities(fakeListing.listingAmenities), ["Wifi"]));

console.log("pickSuburb");
t("uses last comma segment", () => assert.equal(pickSuburb(fakeListing), "Glen Waverley"));

console.log("mapListingToDraft");
t("images sorted by sortOrder", () => {
  const d = mapListingToDraft(fakeListing);
  assert.deepEqual(d.photos, ["a", "b"]);
});
t("draft is never published", () => {
  const d = mapListingToDraft(fakeListing);
  assert.equal(d.is_published, false);
  assert.equal(d.is_active, true);
});
t("price/cleaning carried", () => {
  const d = mapListingToDraft(fakeListing);
  assert.equal(d.base_price_per_night, 176);
  assert.equal(d.cleaning_fee, 135);
});

console.log("diffAgainstRow");
const localRow = {
  id: "x", hostaway_listing_id: 572300, slug: "572300", name: "Luxury 2BR",
  address: null, suburb: null, city: null, state: null, country: null,
  bedrooms: 2, bathrooms: 2, max_guests: 4, description: "OLD", house_rules: null,
  check_in_time: null, check_out_time: null, base_price_per_night: 100,
  cleaning_fee: 135, currency: "AUD", amenities: null, photos: null,
  is_active: true, is_published: true, sync_status: "synced", last_synced_at: null,
  tier: "standard", raw_hostaway_data: null,
};
t("detects description + price drift", () => {
  const diffs = diffAgainstRow(fakeListing, localRow);
  const fields = diffs.map(d => d.field);
  assert.ok(fields.includes("description"));
  assert.ok(fields.includes("base_price_per_night"));
});
t("no diff when identical", () => {
  const diffs = diffAgainstRow(fakeListing, { ...localRow, description: "Fallback desc", base_price_per_night: 176, address: "25 Osullivan Road", suburb: "Glen Waverley", city: "Glen Waverley", state: "VIC", country: "Australia", house_rules: "No smoking", check_in_time: "15:00", check_out_time: "10:00" });
  assert.equal(diffs.length, 0);
});

console.log("runListingSync");
const eligibleL = { ...fakeListing, specialStatus: null };
const ineligibleL = { ...fakeListing, id: 999, specialStatus: "archived" };
t("imports new eligible as draft, never publishes, idempotent on 2nd run", async () => {
  const rows = new Map();
  const inserted = [];
  const deps = {
    fetchListings: async () => [eligibleL, ineligibleL],
    fetchRows: async () => [...rows.values()],
    insertDraft: async (p) => { rows.set(p.hostaway_listing_id, { ...p, id: `row-${p.hostaway_listing_id}` }); inserted.push(p.hostaway_listing_id); return true; },
    updateDraft: async (id, p) => { rows.set(id, { ...rows.get(id), ...p }); return true; },
    deactivateDraft: async (id) => { rows.get(id).is_active = false; return true; },
  };
  const r1 = await runListingSync(deps);
  assert.equal(r1.imported, 1);
  assert.deepEqual(r1.importedIds, [572300]);
  assert.ok(rows.get(572300).is_published === false);
  const r2 = await runListingSync(deps);
  assert.equal(r2.imported, 0); // idempotent
  assert.equal(r2.draftsUpdated, 1);
});
t("flags published drift, never patches it", async () => {
  const rows = new Map([[572300, { ...localRow }]]);
  let patched = 0;
  const r = await runListingSync({
    fetchListings: async () => [eligibleL],
    fetchRows: async () => [...rows.values()],
    insertDraft: async () => false,
    updateDraft: async () => { patched++; return true; },
    deactivateDraft: async () => true,
  });
  assert.equal(r.publishedFlagged, 1);
  assert.equal(patched, 0);
  assert.equal(rows.get(572300).base_price_per_night, 100); // untouched
});
t("deactivates local draft when Hostaway ineligible/missing", async () => {
  const rows = new Map([[572300, { ...localRow, is_published: false }]]);
  const r = await runListingSync({
    fetchListings: async () => [], // listing gone
    fetchRows: async () => [...rows.values()],
    insertDraft: async () => false,
    updateDraft: async () => true,
    deactivateDraft: async (id) => { rows.get(id).is_active = false; return true; },
  });
  assert.equal(r.deactivatedDrafts, 1);
  assert.equal(rows.get(572300).is_active, false);
});

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
