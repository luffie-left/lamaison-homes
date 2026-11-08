/**
 * POST /api/admin/listing-sync — T016 Hostaway → Supabase draft sync.
 *
 * Auth: x-admin-key header must equal ADMIN_SYNC_KEY env (Production-only).
 * Returns the SyncReport. NEVER publishes; never touches published rows
 * (differences flagged for review only). Idempotent on hostaway_listing_id.
 */

import { NextRequest, NextResponse } from "next/server";
import { runListingSync } from "@/lib/listing-sync";
import type { SupabasePropertyRow } from "@/lib/listing-sync";
import type { HostawayListing } from "@/lib/hostaway";
import { hostawayGet } from "@/lib/hostaway";
import type { HostawayListingsResponse } from "@/lib/hostaway";

export const dynamic = "force-dynamic";

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\n/g, "");
const SERVICE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").replace(/\n/g, "");
const ADMIN_KEY = (process.env.ADMIN_SYNC_KEY ?? "").replace(/\n/g, "");

async function fetchAllListings(): Promise<HostawayListing[] | null> {
  const all: HostawayListing[] = [];
  const seen = new Set<number>();
  let offset = 0;
  for (let page = 0; page < 100; page++) {
    let data: HostawayListingsResponse;
    try {
      data = await hostawayGet<HostawayListingsResponse>(
        `/listings?limit=100&offset=${offset}&includeResources=1`,
        0
      );
    } catch {
      return null;
    }
    const rows = data?.result;
    if (!Array.isArray(rows)) return null;
    for (const r of rows) {
      if (!r || typeof r.id !== "number") return null;
      if (seen.has(r.id)) return null;
      seen.add(r.id);
      all.push(r);
    }
    const count = typeof data?.count === "number" ? data.count : undefined;
    if (typeof count === "number" ? all.length >= count : false) break;
    if (rows.length < 100) break;
    offset += 100;
  }
  return all;
}

async function fetchAllRows(): Promise<SupabasePropertyRow[] | null> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/properties?select=*`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

const sbHeaders = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  "Content-Type": "application/json",
  Prefer: "return=minimal",
};

export async function POST(req: NextRequest) {
  if (!ADMIN_KEY) {
    return NextResponse.json({ error: "Sync not configured" }, { status: 503 });
  }
  if (req.headers.get("x-admin-key") !== ADMIN_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const report = await runListingSync({
    fetchListings: fetchAllListings,
    fetchRows: fetchAllRows,
    insertDraft: async (payload) => {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/properties`, {
        method: "POST",
        headers: { ...sbHeaders, Prefer: "resolution=ignore-duplicates,return=minimal" },
        body: JSON.stringify(payload),
      });
      return res.ok;
    },
    updateDraft: async (listingId, payload) => {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/properties?hostaway_listing_id=eq.${listingId}&is_published=eq.false`,
        { method: "PATCH", headers: sbHeaders, body: JSON.stringify(payload) }
      );
      return res.ok;
    },
    deactivateDraft: async (listingId) => {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/properties?hostaway_listing_id=eq.${listingId}&is_published=eq.false`,
        { method: "PATCH", headers: sbHeaders, body: JSON.stringify({ is_active: false, sync_status: "hostaway_inactive" }) }
      );
      return res.ok;
    },
  });

  console.log("[listing-sync]", JSON.stringify({
    imported: report.imported,
    draftsUpdated: report.draftsUpdated,
    publishedFlagged: report.publishedFlagged,
    deactivatedDrafts: report.deactivatedDrafts,
    errors: report.errors,
  }));

  return NextResponse.json(report, { status: report.errors.length ? 207 : 200 });
}
