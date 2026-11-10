// TKT-20261111-01 dry-run: new pickSuburb against all 43 live listings + backfill diff generation (NO WRITES)
// Run: node --experimental-strip-types --import ./scripts/register-ts.mjs scripts/t016-dryrun-suburb-fix.mjs
import { pickSuburb } from "../src/lib/listing-sync.ts";
import { readFileSync, writeFileSync } from "node:fs";

const local = JSON.parse(readFileSync("/tmp/t016_local_rows.json", "utf8"));
const remote = JSON.parse(readFileSync("/tmp/t016_remote_listings.json", "utf8"));
const norm = (v) => (v === null || v === undefined ? "" : typeof v === "number" ? String(v) : String(v).trim());

let fixed = 0, stillDrift = [], regressions = [];
const backfill = [];

for (const row of local) {
  const l = remote[row.hostaway_listing_id];
  const newSuburb = pickSuburb({ ...l, price: 0, cleaningFee: 0 });
  if (newSuburb !== row.suburb) {
    const looksRight = newSuburb && !/^\d+$/.test(newSuburb) && newSuburb.length > 2;
    if (looksRight) fixed++;
    else regressions.push({ id: l.id, newSuburb });
    stillDrift.push({ id: l.id, localSuburb: row.suburb, newTransformSuburb: newSuburb, liveCity: l.city });
    var suburbPatch = looksRight ? newSuburb : undefined;
  }

  // backfill payload: price/cleaning (approved(2)) + suburb only where transform is now correct
  const patch = {};
  if (row.base_price_per_night === null && typeof l.price === "number") patch.base_price_per_night = l.price;
  else if (typeof l.price === "number" && norm(row.base_price_per_night) !== norm(l.price)) patch.base_price_per_night = l.price;
  if (norm(row.cleaning_fee) !== norm(typeof l.cleaningFee === "number" ? l.cleaningFee : null)) {
    if (typeof l.cleaningFee === "number") patch.cleaning_fee = l.cleaningFee;
  }
  if (typeof suburbPatch === "string") patch.suburb = suburbPatch;
  if (Object.keys(patch).length) backfill.push({ id: row.id, hostaway_listing_id: l.id, ...patch });
}

console.log("suburb: fixed by new transform:", fixed, "| would still drift:", stillDrift.length - regressions.length, "| suspicious:", regressions.length);
console.log("backfill patch rows:", backfill.length);
writeFileSync("/tmp/t016_backfill_plan.json", JSON.stringify(backfill, null, 1));
writeFileSync("/tmp/t016_suburb_dryrun.json", JSON.stringify({ fixed, regressions, stillDrift }, null, 1));
