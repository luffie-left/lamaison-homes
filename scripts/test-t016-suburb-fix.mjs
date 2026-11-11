// T016 suburb-fix regression tests — appended to the existing suite runner
// Run: node --experimental-strip-types --import ./scripts/register-ts.mjs scripts/test-t016-suburb-fix.mjs
import { strict as assert } from "node:assert";
import { pickSuburb } from "../src/lib/listing-sync.ts";

let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; console.log("  ✓", name); } catch (e) { fail++; console.log("  ✗", name, "-", e.message); } };

const mk = (over) => ({ city: "Melbourne", address: "", publicAddress: "", ...over });

console.log("pickSuburb — T016 trailing-segment fix");
t("postcode+country tail → suburb (Box Hill case, 303598)", () =>
  assert.equal(pickSuburb(mk({ publicAddress: "828Whitehorse Road, Box Hill, Victoria, Australia, 3128", city: "Box Hill" })), "Box Hill"));
t("country-name in Chinese + postcode (303600 case)", () =>
  assert.equal(pickSuburb(mk({ publicAddress: "138 Spencer Street #3303, Melbourne, Victoria, 澳大利亚, 3004", city: "Melbourne" })), "Melbourne"));
t("plain two-segment unchanged", () =>
  assert.equal(pickSuburb(mk({ publicAddress: "25 Osullivan Road, Glen Waverley", city: "Glen Waverley" })), "Glen Waverley"));
t("empty address falls back to city", () =>
  assert.equal(pickSuburb(mk({ city: "Richmond" })), "Richmond"));
t("single-segment address falls back to city", () =>
  assert.equal(pickSuburb(mk({ publicAddress: "25 Osullivan Road", city: "Glen Waverley" })), "Glen Waverley"));
t("defensive: postcode-only tail without country", () =>
  assert.equal(pickSuburb(mk({ publicAddress: "1 Main St, Carlton, 3053", city: "Carlton" })), "Carlton"));
t("state tail stripped", () =>
  assert.equal(pickSuburb(mk({ publicAddress: "1 Main St, Carlton, VIC", city: "Carlton" })), "Carlton"));
t("conservative: trailing 'Victoria' treated as state when other segments remain", () => {
  // With [street, Victoria] the while-loop guard (length > 1) keeps Victoria,
  // but it is genuinely ambiguous. Current behaviour: strip only when more than
  // one segment would remain — so "1 Main St, Victoria" → "Victoria".
  assert.equal(pickSuburb(mk({ publicAddress: "1 Main St, Victoria", city: "Melbourne" })), "Victoria");
});

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
