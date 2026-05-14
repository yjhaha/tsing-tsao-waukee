/**
 * GET /api/orders/[sessionId]
 *
 * Returns order details for the success page, including delivery tracking info
 * and live courier position (updated by webhooks).
 *
 * Falls back to fetching directly from Stripe when the webhook hasn't yet
 * persisted the order — keeps the customer success page from 404-ing in the
 * gap between payment and webhook (or when the webhook failed entirely, e.g.
 * during a Redis quota outage).
 */

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getOrder } from '@/lib/orderStore'
import { buildOrderFromStripeSession } from '@/lib/orderStripeFallback'

export const runtime = 'nodejs'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia',
})

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params

  let order = await getOrder(sessionId).catch(err => {
    console.error(`[order/${sessionId}] Redis lookup failed:`, err)
    return undefined
  })

  if (!order) {
    const fallback = await buildOrderFromStripeSession(stripe, sessionId)
    if (fallback) order = fallback
  }

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  return NextResponse.json({
    sessionId: order.sessionId,
    orderType: order.orderType,
    amountTotal: order.amountTotal,
    customerName: order.customerName,
    // Delivery fields
    deliveryAddress: order.deliveryAddress ?? null,
    deliveryTrackingUrl: order.deliveryTrackingUrl ?? null,
    deliveryStatus: order.deliveryStatus ?? null,
    externalDeliveryId: order.externalDeliveryId ?? null,
    // Live courier position (populated by webhooks)
    courierLat: order.courierLat ?? null,
    courierLng: order.courierLng ?? null,
    courierName: order.courierName ?? null,
    dropoffEtaAt: order.dropoffEtaAt ?? null,
  })
}
