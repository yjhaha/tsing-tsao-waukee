import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getOrders } from '@/lib/orderStore'

// Never cache this route — it must always return live data
export const dynamic = 'force-dynamic'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia',
})

export async function GET() {
  const since = Math.floor(Date.now() / 1000) - 86400 // last 24 h

  try {
    // ── 1. Pull from in-memory store (populated by webhook) ─────────────────
    // The store has full delivery metadata (address, tracking URL, status).
    const storeOrders = await getOrders()
    const storeIds = new Set(storeOrders.map(o => o.sessionId))

    // ── 2. Also fetch from Stripe for any paid orders that the webhook
    //       hasn't processed yet (e.g. cold start race, missed webhook). ─────
    const sessions = await stripe.checkout.sessions.list({
      limit: 50,
      expand: ['data.line_items'],
      created: { gte: since },
    })

    const stripeOnlyOrders = []
    for (const s of sessions.data) {
      if (s.payment_status !== 'paid') continue
      if (storeIds.has(s.id)) continue // already in store

      const meta = s.metadata ?? {}
      const orderType = meta.order_type ?? 'pickup'

      // Reconstruct delivery address from metadata if present
      const deliveryAddress =
        orderType === 'delivery' && meta.delivery_street
          ? {
              street: meta.delivery_street,
              unit: meta.delivery_unit || undefined,
              city: meta.delivery_city ?? '',
              state: meta.delivery_state ?? '',
              zip: meta.delivery_zip ?? '',
            }
          : undefined

      stripeOnlyOrders.push({
        sessionId: s.id,
        createdAt: s.created,
        customerEmail: s.customer_details?.email ?? undefined,
        customerName: s.customer_details?.name ?? undefined,
        customerPhone: s.customer_details?.phone ?? undefined,
        orderType,
        items: (s.line_items?.data ?? [])
          .filter(li => li.description !== 'Delivery Fee' && li.description !== 'Driver Tip')
          .map(li => ({
            name: li.description ?? 'Item',
            quantity: li.quantity ?? 1,
            amount_total: li.amount_total,
          })),
        amountTotal: s.amount_total ?? 0,
        deliveryAddress,
        deliveryTrackingUrl: undefined,
        deliveryStatus: orderType === 'delivery' ? 'created' : undefined,
      })
    }

    // Merge: store orders first (they have richer data), then any Stripe-only extras
    const allOrders = [...storeOrders, ...stripeOnlyOrders]
    allOrders.sort((a, b) => b.createdAt - a.createdAt)

    return NextResponse.json({ orders: allOrders })
  } catch (err) {
    console.error('[orders] Failed to fetch:', err)
    return NextResponse.json({ orders: [] }, { status: 500 })
  }
}
