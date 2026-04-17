/**
 * GET /api/voice/calls
 *
 * Returns paginated call logs from Supabase voice_calls table.
 * Query params:
 *   language  — 'en' | 'zh'
 *   intent    — 'owner_enquiry' | 'guest_support' | 'booking' | 'other'
 *   from      — ISO date string (inclusive)
 *   to        — ISO date string (inclusive)
 *   page      — page number (default 1)
 *   limit     — rows per page (default 20, max 100)
 *   id        — single call ID for full detail
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
)

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl

  const id = searchParams.get('id')
  if (id) {
    const { data, error } = await supabase
      .from('voice_calls')
      .select('*')
      .eq('id', id)
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 404 })
    return NextResponse.json(data)
  }

  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)))
  const offset = (page - 1) * limit

  let query = supabase
    .from('voice_calls')
    .select('*', { count: 'exact' })
    .order('started_at', { ascending: false })
    .range(offset, offset + limit - 1)

  const language = searchParams.get('language')
  if (language) query = query.eq('language_detected', language)

  const intent = searchParams.get('intent')
  if (intent) query = query.eq('intent', intent)

  const from = searchParams.get('from')
  if (from) query = query.gte('started_at', new Date(from).toISOString())

  const to = searchParams.get('to')
  if (to) query = query.lte('started_at', new Date(to).toISOString())

  const { data, error, count } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    calls: data,
    total: count ?? 0,
    page,
    limit,
    pages: Math.ceil((count ?? 0) / limit),
  })
}
