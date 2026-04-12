import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getOrders, saveOrder, isEmpty } from '@/lib/orderStore'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia',
})

export async function GET() {
  // On cold start the in-memory store is empty — seed from Stripe
  if (isEmpty()) {
    const since = Math.floor(Date.now() / 1000) - 86400 // last 24 h
    try {
      const sessions = await stripe.checkout.sessions.list({
        limit: 50,
        expand: ['data.line_items'],
        created: { gte: since },
      })

      for (const s of sessions.data) {
        if (s.payment_status !== 'paid') continue
        const orderTypeField = s.custom_fields?.find(f => f.key === 'order_type')
        saveOrder({
          sessionId: s.id,
          createdAt: s.created,
          customerEmail: s.customer_details?.email ?? undefined,
          customerName: s.customer_details?.name ?? undefined,
          customerPhone: s.customer_details?.phone ?? undefined,
          orderType: orderTypeField?.dropdown?.value ?? 'pickup',
          items: (s.line_items?.data ?? []).map(li => ({
            name: li.description ?? 'Item',
            quantity: li.quantity ?? 1,
            amount_total: li.amount_total,
          })),
          amountTotal: s.amount_total ?? 0,
        })
      }
    } catch (err) {
      console.error('[orders] Failed to seed from Stripe:', err)
    }
  }

  return NextResponse.json({ orders: getOrders() })
}
