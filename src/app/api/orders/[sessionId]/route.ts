/**
 * GET /api/orders/[sessionId]
 *
 * Returns order details for the success page, including delivery tracking info
 * and live courier position (updated by webhooks).
 *
 * Returns 404 while the webhook hasn't fired yet — client should poll with back-off.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getOrder } from '@/lib/orderStore'

export const runtime = 'nodejs'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params
  const order = await getOrder(sessionId)

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
