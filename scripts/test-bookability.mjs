/**
 * Pure-policy tests for hostaway-bookability (no network, no writes).
 * Run: node scripts/test-bookability.mjs   (self-registers TS resolution;
 * Node ≥ 22.6 native type-stripping, falls back to hooks / project tsx)
 * (Node >= 22 runs TS via --experimental-strip-types; Node >= 23 natively.
 *  We use a small inline loader fallback: if native TS fails, the script
 *  prints instructions. No test framework dependency.)
 */

import assert from "node:assert/strict";
import { register } from "node:module";

// Self-registering TS resolution: works with plain `node scripts/test-bookability.mjs`
// (no --import flag, no tsx/esbuild dependency). Node ≥ 22.6 strips types
// natively; the hooks only add extensionless-relative + "@/" alias resolution.
// If a future Node breaks stripping entirely, fall back to tsx when installed.
async function loadModule() {
  try {
    return await import("../src/lib/hostaway-bookability.ts");
  } catch (err) {
    if (err?.code === "ERR_MODULE_NOT_FOUND" || err?.code === "ERR_UNKNOWN_FILE_EXTENSION") {
      try {
        register(new URL("./ts-resolve-hooks.mjs", import.meta.url));
        return await import("../src/lib/hostaway-bookability.ts");
      } catch {
        // Last resort: project-local tsx if installed (node_modules/.bin/tsx)
        const { pathToFileURL: toURL } = await import("node:url");
        const tsx = "file://" + process.cwd() + "/node_modules/tsx/dist/loader.mjs";
        register(tsx, toURL(import.meta.url));
        return await import("../src/lib/hostaway-bookability.ts");
      }
    }
    throw err;
  }
}

const mod = await loadModule();
const {
  isHostawayListingEligible,
  enumerateOvernights,
  parseIsoDate,
  validateCalendar,
  assertHostawayBookable,
  BookabilityError,
} = mod;

let passed = 0;
let failed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}\n    ${err.message}`);
  }
}
async function atest(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    console.error(`  ✗ ${name}\n    ${err.message}`);
  }
}

const baseListing = {
  id: 303598,
  name: "Test",
  city: "Melbourne",
  address: "x",
  bedroomsNumber: 2,
  bathroomsNumber: 1,
  personCapacity: 4,
  price: 200,
  cleaningFee: 100,
  minimumStay: 2,
  publicDescription: "",
  houseRules: "",
  listingImages: [],
  listingBedTypes: [],
  amenities: [],
  status: "active",
  specialStatus: null,
};

console.log("\n— isHostawayListingEligible —");

test("normal listing (status active, specialStatus null) is eligible — 303598 shape", () => {
  assert.equal(isHostawayListingEligible({ ...baseListing, specialStatus: null }), true);
});

test("specialStatus 'archived' is ineligible — 387779 shape", () => {
  assert.equal(isHostawayListingEligible({ ...baseListing, specialStatus: "archived" }), false);
});

test("unknown specialStatus fails closed", () => {
  assert.equal(isHostawayListingEligible({ ...baseListing, specialStatus: "somethingNew" }), false);
});

test("missing specialStatus is ineligible", () => {
  const withoutStatus = { ...baseListing };
  delete withoutStatus.specialStatus;
  assert.equal(isHostawayListingEligible(withoutStatus), false);
});

test("undocumented specialStatus fails closed", () => {
  assert.equal(isHostawayListingEligible({ ...baseListing, specialStatus: "normal" }), false);
});

test("status archived/unlisted/inactive/deleted are ineligible", () => {
  for (const status of ["archived", "unlisted", "inactive", "deleted", "paused", "snoozed"]) {
    assert.equal(isHostawayListingEligible({ ...baseListing, status }), false, status);
  }
});

test("unknown non-active status fails closed", () => {
  assert.equal(isHostawayListingEligible({ ...baseListing, status: "pendingReview" }), false);
});

test("status '1' (active legacy) is eligible", () => {
  assert.equal(isHostawayListingEligible({ ...baseListing, status: "1" }), true);
});

test("explicit active:false flag is ineligible even with healthy status/specialStatus", () => {
  assert.equal(isHostawayListingEligible({ ...baseListing, active: false }), false);
  assert.equal(isHostawayListingEligible({ ...baseListing, active: 0 }), false);
  // Missing `active` field is not a signal — healthy listing stays eligible
  assert.equal(isHostawayListingEligible({ ...baseListing }), true);
});

test("explicit archived/unlisted/deleted flags are ineligible", () => {
  assert.equal(isHostawayListingEligible({ ...baseListing, archived: true }), false);
  assert.equal(isHostawayListingEligible({ ...baseListing, unlisted: 1 }), false);
  assert.equal(isHostawayListingEligible({ ...baseListing, deleted: true }), false);
});

test("isBookable=false is ineligible; isBookable=true fine", () => {
  assert.equal(isHostawayListingEligible({ ...baseListing, isBookable: false }), false);
  assert.equal(isHostawayListingEligible({ ...baseListing, isBookable: true }), true);
});

test("null/undefined listing is ineligible", () => {
  assert.equal(isHostawayListingEligible(null), false);
  assert.equal(isHostawayListingEligible(undefined), false);
});

console.log("\n— date helpers —");

test("parseIsoDate accepts valid, rejects invalid/rollover", () => {
  assert.ok(parseIsoDate("2026-11-06"));
  assert.equal(parseIsoDate("2026-13-01"), null);
  assert.equal(parseIsoDate("2026-02-30"), null);
  assert.equal(parseIsoDate("06-11-2026"), null);
  assert.equal(parseIsoDate("2026-11-6"), null);
});

test("enumerateOvernights excludes checkout night", () => {
  assert.deepEqual(enumerateOvernights("2026-11-01", "2026-11-04"), [
    "2026-11-01",
    "2026-11-02",
    "2026-11-03",
  ]);
});

test("enumerateOvernights rejects bad input / same-day / reversed", () => {
  assert.equal(enumerateOvernights("2026-11-04", "2026-11-04"), null);
  assert.equal(enumerateOvernights("2026-11-05", "2026-11-04"), null);
  assert.equal(enumerateOvernights("nope", "2026-11-04"), null);
});

console.log("\n— validateCalendar —");

const cal = (date, opts = {}) => ({ date, status: "available", isAvailable: 1, ...opts });

test("all overnights available → ok, picks arrival minStay", () => {
  const v = validateCalendar(["2026-11-01", "2026-11-02"], [
    cal("2026-11-01", { minimumStay: 3 }),
    cal("2026-11-02"),
    cal("2026-11-03"), // checkout day — extra is fine
  ]);
  assert.equal(v.ok, true);
  assert.equal(v.minStayOnArrival, 3);
});

test("missing calendar day → CALENDAR_INCOMPLETE (fail closed)", () => {
  const v = validateCalendar(["2026-11-01", "2026-11-02"], [cal("2026-11-01")]);
  assert.equal(v.ok, false);
  assert.equal(v.code, "CALENDAR_INCOMPLETE");
});

test("gap detection wins over earlier blocked night", () => {
  // 11-01 is blocked AND 11-02 is missing — incompleteness must be reported,
  // never a 409 "unavailable" masking a 503-class gap.
  const v = validateCalendar(
    ["2026-11-01", "2026-11-02"],
    [cal("2026-11-01", { isAvailable: 0 })]
  );
  assert.equal(v.ok, false);
  assert.equal(v.code, "CALENDAR_INCOMPLETE");
});

await atest("HTTP 403 (direct API currently blocked) → HOSTAWAY_UNAVAILABLE, no retry", async () => {
  let calls = 0;
  await assert.rejects(
    assertHostawayBookable(303598, "2026-11-01", "2026-11-04", 2, {
      getListing: async () => { calls++; throw new Error("Hostaway /listings/303598: 403"); },
      getCalendar: async () => { calls++; throw new Error("403"); },
    }),
    (e) => e.code === "HOSTAWAY_UNAVAILABLE" && e.status === 503
  );
  assert.equal(calls, 2, "no retries — each fetcher called exactly once");
});

test("null calendar → CALENDAR_INCOMPLETE", () => {
  const v = validateCalendar(["2026-11-01"], null);
  assert.equal(v.ok, false);
  assert.equal(v.code, "CALENDAR_INCOMPLETE");
});

test("blocked overnight (isAvailable=0 or reserved status) → DATES_UNAVAILABLE", () => {
  const v1 = validateCalendar(["2026-11-01"], [cal("2026-11-01", { isAvailable: 0 })]);
  assert.equal(v1.code, "DATES_UNAVAILABLE");
  const v2 = validateCalendar(["2026-11-01"], [cal("2026-11-01", { status: "reserved" })]);
  assert.equal(v2.code, "DATES_UNAVAILABLE");
});

console.log("\n— assertHostawayBookable (mocked fetchers) —");

const okDeps = (listing, calendar) => ({
  getListing: async () => listing,
  getCalendar: async () => calendar,
});

await atest("happy path returns listing", async () => {
  const listing = await assertHostawayBookable(
    303598,
    "2026-11-01",
    "2026-11-04",
    3,
    okDeps(
      { ...baseListing, specialStatus: null },
      [cal("2026-11-01", { minimumStay: 2 }), cal("2026-11-02"), cal("2026-11-03"), cal("2026-11-04")]
    )
  );
  assert.equal(listing.id, 303598);
});

await atest("archived specialStatus → LISTING_INELIGIBLE 409", async () => {
  await assert.rejects(
    assertHostawayBookable(387779, "2026-11-01", "2026-11-04", 2, okDeps(
      { ...baseListing, specialStatus: "archived" }, [cal("2026-11-01")]
    )),
    (e) => e instanceof BookabilityError && e.code === "LISTING_INELIGIBLE" && e.status === 409
  );
});

await atest("API failure → HOSTAWAY_UNAVAILABLE 503", async () => {
  await assert.rejects(
    assertHostawayBookable(303598, "2026-11-01", "2026-11-04", 2, {
      getListing: async () => { throw new Error("HTTP 500"); },
      getCalendar: async () => [],
    }),
    (e) => e.code === "HOSTAWAY_UNAVAILABLE" && e.status === 503
  );
});

await atest("missing calendar day → CALENDAR_INCOMPLETE 503", async () => {
  await assert.rejects(
    assertHostawayBookable(303598, "2026-11-01", "2026-11-04", 2, okDeps(
      baseListing, [cal("2026-11-01"), cal("2026-11-02")] // 11-03 missing
    )),
    (e) => e.code === "CALENDAR_INCOMPLETE" && e.status === 503
  );
});

await atest("per-arrival minimumStay enforced", async () => {
  await assert.rejects(
    assertHostawayBookable(303598, "2026-11-01", "2026-11-03", 2, okDeps(
      baseListing,
      [cal("2026-11-01", { minimumStay: 5 }), cal("2026-11-02"), cal("2026-11-03")]
    )),
    (e) => e.code === "MIN_STAY_NOT_MET" && e.status === 400
  );
});

await atest("listing-level minimumStay fallback enforced", async () => {
  await assert.rejects(
    assertHostawayBookable(303598, "2026-11-01", "2026-11-02", 2, okDeps(
      { ...baseListing, minimumStay: 3 },
      [cal("2026-11-01"), cal("2026-11-02")]
    )),
    (e) => e.code === "MIN_STAY_NOT_MET"
  );
});

await atest("capacity exceeded → 400", async () => {
  await assert.rejects(
    assertHostawayBookable(303598, "2026-11-01", "2026-11-04", 5, okDeps(
      baseListing,
      [cal("2026-11-01"), cal("2026-11-02"), cal("2026-11-03"), cal("2026-11-04")]
    )),
    (e) => e.code === "CAPACITY_EXCEEDED" && e.status === 400
  );
});

await atest("blocked overnight → DATES_UNAVAILABLE 409", async () => {
  await assert.rejects(
    assertHostawayBookable(303598, "2026-11-01", "2026-11-04", 2, okDeps(
      baseListing,
      [cal("2026-11-01"), cal("2026-11-02", { isAvailable: 0 }), cal("2026-11-03"), cal("2026-11-04")]
    )),
    (e) => e.code === "DATES_UNAVAILABLE" && e.status === 409
  );
});

await atest("invalid inputs → INVALID_REQUEST 400", async () => {
  for (const args of [
    [0, "2026-11-01", "2026-11-04", 2],
    [303598, "bad", "2026-11-04", 2],
    [303598, "2026-11-01", "2026-11-01", 2],
    [303598, "2026-11-01", "2026-11-04", 0],
  ]) {
    await assert.rejects(
      assertHostawayBookable(...args, okDeps(baseListing, [])),
      (e) => e.code === "INVALID_REQUEST"
    );
  }
});

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
