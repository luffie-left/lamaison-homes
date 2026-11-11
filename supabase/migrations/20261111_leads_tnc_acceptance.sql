-- UX-TNC-20261111: record guest acceptance of Booking Terms & Conditions
-- Owner grant: Mick TG msg 878 (2026-11-11 13:40 AEDT), "build and migrate"
-- tnc_version values track the "Last updated" date on /booking-terms (first: 2025-06)
alter table public.leads
  add column if not exists tnc_accepted_at timestamptz,
  add column if not exists tnc_version text;
