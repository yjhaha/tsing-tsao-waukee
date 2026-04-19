/**
 * GET /api/orders/[sessionId]/tracking
 *
 * Live-tracking proxy: calls Uber Direct (or DoorDash) in real-time to get the
 * latest courier location and ETA, then writes it back to the order store so
 * the kitchen page and webhook-based data stay in sync.
 *
 * The success page polls this every 15 s while the delivery is active.
 * When the delivery is complete (delivered / cancelled / failed) polling stops.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getOrder, updateOrderDeliveryStatus, updateOrderCourierLocation } from '@/lib/orderStore'
import { getDeliveryStatus } from '@/lib/delivery/provider'

export const runtime = 'nodejs'

// Statuses where live tracking is still relevant
const ACTIVE_STATUSES = new Set(['created', 'driver_assigned', 'picked_up'])

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params
  const order = getOrder(sessionId)

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  if (order.orderType !== 'delivery' || !order.externalDeliveryId) {
    return NextResponse.json({ error: 'Not a delivery order' }, { status: 400 })
  }

  // If already in a terminal state, just return what we have — no need to hit the provider
  if (order.deliveryStatus && !ACTIVE_STATUSES.has(order.deliveryStatus)) {
    return NextResponse.json({
      status: order.deliveryStatus,
      trackingUrl: order.deliveryTrackingUrl ?? null,
      courierLat: order.courierLat ?? null,
      courierLng: order.courierLng ?? null,
      courierName: order.courierName ?? null,
      dropoffEtaAt: order.dropoffEtaAt ?? null,
      terminal: true,
    })
  }

  try {
    const live = await getDeliveryStatus(order.externalDeliveryId)

    // Write updates back to the store (keeps kitchen page in sync too)
    if (live.status !== order.deliveryStatus) {
      updateOrderDeliveryStatus(order.externalDeliveryId, live.status, live.trackingUrl)
    }
    if (live.courierLat && live.courierLng) {
      updateOrderCourierLocation(
        order.externalDeliveryId,
        live.courierLat,
        live.courierLng,
        live.courierName,
        live.dropoffEtaAt,
      )
    }

    return NextResponse.json({
      status: live.status,
      trackingUrl: live.trackingUrl,
      courierLat: live.courierLat ?? null,
      courierLng: live.courierLng ?? null,
      courierName: live.courierName ?? null,
      dropoffEtaAt: live.dropoffEtaAt ?? null,
      terminal: !ACTIVE_STATUSES.has(live.status),
    })
  } catch (err) {
    console.error('[tracking] Provider fetch failed:', err)
    // Return cached store data so the UI doesn't break if the provider is slow
    return NextResponse.json({
      status: order.deliveryStatus ?? 'created',
      trackingUrl: order.deliveryTrackingUrl ?? null,
      courierLat: order.courierLat ?? null,
      courierLng: order.courierLng ?? null,
      courierName: order.courierName ?? null,
      dropoffEtaAt: order.dropoffEtaAt ?? null,
      terminal: false,
    })
  }
}
