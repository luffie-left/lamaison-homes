/**
 * Pure-logic tests for T015a Track A (booking-UX fixes):
 *  - phone composition/validation (A3)
 *  - client server-error surfacing (A1)
 * No network, no writes. Run: node scripts/test-booking-ux.mjs
 * (same self-registering TS resolution pattern as test-bookability.mjs)
 */

import assert from "node:assert/strict";
import { register } from "node:module";

async function loadModule(spec) {
  try {
    return await import(spec);
  } catch (err) {
    if (err?.code === "ERR_MODULE_NOT_FOUND" || err?.code === "ERR_UNKNOWN_FILE_EXTENSION") {
      try {
        register(new URL("./ts-resolve-hooks.mjs", import.meta.url));
        return await import(spec);
      } catch {
        const { pathToFileURL: toURL } = await import("node:url");
        const tsx = "file://" + process.cwd() + "/node_modules/tsx/dist/loader.mjs";
        register(tsx, toURL(import.meta.url));
        return await import(spec);
      }
    }
    throw err;
  }
}

const phone = await loadModule("../src/lib/phone.ts");
const clientError = await loadModule("../src/lib/client-error.ts");

// ── A3: phone ────────────────────────────────────────────────────────────────

// composeE164 happy paths
assert.equal(phone.composeE164("+61", "0412 345 678"), "+61412345678"); // AU trunk 0 dropped
assert.equal(phone.composeE164("+61", "412345678"), "+61412345678");
assert.equal(phone.composeE164("+64", "021 123 4567"), "+64211234567");
assert.equal(phone.composeE164("+1", "(415) 555-2671"), "+14155552671");
assert.equal(phone.composeE164("+44", "7400123456"), "+447400123456");

// too short / too long / empty
assert.equal(phone.composeE164("+61", "123456"), null); // 6 digits
assert.equal(phone.composeE164("+61", "0" + "1".repeat(16)), null); // 17 digits
assert.equal(phone.composeE164("+61", ""), null);
assert.equal(phone.composeE164("", "412345678"), null);
assert.equal(phone.composeE164("+61", "01234567"), "+611234567"); // exactly 7 after trunk drop

// isValidE164
assert.ok(phone.isValidE164("+61412345678"));
assert.ok(!phone.isValidE164("+61123456")); // 6 subscriber digits — too short
assert.ok(!phone.isValidE164("61412345678")); // missing +
assert.ok(!phone.isValidE164("+61")); // no subscriber digits
assert.ok(!phone.isValidE164(""));

// splitE164 round-trips composeE164 output
const e164 = phone.composeE164("+65", "8123 4567");
assert.ok(e164);
const split = phone.splitE164(e164);
assert.ok(split);
assert.equal(split.dial, "+65");
assert.equal(split.local, "81234567");
assert.equal(phone.splitE164("not-a-number"), null);

// dial list sanity: default present, all plausible
assert.ok(phone.DIAL_CODES.some((d) => d.dial === phone.DEFAULT_DIAL_CODE));
for (const d of phone.DIAL_CODES) {
  assert.match(d.dial, /^\+\d{1,3}$/);
}

// ── A1: client error surfacing ───────────────────────────────────────────────

// quote / create-order BookabilityError shape
assert.equal(
  clientError.serverErrorMessage({ error: "Minimum stay is 3 nights for these dates", code: "MIN_STAY_NOT_MET" }),
  "Minimum stay is 3 nights for these dates"
);
// plain { error } shape
assert.equal(clientError.serverErrorMessage({ error: "Failed to create PayPal order" }), "Failed to create PayPal order");
// message-only shape
assert.equal(clientError.serverErrorMessage({ message: "m" }), "m");
// unparseable / absent → null so caller falls back to generic copy
assert.equal(clientError.serverErrorMessage(null), null);
assert.equal(clientError.serverErrorMessage({}), null);
assert.equal(clientError.serverErrorMessage({ error: "" }), null);
assert.equal(clientError.serverErrorMessage({ error: 42 }), null);
assert.equal(clientError.serverErrorMessage("string"), null);
// safeJson: fabricated Response-like with bad JSON
assert.equal(await clientError.safeJson({ json: async () => { throw new SyntaxError("bad"); } }), null);
assert.deepEqual(await clientError.safeJson({ json: async () => ({ error: "x" }) }), { error: "x" });
// serverErrorOr fallback
assert.equal(
  await clientError.serverErrorOr({ json: async () => ({ error: "Pricing changed; please request a fresh quote", code: "PRICING_CHANGED" }) }, "Something went wrong. Please try again."),
  "Pricing changed; please request a fresh quote"
);
assert.equal(
  await clientError.serverErrorOr({ json: async () => { throw new Error("no body"); } }, "Something went wrong. Please try again."),
  "Something went wrong. Please try again."
);

console.log("✓ test-booking-ux: all phone + client-error assertions passed");
