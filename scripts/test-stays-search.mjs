/**
 * T013 stays-search logic tests — pure functions, no network.
 * Covers: suburb prediction/resolve, haversine + closest-first ranking
 * stability, night enumeration, and per-night range availability (fail closed).
 * Run: node scripts/test-stays-search.mjs
 */

import assert from "node:assert/strict";
import { register } from "node:module";

async function loadModule() {
  try {
    return await import("../src/lib/stays-search.ts");
  } catch (err) {
    if (err?.code === "ERR_MODULE_NOT_FOUND" || err?.code === "ERR_UNKNOWN_FILE_EXTENSION") {
      register(new URL("./ts-resolve-hooks.mjs", import.meta.url));
      return await import("../src/lib/stays-search.ts");
    }
    throw err;
  }
}

const {
  predictSuburbs,
  resolveSuburb,
  haversineKm,
  findSuburbEntry,
  rankByProximity,
  enumerateNights,
  isAvailableForRange,
  isValidDateStr,
  toDateStr,
} = await loadModule();

let passed = 0;
const results = [];
const t = async (name, fn) => { await fn(); passed++; console.log("  ✓", name); results.push(name); };

console.log("T013 stays-search tests");

// ── prediction ──
await t("prefix matches rank ahead of substring matches", () => {
  const p = predictSuburbs("st", 6);
  const names = p.map(x => x.name);
  assert.ok(names.includes("St Kilda"), "St Kilda expected: " + names);
  assert.ok(names[0].startsWith("St") || names[0].startsWith("Strath"), names[0]);
  assert.ok(names.length <= 6);
});

await t("alias matching works (melbourne/cbd)", () => {
  const p = predictSuburbs("cbd", 3).map(x => x.name);
  assert.ok(p.includes("Melbourne CBD"), p.join());
  const p2 = predictSuburbs("melb", 3).map(x => x.name);
  assert.ok(p2.length > 0 && p2.includes("Melbourne CBD"), p2.join());
});

await t("empty/garbage query returns empty", () => {
  assert.deepEqual(predictSuburbs(""), []);
  assert.deepEqual(predictSuburbs("   "), []);
  assert.deepEqual(predictSuburbs("zzzzqx", 6), []);
});

await t("prediction order is deterministic (stable)", () => {
  const a = predictSuburbs("wood", 6).map(x => x.name);
  const b = predictSuburbs("wood", 6).map(x => x.name);
  assert.deepEqual(a, b);
});

// ── resolve ──
await t("resolveSuburb exact + alias + unique prefix", () => {
  assert.equal(resolveSuburb("Box Hill")?.name, "Box Hill");
  assert.equal(resolveSuburb("cbd")?.name, "Melbourne CBD");
  assert.equal(resolveSuburb("dockl")?.name, "Docklands"); // unique prefix
  assert.equal(resolveSuburb("zzzz"), null);
  // Ambiguous prefix (many suburbs start with 'st') resolves null, not arbitrary
  assert.equal(resolveSuburb("st"), null);
});

// ── distance + ranking ──
await t("haversine sanity: Flinders St to Fitzroy ~ 2-4 km", () => {
  const cbd = { lat: -37.8136, lng: 144.9631 };
  const fitzroy = { lat: -37.799, lng: 144.976 };
  const d = haversineKm(cbd.lat, cbd.lng, fitzroy.lat, fitzroy.lng);
  assert.ok(d > 1 && d < 5, "got " + d + " km");
});

await t("closest-first ranking is correct + stable across runs", () => {
  const anchor = findSuburbEntry("Melbourne CBD") ?? { lat: -37.8136, lng: 144.9631, name: "x" };
  const items = [
    { slug: "box-hill", lat: -37.8174, lng: 145.1175 },
    { slug: "fitzroy", lat: -37.799, lng: 144.976 },
    { slug: "st-kilda", lat: -37.8679, lng: 144.9826 },
    { slug: "ringwood", lat: -37.8136, lng: 145.2263 },
  ];
  const r1 = rankByProximity(items, anchor).map(i => i.slug);
  const r2 = rankByProximity(items, anchor).map(i => i.slug);
  assert.deepEqual(r1, r2, "stable");
  // Fitzroy (~2.3km) < St Kilda (~6.4km) < Box Hill (~13.4km) < Ringwood (~22.7km)
  assert.equal(r1[0], "fitzroy");
  assert.equal(r1[1], "st-kilda");
  assert.equal(r1[2], "box-hill");
  assert.equal(r1[3], "ringwood");
});

await t("listing without coordinates sorts last, ties broken by slug", () => {
  const anchor = { lat: -37.8136, lng: 144.9631 };
  const items = [
    { slug: "zzz-nocoords" },
    { slug: "aaa-nocoords" },
    { slug: "has-coords", lat: -37.799, lng: 144.976 },
  ];
  const r = rankByProximity(items, anchor).map(i => i.slug);
  assert.equal(r[0], "has-coords");
  assert.equal(r[1], "aaa-nocoords");
  assert.equal(r[2], "zzz-nocoords");
});

// ── dates ──
await t("enumerateNights: check-in inclusive, check-out exclusive", () => {
  const nights = enumerateNights("2027-03-05", "2027-03-08");
  assert.deepEqual(nights, ["2027-03-05", "2027-03-06", "2027-03-07"]);
  assert.deepEqual(enumerateNights("2027-03-05", "2027-03-06"), ["2027-03-05"]);
  assert.deepEqual(enumerateNights("2027-03-05", "2027-03-05"), []);
});

await t("isValidDateStr + toDateStr local formatting", () => {
  assert.ok(isValidDateStr("2027-03-05"));
  assert.ok(!isValidDateStr("2027-3-5"));
  assert.ok(!isValidDateStr("not-a-date"));
  assert.equal(toDateStr(new Date(2027, 2, 5)), "2027-03-05");
});

// ── availability (per-night, fail closed) ──
const cal = (dates, available) => dates.map(d => ({ date: d, available }));

await t("available when every night in range is available", () => {
  const calendar = cal(["2027-03-05", "2027-03-06", "2027-03-07"], true);
  assert.ok(isAvailableForRange(calendar, "2027-03-05", "2027-03-08"));
  assert.ok(isAvailableForRange(calendar, "2027-03-06", "2027-03-08"));
});

await t("unavailable when ANY night in range is blocked (not just start)", () => {
  const calendar = [
    { date: "2027-03-05", available: true },
    { date: "2027-03-06", available: false }, // blocked mid-stay
    { date: "2027-03-07", available: true },
  ];
  assert.ok(!isAvailableForRange(calendar, "2027-03-05", "2027-03-08"));
  // Range avoiding the blocked night is fine
  assert.ok(isAvailableForRange(calendar, "2027-03-07", "2027-03-08"));
});

await t("missing calendar entries fail closed (blocked)", () => {
  const calendar = cal(["2027-03-05", "2027-03-07"], true); // gap on 03-06
  assert.ok(!isAvailableForRange(calendar, "2027-03-05", "2027-03-08"));
  assert.ok(!isAvailableForRange([], "2027-03-05", "2027-03-08"));
});

await t("check-out night itself is not required to be free", () => {
  const calendar = [
    { date: "2027-03-05", available: true },
    { date: "2027-03-06", available: true },
    { date: "2027-03-07", available: false }, // departure day
  ];
  assert.ok(isAvailableForRange(calendar, "2027-03-05", "2027-03-07"));
});

console.log(`\n${passed}/${results.length} passed`);
