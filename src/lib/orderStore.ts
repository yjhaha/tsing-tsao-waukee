import { DeliveryAddress, DeliveryStatus } from './delivery/types'

export interface KitchenOrder {
  sessionId: string
  createdAt: number
  customerEmail: string | undefined
  customerName: string | undefined
  customerPhone: string | undefined
  orderType: string  // 'pickup' | 'delivery'
  items: { name: string; quantity: number; amount_total: number }[]
  amountTotal: number
  // ── Delivery fields (only set when orderType === 'delivery') ──────────────
  deliveryAddress?: DeliveryAddress
  /** Provider delivery ID — used to correlate webhook updates. */
  externalDeliveryId?: string
  deliveryTrackingUrl?: string
  deliveryStatus?: DeliveryStatus
  /** ISO-8601 estimated dropoff time from the provider. */
  dropoffEtaAt?: string
  /** Live courier latitude (updated via webhook or polling). */
  courierLat?: number
  /** Live courier longitude (updated via webhook or polling). */
  courierLng?: number
  courierName?: string
}

const store = new Map<string, KitchenOrder>()

/** Index: externalDeliveryId → sessionId (for webhook lookups). */
const deliveryIndex = new Map<string, string>()

export function saveOrder(order: KitchenOrder) {
  store.set(order.sessionId, order)
  if (order.externalDeliveryId) {
    deliveryIndex.set(order.externalDeliveryId, order.sessionId)
  }
}

export function getOrders(): KitchenOrder[] {
  return Array.from(store.values()).sort((a, b) => b.createdAt - a.createdAt)
}

export function getOrder(sessionId: string): KitchenOrder | undefined {
  return store.get(sessionId)
}

/** Look up an order by its provider externalDeliveryId (for webhook handlers). */
export function getOrderByDeliveryId(externalDeliveryId: string): KitchenOrder | undefined {
  const sessionId = deliveryIndex.get(externalDeliveryId)
  if (!sessionId) return undefined
  return store.get(sessionId)
}

/** Update delivery status after a webhook fires. */
export function updateOrderDeliveryStatus(
  externalDeliveryId: string,
  status: string,
  trackingUrl?: string,
) {
  const sessionId = deliveryIndex.get(externalDeliveryId)
  if (!sessionId) return
  const order = store.get(sessionId)
  if (!order) return
  store.set(sessionId, {
    ...order,
    deliveryStatus: status as DeliveryStatus,
    ...(trackingUrl ? { deliveryTrackingUrl: trackingUrl } : {}),
  })
}

/** Update live courier location + ETA (from webhook or polling). */
export function updateOrderCourierLocation(
  externalDeliveryId: string,
  courierLat: number,
  courierLng: number,
  courierName?: string,
  dropoffEtaAt?: string,
) {
  const sessionId = deliveryIndex.get(externalDeliveryId)
  if (!sessionId) return
  const order = store.get(sessionId)
  if (!order) return
  store.set(sessionId, {
    ...order,
    courierLat,
    courierLng,
    ...(courierName ? { courierName } : {}),
    ...(dropoffEtaAt ? { dropoffEtaAt } : {}),
  })
}

export function isEmpty(): boolean {
  return store.size === 0
}
