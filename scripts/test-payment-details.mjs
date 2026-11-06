/** Offline checks: node --import ./scripts/register-ts.mjs scripts/test-payment-details.mjs */
import assert from 'node:assert/strict'
import { paymentAuditNote, paymentMethodLabel, paypalEnvironment } from '../src/lib/payment-details.ts'
assert.equal(paypalEnvironment('sandbox'), 'sandbox')
assert.equal(paypalEnvironment('live'), 'live')
assert.equal(paypalEnvironment(undefined), 'unknown')
assert.match(paymentMethodLabel('sandbox'), /TEST ONLY.*no real charge/i)
assert.equal(paymentMethodLabel('live'), 'PayPal')
assert.match(paymentMethodLabel('unknown'), /unverified/i)
const note=paymentAuditNote({environment:'sandbox',reference:'LM-TEST',captureId:'CAPTURE-123',orderId:'ORDER-123',amount:350,currency:'AUD'})
for (const x of ['TEST ONLY','LM-TEST','CAPTURE-123','ORDER-123','AUD 350.00']) assert.ok(note.includes(x), `missing ${x}`)
assert.match(paymentAuditNote({environment:'unknown',reference:'LM',captureId:'',orderId:'',amount:0,currency:'AUD'}), /environment unverified/)
console.log('PASS payment-method and transaction traceability, sandbox/live/unknown labels; no network')
