/**
 * DEV-ONLY: advance a delivery order through the status steps locally,
 * without needing Uber's sandbox simulation API.
 *
 * POST /api/dev/simulate-delivery
 * Body: { sessionId: string }
 *
 * Returns: { status: string, done: boolean }
 *
 * Blocked in production — returns 404 if NODE_ENV !== 'development'.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getOrder, saveOrder } from '@/lib/orderStore'

const STATUS_PROGRESSION = [
  'created',
  'driver_assigned',
  'picked_up',
  'delivered',
] as const

export async function POST(req: NextRequest) {
  // Hard-block in production
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { sessionId } = await req.json()
  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
  }

  const order = await getOrder(sessionId)
  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }
  if (order.orderType !== 'delivery') {
    return NextResponse.json({ error: 'Not a delivery order' }, { status: 400 })
  }

  const currentStatus = (order.deliveryStatus ?? 'created') as string
  const currentIdx = STATUS_PROGRESSION.indexOf(currentStatus as typeof STATUS_PROGRESSION[number])
  const nextIdx = currentIdx === -1 ? 1 : currentIdx + 1

  if (nextIdx >= STATUS_PROGRESSION.length) {
    return NextResponse.json({ status: currentStatus, done: true })
  }

  const nextStatus = STATUS_PROGRESSION[nextIdx]

  // Simulate a courier location update when driver is assigned
  const updates: Partial<typeof order> = {
    deliveryStatus: nextStatus,
  }
  if (nextStatus === 'driver_assigned') {
    // Place a fake courier near the restaurant
    const restaurantLat = parseFloat(process.env.NEXT_PUBLIC_RESTAURANT_LAT ?? '41.6132')
    const restaurantLng = parseFloat(process.env.NEXT_PUBLIC_RESTAURANT_LNG ?? '-93.8692')
    updates.courierLat = restaurantLat + 0.004
    updates.courierLng = restaurantLng + 0.003
    updates.courierName = 'Test Driver'
    updates.dropoffEtaAt = new Date(Date.now() + 20 * 60 * 1000).toISOString() // 20 min from now
  }
  if (nextStatus === 'picked_up') {
    // Move courier between restaurant and delivery address
    const restaurantLat = parseFloat(process.env.NEXT_PUBLIC_RESTAURANT_LAT ?? '41.6132')
    const restaurantLng = parseFloat(process.env.NEXT_PUBLIC_RESTAURANT_LNG ?? '-93.8692')
    updates.courierLat = restaurantLat + 0.010
    updates.courierLng = restaurantLng + 0.008
    updates.dropoffEtaAt = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 min from now
  }

  await saveOrder({ ...order, ...updates })

  return NextResponse.json({
    status: nextStatus,
    done: nextStatus === 'delivered',
    courierName: updates.courierName,
    courierLat: updates.courierLat,
    courierLng: updates.courierLng,
  })
}
