import { Redis } from '@upstash/redis'
import type { DeliveryAddress, DeliveryStatus } from './delivery/types'

export interface KitchenOrder {
  sessionId: string
  createdAt: number
  customerEmail: string | undefined
  customerName: string | undefined
  customerPhone: string | undefined
  orderType: string
  items: { name: string; quantity: number; amount_total: number }[]
  amountTotal: number
  taxTotal?: number
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
const deliveryKey = (externalId: string) => `delivery:${externalId}`

export async function saveOrder(order: KitchenOrder): Promise<void> {
  await Promise.all([
    redis.set(orderKey(order.sessionId), order, { ex: TTL }),
    order.externalDeliveryId
      ? redis.set(deliveryKey(order.externalDeliveryId), order.sessionId, { ex: TTL })
      : Promise.resolve(),
    redis.zadd(ORDERS_SET, { score: order.createdAt, member: order.sessionId }),
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
