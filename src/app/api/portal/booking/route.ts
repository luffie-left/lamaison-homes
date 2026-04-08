import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token) return NextResponse.json({ error: "token required" }, { status: 400 });

  const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\n/g, "");
  const SERVICE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").replace(/\n/g, "");

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/leads?portal_token=eq.${encodeURIComponent(token)}&select=id,name,email,reference,property_name,listing_id,check_in,check_out,nights,num_guests,total_amount,status,created_at`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
  );

  if (!res.ok) return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  const rows = await res.json();
  if (!Array.isArray(rows) || rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ booking: rows[0] });
}
