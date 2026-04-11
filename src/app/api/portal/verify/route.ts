import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\n/g, "");
const SERVICE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").replace(/\n/g, "");

// In-memory rate limiter: max 5 attempts per IP per hour
const attempts = new Map<string, { count: number; resetAt: number }>();

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const now = Date.now();

  const existing = attempts.get(ip);
  if (existing && existing.resetAt > now && existing.count >= 5) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again in an hour." },
      { status: 429 }
    );
  }
  const entry =
    existing && existing.resetAt > now
      ? { count: existing.count + 1, resetAt: existing.resetAt }
      : { count: 1, resetAt: now + 3_600_000 };
  attempts.set(ip, entry);

  let token: string, email: string;
  try {
    const body = await req.json();
    token = body.token;
    email = body.email;
  } catch {
    return NextResponse.json({ verified: false, error: "Invalid request" }, { status: 400 });
  }

  if (!token || !email) {
    return NextResponse.json({ verified: false, error: "Token and email required" }, { status: 400 });
  }

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/leads?portal_token=eq.${encodeURIComponent(token)}&select=id,email,reference,name&limit=1`,
    { headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` } }
  );

  if (!res.ok) {
    return NextResponse.json({ verified: false }, { status: 500 });
  }

  const rows = await res.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ verified: false });
  }

  const lead = rows[0];
  if (lead.email.toLowerCase() !== email.toLowerCase().trim()) {
    return NextResponse.json({ verified: false });
  }

  return NextResponse.json({ verified: true, reference: lead.reference, name: lead.name });
}
