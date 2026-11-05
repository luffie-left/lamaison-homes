# Hostaway Bookability — Fail-Closed Validation

**Module:** `src/lib/hostaway-bookability.ts`
**Tests:** `node --import ./scripts/register-ts.mjs scripts/test-bookability.mjs`

## Purpose

Every booking-critical decision (quote, payment capture, availability) must go
through `assertHostawayBookable`. Nothing is ever served as "bookable" from
stale/cached data.

## Exports

```ts
assertHostawayBookable(listingId: number, checkIn: string, checkOut: string, guests: number): Promise<HostawayListing>
```
Validates and returns the listing, or throws `BookabilityError`
(with `.status` HTTP code and `.code` machine code). Payment routes should map
these directly.

```ts
isHostawayListingEligible(listing: HostawayListing | null | undefined): boolean
```
Reusable pure eligibility check used by the listing/detail routes.

`BookabilityError.code` values → default HTTP status:

| Code | Status | Meaning |
|---|---|---|
| `INVALID_REQUEST` | 400 | Bad listingId / guests / non-ISO or reversed dates |
| `LISTING_NOT_FOUND` | 404 | Hostaway has no such listing |
| `LISTING_INELIGIBLE` | 409 | Archived / unlisted / inactive / deleted / unknown `specialStatus` |
| `CAPACITY_EXCEEDED` | 400 | `guests > personCapacity` |
| `MIN_STAY_NOT_MET` | 400 | Nights < per-arrival calendar `minimumStay` (falls back to listing `minimumStay`, then 1) |
| `DATES_UNAVAILABLE` | 409 | An overnight is blocked/reserved |
| `CALENDAR_INCOMPLETE` | 503 | A requested overnight has **no calendar entry** — treated as unverifiable, fail closed |
| `HOSTAWAY_UNAVAILABLE` | 503 | Listing or calendar API call failed |

## Eligibility rules (fail closed)

`isHostawayListingEligible` rejects when:

- `status` ∈ {archived, unlisted, inactive, deleted, paused, snoozed} — or any
  value other than `active` / `1` / empty (unknown ⇒ ineligible)
- explicit flags `archived` / `unlisted` / `deleted` / `isBookable: false`
- `specialStatus` is anything other than `null` (including absent or unknown)
  (Hostaway documents only `null` and `archived`; unknown values fail closed)

### Observed live values

- **387779** → `specialStatus: "archived"` → **ineligible**
- **303598** → `specialStatus: null` → **eligible**

### Scope note — OTA unpublished ≠ direct ineligible

Individual-channel "unpublished" flags (e.g. an Airbnb-only unpublished status)
do **not** affect direct booking on our own site and are deliberately not
checked. Only whole-listing state (`status` / `specialStatus`) gates direct
eligibility.

## Freshness

- `hostawayGet(path, 0)` now sets `cache: "no-store"` in addition to
  `next: { revalidate: 0 }`.
- `assertHostawayBookable` fetches the listing **and** calendar with revalidate=0
  on every call. No cached eligibility.

## Validation performed by `assertHostawayBookable`

1. Integer listingId > 0; guests ≥ 1
2. `checkIn`/`checkOut` strict `YYYY-MM-DD` (rejects rollover like 02-30); check-out after check-in
3. Fresh listing lookup — eligibility (above) + capacity
4. Fresh calendar for `[checkIn, checkOut]`; **every overnight (check-in → night before checkout) must have an entry** and be available (`isAvailable === 1`, status not blocked/reserved/unavailable). A missing day is `CALENDAR_INCOMPLETE` (503), not "free".
5. Minimum stay: per-arrival-date `minimumStay` from the calendar wins; else listing `minimumStay`; else 1.

## Public Supabase properties policy

Public listing/detail/availability routes require **all** of:

1. `is_published = true` **AND** `is_active = true` (enforced in REST query for slug routes and in the response filter for the list route)
2. A valid `hostaway_listing_id` mapping — no mapping ⇒ excluded (404 / dropped)
3. Current Hostaway listing exists and passes `isHostawayListingEligible` —
   archived/missing ⇒ excluded. Hostaway API outage ⇒ **503**, never stale fallback.

### Numeric slugs
Numeric listing IDs require a corresponding active and published local property.
Missing rows return 404; Supabase outages return 503. Numeric URLs cannot
bypass the publication policy.

## List pagination

`fetchAllHostawayListings()` (exported from `/api/stays/route.ts`) pages through
`/listings?limit=100&offset=…`. Termination requires a **short page** or a real
numeric `count` being reached — an `undefined` count with full pages keeps
paging up to a hard cap (5000); hitting the cap, duplicate listing IDs across
pages, malformed rows, or any page failure (incl. current 403 — **no retry**) ⇒
`null` ⇒ **503**, never a partial list or a 200-empty success.

## No Hostaway fallback for the public catalog

`/api/stays` treats Supabase as authoritative for publicity:
- `getFromSupabase` returns **`[]`** for zero published rows — a valid empty
  catalog, returned as empty with **no** fallback to raw Hostaway listings
  (fallback could expose unpublished properties)
- `null` (Supabase failure / unconfigured) ⇒ 503
- Hostaway list outage ⇒ 503 (cannot verify current eligibility)

## Route changes

- **`/api/quote`** — rebuilt on `assertHostawayBookable`; `revalidate = 0`; error
  responses carry `code`, 503 on Hostaway outage, 409 with `blocked: true` on
  unavailable dates.
- **`/api/stays`** — full pagination; Supabase rows intersected with the current
  Hostaway eligible set (no mapping/missing/archived dropped; outage ⇒ 503 or
  empty set from Supabase source, never stale).
- **`/api/stays/[slug]`** — unpublished/inactive slugs 404; Hostaway-archived or
  unmapped ⇒ 404 `LISTING_INELIGIBLE`; Hostaway outage on enrichment ⇒ 503 (no
  Supabase-only fallback for a bookable page).
- **`/api/stays/[slug]/availability`** — Supabase `calendar_blocks` mirror no
  longer trusted (stale mirror risk); fresh Hostaway calendar is the source of
  truth. `validateCalendar` checks **all** requested overnights for missing
  entries before considering any blocked status, so an early blocked night can
  never mask a later calendar gap. For specific-date requests the full
  `assertHostawayBookable` verdict runs last and governs the response — a stay
  extending beyond the 90-day window is validated against a stay-wide calendar
  fetch, never re-derived from the truncated window's `blockedDates`. Numeric
  slugs require a verified published+active Supabase row (absent ⇒ 404,
  outage ⇒ 503 `SUPABASE_UNAVAILABLE`).

## Tests

`scripts/test-bookability.mjs` — pure-policy tests with injected fetchers (no
network, no writes). 27 cases covering eligibility matrix (incl. the 387779
"archived" and 303598 null shapes), date parsing, overnight enumeration
(checkout excluded), calendar gap/block handling, min-stay, capacity, outage,
and invalid-input paths.

## Limitations

- Server-rendered listing pages use the current Vercel deployment URL;
  client-side catalog requests are same-origin.
- Rate limits: `assertHostawayBookable` makes 2 Hostaway calls per validation
  (listing + calendar). Payment routes should surface 429s as 503.
- The 90-day availability window's calendar-gap check requires Hostaway to
  return every day; some accounts omit far-future days — that will surface as
  503 (intentional fail-closed behaviour).
