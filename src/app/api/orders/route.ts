import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getOrders, overlayStatuses, type KitchenOrder } from '@/lib/orderStore'
import { sessionToKitchenOrder } from '@/lib/orderStripeFallback'

// Never cache this route — it must always return live data
export const dynamic = 'force-dynamic'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia',
})

export async function GET(req: NextRequest) {
  const pin = req.nextUrl.searchParams.get('pin')
  if (!pin || pin !== process.env.NEXT_PUBLIC_KITCHEN_PIN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const since = Math.floor(Date.now() / 1000) - 86400 // last 24 h

  // ── 1. Pull from Redis store (populated by webhook). If Redis is unhealthy,
  //       continue with an empty store list — the Stripe fallback below is the
  //       safety net that ensures the kitchen never goes blind on paid orders.
  let storeOrders: KitchenOrder[] = []
  try {
    storeOrders = await getOrders()
  } catch (err) {
    console.error('[orders] Redis getOrders failed; falling back to Stripe-only view:', err)
  }
  const storeIds = new Set(storeOrders.map(o => o.sessionId))

  // ── 2. Always fetch from Stripe so paid orders are visible even when the
  //       webhook (or Redis) failed at the time of payment.
  const stripeOnlyOrders: KitchenOrder[] = []
  try {
    const sessions = await stripe.checkout.sessions.list({
      limit: 50,
      expand: ['data.line_items'],
      created: { gte: since },
    })

    for (const s of sessions.data) {
      if (s.payment_status !== 'paid') continue
      if (storeIds.has(s.id)) continue // already in store
      stripeOnlyOrders.push(sessionToKitchenOrder(s))
    }
  } catch (err) {
    console.error('[orders] Stripe fallback fetch failed:', err)
    // If both Redis and Stripe failed, return whatever we got from Redis (possibly empty).
    if (storeOrders.length === 0) {
      return NextResponse.json({ orders: [], error: 'upstream_unavailable' }, { status: 503 })
    }
  }

  // Merge: store orders first (they have richer data), then any Stripe-only extras
  const allOrders = [...storeOrders, ...stripeOnlyOrders]
  allOrders.sort((a, b) => b.createdAt - a.createdAt)

  // Overlay the dedicated status keys on top — best-effort, won't fail the response
  try {
    await overlayStatuses(allOrders)
  } catch (err) {
    console.error('[orders] overlayStatuses failed; serving without status overlay:', err)
  }

  return NextResponse.json({ orders: allOrders })
}
