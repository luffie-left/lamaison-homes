-- P1 capture state machine (2026-11-11) — reviewed diff, requires owner approval before apply.
-- Adds the processing lease timestamp so stale 'processing' claims are detectable
-- (see src/lib/capture-claim.ts LEASE_STALE_AFTER_MS).
alter table public.leads
  add column if not exists processing_claimed_at timestamptz;

-- Backfill: existing stuck rows (WPZQ class). 'pending' rows keep NULL claim
-- timestamps; the new claim path accepts pending directly (no data fix needed).
-- 'processing' rows from the old no-lease era get NULL → treated as stale by
-- capture-claim.ts → claimable again (self-heal) rather than permanently stuck.
update public.leads
  set processing_claimed_at = null
  where payment_status = 'processing';
