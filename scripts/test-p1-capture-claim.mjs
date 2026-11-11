// Tests: capture claim-state machine (P1 fix) — decideLostClaim + claimable set
import { strict as assert } from "node:assert";
import { CLAIMABLE_PAYMENT_STATUSES, decideLostClaim, isLeaseStale, LEASE_STALE_AFTER_MS, claimableFilter } from "../src/lib/capture-claim.ts";

let pass = 0, fail = 0;
const t = (name, fn) => { try { fn(); pass++; console.log("  ✓", name); } catch (e) { fail++; console.log("  ✗", name, "-", e.message); } };
const NOW = Date.parse("2026-11-11T06:00:00Z");

console.log("claimable set");
t("unpaid, pending, payment_failed claimable — NOT paid/processing/refunded", () => {
  assert.deepEqual([...CLAIMABLE_PAYMENT_STATUSES].sort(), ["payment_failed", "pending", "unpaid"]);
  assert.equal(CLAIMABLE_PAYMENT_STATUSES.includes("paid"), false);
  assert.equal(CLAIMABLE_PAYMENT_STATUSES.includes("processing"), false);
  assert.equal(CLAIMABLE_PAYMENT_STATUSES.includes("refunded"), false);
});
t("claimableFilter renders PostgREST in. syntax", () => {
  assert.equal(claimableFilter(), '("unpaid","pending","payment_failed")');
});

console.log("decideLostClaim");
t("paid → render-success (checkpoint a: never clobber)", () => {
  assert.equal(decideLostClaim({ payment_status: "paid" }, NOW).kind, "render-success");
});
t("refunded → render-success (funds moved class)", () => {
  assert.equal(decideLostClaim({ payment_status: "refunded" }, NOW).kind, "render-success");
});
t("processing with fresh lease → retry-shortly", () => {
  const r = decideLostClaim({ payment_status: "processing", processing_claimed_at: new Date(NOW - 30_000).toISOString() }, NOW);
  assert.deepEqual(r, { kind: "retry-shortly", reason: "active-lease" });
});
t("processing with stale lease (>5min) → reclaim (self-heal)", () => {
  const r = decideLostClaim({ payment_status: "processing", processing_claimed_at: new Date(NOW - LEASE_STALE_AFTER_MS - 1).toISOString() }, NOW);
  assert.deepEqual(r, { kind: "reclaim", reason: "stale-lease" });
});
t("processing, lease exactly at threshold → still active (boundary)", () => {
  const r = decideLostClaim({ payment_status: "processing", processing_claimed_at: new Date(NOW - LEASE_STALE_AFTER_MS).toISOString() }, NOW);
  assert.equal(r.kind, "retry-shortly");
});
t("processing with NULL lease (pre-migration / WPZQ class) → reclaim", () => {
  assert.deepEqual(decideLostClaim({ payment_status: "processing", processing_claimed_at: null }, NOW), { kind: "reclaim", reason: "stale-lease" });
});
t("processing with garbage timestamp → retry-shortly (fail safe)", () => {
  const r = decideLostClaim({ payment_status: "processing", processing_claimed_at: "not-a-date" }, NOW);
  assert.equal(r.kind, "retry-shortly");
});
t("unpaid/pending/payment_failed re-observed → reclaim", () => {
  for (const s of ["unpaid", "pending", "payment_failed"]) {
    assert.equal(decideLostClaim({ payment_status: s }, NOW).kind, "reclaim");
  }
});

console.log("isLeaseStale");
t("null lease → stale (self-heal pre-migration rows)", () => {
  assert.equal(isLeaseStale({ payment_status: "processing" }, NOW), true);
});
t("fresh lease → not stale", () => {
  assert.equal(isLeaseStale({ payment_status: "processing", processing_claimed_at: new Date(NOW - 1000).toISOString() }, NOW), false);
});

console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
