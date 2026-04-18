/**
 * GET /api/orders/[sessionId]
 *
 * Returns order details for the success page, including delivery tracking info.
 * Only returns the subset of fields safe to expose to the customer.
 *
 * Returns 404 if the order hasn't been processed yet (webhook pending) so the
 * client can poll with exponential back-off.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getOrder } from '@/lib/orderStore'

export const runtime = 'nodejs'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params
  const order = getOrder(sessionId)

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  return NextResponse.json({
    sessionId: order.sessionId,
    orderType: order.orderType,
    amountTotal: order.amountTotal,
    customerName: order.customerName,
    // Delivery-specific fields
    deliveryAddress: order.deliveryAddress ?? null,
    deliveryTrackingUrl: order.deliveryTrackingUrl ?? null,
    deliveryStatus: order.deliveryStatus ?? null,
  })
}
