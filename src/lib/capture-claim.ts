/**
 * Capture claim-state machine (P1 fix, 2026-11-11).
 *
 * Root cause being fixed: the capture route's race guard claimed ONLY
 * payment_status='unpaid', but create-order writes 'pending' when it stores
 * the PayPal order ID. A 'pending' lead could never be claimed → every
 * success-page visit fell into the "lost race" branch → permanent 409
 * "Booking is being processed". Additionally 'processing' had no lease, so
 * a capture that died post-claim stuck the lead forever.
 *
 * Design (owner-approved design, reviewed diff per Mick TG msg 837):
 * 1. Claimable states: unpaid | pending | payment_failed. Never paid,
 *    processing (fresh), or refunded.
 * 2. Lost-claim response: reread the lead — if it became 'paid', the caller
 *    should render success; if 'processing' with a STALE lease, the caller may
 *    re-claim; otherwise genuine concurrent processing → retry shortly.
 * 3. Lease: processing_claimed_at timestamp. LEASE_STALE_AFTER_MS is the
 *    staleness threshold. Cleared implicitly by the paid transition; a stale
 *    lease is re-claimable because the claim PATCH filters on staleness.
 * 4. Idempotency guard (audit checkpoint a): payment_failed claim-path can
 *    never clobber a processing/paid row — claim PATCH filters on the
 *    claimable-state set, and 'paid' is excluded; webhook only transitions
 *    unpaid|processing → paid.
 */

/** States a capture attempt may claim (transition into 'processing'). */
export const CLAIMABLE_PAYMENT_STATUSES = ['unpaid', 'pending', 'payment_failed'] as const

/** Statuses that mean money definitively moved. */
export const FUNDS_CAPTURED_STATUSES = ['paid', 'refunded', 'partially_refunded'] as const

/** Lease staleness threshold: 5 minutes with no progress = dead claim.
 *  PayPal captures complete in <10s; webhook safety net fires within ~60s.
 *  5 min comfortably covers retries while never leaving a guest stuck. */
export const LEASE_STALE_AFTER_MS = 5 * 60 * 1000

export type LeadRow = {
  payment_status: string
  processing_claimed_at?: string | null
}

export type LostClaimAction =
  | { kind: 'render-success'; reason: 'lead-became-paid' }
  | { kind: 'reclaim' ; reason: 'stale-lease' | 'claimable-state' }
  | { kind: 'retry-shortly'; reason: 'active-lease' }

/**
 * Decide what the caller should do after losing the claim race.
 * Audit checkpoint (b): specifies behavior for every post-claim state.
 */
export function decideLostClaim(leadAfter: LeadRow, nowMs: number = Date.now()): LostClaimAction {
  if (FUNDS_CAPTURED_STATUSES.includes(leadAfter.payment_status as never)) {
    return { kind: 'render-success', reason: 'lead-became-paid' }
  }
  if (leadAfter.payment_status === 'processing') {
    const claimedAt = leadAfter.processing_claimed_at ? Date.parse(leadAfter.processing_claimed_at) : NaN
    // No timestamp at all (pre-migration row): treat as stale — claimable.
    // Unparseable timestamp: fail open to retry-shortly (safe, no clobber).
    if (!Number.isFinite(claimedAt)) {
      return Number.isNaN(claimedAt) && !leadAfter.processing_claimed_at
        ? { kind: 'reclaim', reason: 'stale-lease' }
        : { kind: 'retry-shortly', reason: 'active-lease' }
    }
    if (nowMs - claimedAt > LEASE_STALE_AFTER_MS) {
      return { kind: 'reclaim', reason: 'stale-lease' }
    }
    return { kind: 'retry-shortly', reason: 'active-lease' }
  }
  // payment_failed / unpaid / pending re-observed (e.g. our own claim PATCH
  // raced with a markFailed) — safe to retry the claim.
  return { kind: 'reclaim', reason: 'claimable-state' }
}

/** PostgREST `in.` filter value for the claimable-state set. */
export function claimableFilter(): string {
  return `("${CLAIMABLE_PAYMENT_STATUSES.join('","')}")`
}

/** True if a row's processing lease is stale (or absent, pre-migration). */
export function isLeaseStale(lead: LeadRow, nowMs: number = Date.now()): boolean {
  const claimedAt = lead.processing_claimed_at ? Date.parse(lead.processing_claimed_at) : NaN
  if (!Number.isFinite(claimedAt)) return true
  return nowMs - claimedAt > LEASE_STALE_AFTER_MS
}
