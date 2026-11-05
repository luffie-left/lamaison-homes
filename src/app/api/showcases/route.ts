/** GET /api/showcases — only cards whose underlying property passed Hostaway eligibility. */
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\n/g, '').trim()
const SERVICE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').replace(/\n/g, '').trim()

type Card = { id: string; property_id: string; hostaway_listing_id: number; display_name: string | null; hero_image_url: string }
type Stay = { slug: string; listingId?: number; title: string; heroImage: string; [key: string]: unknown }

export async function GET(request: NextRequest) {
  if (!SUPABASE_URL || !SERVICE_KEY) return NextResponse.json([])
  try {
    const [inventory, cards] = await Promise.all([
      fetch(new URL('/api/stays', request.url), { cache: 'no-store' }),
      fetch(`${SUPABASE_URL}/rest/v1/property_showcases?is_active=eq.true&select=id,property_id,hostaway_listing_id,display_name,hero_image_url&order=sort_order`, {
        headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
        cache: 'no-store',
      }),
    ])
    // Never return stale showcase cards if the authoritative eligibility lookup fails.
    if (!inventory.ok || !cards.ok) return NextResponse.json([])
    const response = await inventory.json()
    const stays: Stay[] = Array.isArray(response.stays) ? response.stays : []
    const raw: Card[] = await cards.json()
    if (!Array.isArray(raw)) return NextResponse.json([])
    const byId = new Map(stays.filter((s) => s.listingId).map((s) => [s.listingId, s]))
    return NextResponse.json(raw.flatMap((card) => {
      const property = byId.get(card.hostaway_listing_id)
      if (!property) return []
      return [{ ...property, id: card.id, title: card.display_name ?? property.title, heroImage: card.hero_image_url || property.heroImage }]
    }))
  } catch (error) {
    console.error('[/api/showcases] Failed closed:', error)
    return NextResponse.json([])
  }
}
