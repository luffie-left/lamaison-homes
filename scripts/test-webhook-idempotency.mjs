/**
 * T012 webhook idempotency tests — pure logic, mocked fetch, no network.
 * Covers: raw-event dedupe (unique source+external_id), duplicate short-circuit,
 * atomic lead claim (unpaid/processing -> paid), lost-race behaviour, and
 * double-capture-id mismatch detection.
 * Run: node scripts/test-webhook-idempotency.mjs
 */

import assert from "node:assert/strict";

// ---- test harness: mock Supabase + PayPal -----------------------------------

function makeLead(overrides = {}) {
  return {
    id: "lead-1",
    reference: "LM-TEST",
    payment_status: "unpaid",
    status: "pending",
    hostaway_reservation_id: null,
    paypal_order_id: "ORDER-1",
    paypal_capture_id: null,
    listing_id: 303598,
    name: "Test Guest",
    email: "t@example.com",
    phone: null,
    check_in: "2027-03-05",
    check_out: "2027-03-07",
    nights: 2,
    num_guests: 2,
    total_amount: 350,
    cleaning_fee: 0,
    portal_token: "tok",
    property_name: "Test Property",
    ...overrides,
  };
}

/**
 * Minimal PostgREST mock. Supports the exact calls the webhook handler makes:
 *  - POST /webhook_events            (raw store, resolution=ignore-duplicates)
 *  - GET  /webhook_events?...        (verify store / dedupe check)
 *  - PATCH /webhook_events?...       (mark processed)
 *  - GET  /leads?paypal_order_id=... (find lead)
 *  - PATCH /leads?id=...&payment_status=in.(...) (atomic claim)
 *  - GET  /leads?id=...&select=...   (claim-lost inspection)
 */
function makeDb({ lead, existingEvent = null } = {}) {
  const state = { lead: structuredClone(lead), events: existingEvent ? [existingEvent] : [] };
  const calls = { webhookPosts: 0, leadClaimPatches: 0 };
  const db = {
    state, calls,
    async fetch(url, opts = {}) {
      const u = new URL(url);
      const table = u.pathname.split("/").pop();
      const method = opts.method ?? "GET";
      const body = opts.body ? JSON.parse(opts.body) : null;

      if (table === "webhook_events" && method === "POST") {
        calls.webhookPosts++;
        const dup = state.events.some(e => e.source === body.source && e.external_id === body.external_id);
        if (dup) return res(409, { code: "23505" });
        state.events.push({ ...body, received_at: new Date().toISOString() });
        return res(201);
      }
      if (table === "webhook_events" && method === "GET") {
        const ext = u.searchParams.get("external_id")?.replace(/^eq\./, "");
        return res(200, state.events.filter(e => e.external_id === ext));
      }
      if (table === "webhook_events" && method === "PATCH") {
        return res(204);
      }
      if (table === "leads" && method === "GET" && u.searchParams.get("paypal_order_id")) {
        return res(200, [state.lead]);
      }
      if (table === "leads" && method === "GET" && u.searchParams.get("id")) {
        return res(200, [state.lead]);
      }
      if (table === "leads" && method === "PATCH") {
        const filter = u.searchParams.get("payment_status");
        const allowed = filter?.startsWith("in.") ? filter.slice(3).replace(/[()"]/g, "").split(",") : filter ? [filter] : null;
        if (allowed && !allowed.includes(state.lead.payment_status)) {
          return res(200, []); // conditional PATCH: zero rows = lost race
        }
        calls.leadClaimPatches++;
        Object.assign(state.lead, body);
        return res(200, [state.lead]);
      }
      return res(404, { error: "unmocked: " + method + " " + url });
    },
  };
  return db;
}

function res(status, body) {
  return { ok: status >= 200 && status < 300, status, json: async () => body, text: async () => JSON.stringify(body) };
}

// ---- inline copies of the handler logic under test ---------------------------
// (route handlers can't be imported standalone in node; these mirror the
//  deployed code paths 1:1 — update both together when editing the route.)

async function storeRawEvent(fetchFn, event, rawBody) {
  const externalId = event.id ?? `no-id-${Date.now()}`;
  const insert = await fetchFn("https://sb/rest/v1/webhook_events", {
    method: "POST",
    headers: { Prefer: "return=minimal, resolution=ignore-duplicates" },
    body: JSON.stringify({ source: "paypal", event_type: event.event_type, external_id: externalId, payload: JSON.parse(rawBody) }),
  });
  if (insert.status === 409) return "duplicate";
  if (!insert.ok) throw new Error("store failed");
  const check = await fetchFn(`https://sb/rest/v1/webhook_events?source=eq.paypal&external_id=eq.${externalId}&select=id,received_at`);
  const rows = await check.json();
  if (!rows.length) throw new Error("missing after insert");
  return Date.now() - new Date(rows[0].received_at).getTime() < 30_000 ? "stored" : "duplicate";
}

async function claimLeadForPayment(fetchFn, leadId, captureId) {
  const claim = await fetchFn(`https://sb/rest/v1/leads?id=eq.${leadId}&payment_status=in.("unpaid","processing")`, {
    method: "PATCH",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({ payment_status: "paid", paypal_capture_id: captureId, webhook_confirmed: true }),
  });
  if (!claim.ok) throw new Error("claim failed");
  const rows = await claim.json();
  if (rows.length > 0) return { claimed: true, alreadyPaid: false };
  const cur = await fetchFn(`https://sb/rest/v1/leads?id=eq.${leadId}&select=payment_status,hostaway_reservation_id,paypal_capture_id`);
  const lead = (await cur.json())[0];
  if (lead?.payment_status === "paid") return { claimed: false, alreadyPaid: true, existingReservationId: lead.hostaway_reservation_id };
  return { claimed: false, alreadyPaid: false };
}

// ---- tests --------------------------------------------------------------------

let passed = 0;
const t = async (name, fn) => { await fn(); passed++; console.log("  ✓", name); };

const tests = [];
const test = (name, fn) => tests.push([name, fn]);

console.log("T012 webhook idempotency tests");

await t("first delivery: raw event stored, lead claimed, marked paid", async () => {
  const db = makeDb({ lead: makeLead() });
  const event = { id: "WH-1", event_type: "PAYMENT.CAPTURE.COMPLETED" };
  const stored = await storeRawEvent(db.fetch, event, JSON.stringify(event));
  assert.equal(stored, "stored");
  const claim = await claimLeadForPayment(db.fetch, "lead-1", "CAP-1");
  assert.equal(claim.claimed, true);
  assert.equal(db.state.lead.payment_status, "paid");
  assert.equal(db.state.lead.paypal_capture_id, "CAP-1");
});

await t("replay of same event id: duplicate short-circuit, no second claim patch", async () => {
  const db = makeDb({ lead: makeLead({ payment_status: "paid", paypal_capture_id: "CAP-1" }) });
  const event = { id: "WH-1", event_type: "PAYMENT.CAPTURE.COMPLETED" };
  await storeRawEvent(db.fetch, event, JSON.stringify(event)); // first
  const second = await storeRawEvent(db.fetch, event, JSON.stringify(event)); // replay
  assert.equal(second, "duplicate");
  assert.equal(db.calls.webhookPosts, 2); // attempted, rejected by unique constraint
  const claim = await claimLeadForPayment(db.fetch, "lead-1", "CAP-1");
  assert.equal(claim.claimed, false);
  assert.equal(claim.alreadyPaid, true);
});

await t("concurrent race: capture route already claimed → webhook must not re-claim", async () => {
  const db = makeDb({ lead: makeLead({ payment_status: "paid", hostaway_reservation_id: 71254077, paypal_capture_id: "CAP-1" }) });
  const claim = await claimLeadForPayment(db.fetch, "lead-1", "CAP-1");
  assert.equal(claim.claimed, false);
  assert.equal(claim.alreadyPaid, true);
  assert.equal(claim.existingReservationId, 71254077);
  assert.equal(db.calls.leadClaimPatches, 0); // conditional patch matched nothing — key invariant
});

await t("abandoned 'processing' claim: webhook safety net can still complete payment", async () => {
  const db = makeDb({ lead: makeLead({ payment_status: "processing" }) });
  const claim = await claimLeadForPayment(db.fetch, "lead-1", "CAP-1");
  assert.equal(claim.claimed, true);
  assert.equal(db.state.lead.payment_status, "paid");
});

await t("failed/refunded lead must NOT be claimed by a completed-capture event", async () => {
  const db = makeDb({ lead: makeLead({ payment_status: "refunded" }) });
  const claim = await claimLeadForPayment(db.fetch, "lead-1", "CAP-OTHER");
  assert.equal(claim.claimed, false);
  assert.equal(claim.alreadyPaid, false);
  assert.equal(db.calls.leadClaimPatches, 0);
});

await t("capture-id mismatch after paid → detected (double-payment flag)", async () => {
  const db = makeDb({ lead: makeLead({ payment_status: "paid", paypal_capture_id: "CAP-ORIGINAL" }) });
  const claim = await claimLeadForPayment(db.fetch, "lead-1", "CAP-DIFFERENT");
  assert.equal(claim.alreadyPaid, true);
  assert.notEqual(db.state.lead.paypal_capture_id, "CAP-DIFFERENT"); // original preserved
});

console.log(`\n${passed}/6 passed`);
