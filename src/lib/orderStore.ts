import { Redis } from '@upstash/redis'
import type { DeliveryAddress, DeliveryStatus } from './delivery/types'

export interface KitchenOrder {
  sessionId: string
  createdAt: number
  customerEmail: string | undefined
  customerName: string | undefined
  customerPhone: string | undefined
  orderType: string
  status: 'new' | 'active' | 'ready'
  items: { name: string; quantity: number; amount_total: number; comment?: string }[]
  amountTotal: number
  taxTotal?: number
  scheduledFor?: string  // ISO timestamp — set when order placed outside business hours
  deliveryAddress?: DeliveryAddress
  externalDeliveryId?: string
  deliveryTrackingUrl?: string
  deliveryStatus?: DeliveryStatus
  dropoffEtaAt?: string
  courierLat?: number
  courierLng?: number
  courierName?: string
}

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

const TTL = 60 * 60 * 24 * 30 // 30 days
const ORDERS_SET = 'orders:by_time'

const orderKey    = (sessionId: string)  => `order:${sessionId}`
const statusKey   = (sessionId: string)  => `order_status:${sessionId}`
const deliveryKey = (externalId: string) => `delivery:${externalId}`

export async function saveOrder(order: Omit<KitchenOrder, 'status'> & { status?: KitchenOrder['status'] }): Promise<void> {
  (order as KitchenOrder).status ??= 'new'
  const o = order as KitchenOrder

  await Promise.all([
    redis.set(orderKey(o.sessionId), o, { ex: TTL }),
    redis.set(statusKey(o.sessionId), o.status, { ex: TTL }),
    o.externalDeliveryId
      ? redis.set(deliveryKey(o.externalDeliveryId), o.sessionId, { ex: TTL })
      : Promise.resolve(),
    redis.zadd(ORDERS_SET, { score: o.createdAt, member: o.sessionId }),
  ])
}

export async function getOrders(): Promise<KitchenOrder[]> {
  const ids = await redis.zrange(ORDERS_SET, 0, 49, { rev: true }) as string[]
  if (!ids.length) return []
  const orders = await Promise.all(ids.map(id => redis.get<KitchenOrder>(orderKey(id))))
  return orders.filter(Boolean) as KitchenOrder[]
}

export async function getOrder(sessionId: string): Promise<KitchenOrder | undefined> {
  const order = await redis.get<KitchenOrder>(orderKey(sessionId))
  return order ?? undefined
}

export async function getOrderByDeliveryId(externalDeliveryId: string): Promise<KitchenOrder | undefined> {
  const sessionId = await redis.get<string>(deliveryKey(externalDeliveryId))
  if (!sessionId) return undefined
  return getOrder(sessionId)
}

export async function updateOrderDeliveryStatus(
  externalDeliveryId: string,
  status: string,
  trackingUrl?: string,
): Promise<void> {
  const order = await getOrderByDeliveryId(externalDeliveryId)
  if (!order) return
  await redis.set(orderKey(order.sessionId), {
    ...order,
    deliveryStatus: status as DeliveryStatus,
    ...(trackingUrl ? { deliveryTrackingUrl: trackingUrl } : {}),
  }, { ex: TTL })
}

export async function updateOrderCourierLocation(
  externalDeliveryId: string,
  courierLat: number,
  courierLng: number,
  courierName?: string,
  dropoffEtaAt?: string,
): Promise<void> {
  const order = await getOrderByDeliveryId(externalDeliveryId)
  if (!order) return
  await redis.set(orderKey(order.sessionId), {
    ...order,
    courierLat,
    courierLng,
    ...(courierName ? { courierName } : {}),
    ...(dropoffEtaAt ? { dropoffEtaAt } : {}),
  }, { ex: TTL })
}

export async function updateOrderStatus(
  sessionId: string,
  status: KitchenOrder['status'],
): Promise<void> {
  // Write to the dedicated status key first — this works even for orders that
  // arrived via the Stripe-only fallback and were never written to the order key.
  await redis.set(statusKey(sessionId), status, { ex: TTL })

  // Also update the embedded status on the order object if it exists in Redis,
  // so the order key stays consistent for anything that reads it directly.
  const order = await getOrder(sessionId)
  if (order) {
    await redis.set(orderKey(sessionId), { ...order, status }, { ex: TTL })
  }
}

/** Overlay status-key values onto a list of orders (mutates in place). */
export async function overlayStatuses(orders: Array<{ sessionId: string; status?: string }>): Promise<void> {
  if (!orders.length) return
  const keys = orders.map(o => statusKey(o.sessionId))
  const values = await redis.mget<(string | null)[]>(...keys)
  orders.forEach((o, i) => {
    if (values[i]) o.status = values[i] as KitchenOrder['status']
  })
}
