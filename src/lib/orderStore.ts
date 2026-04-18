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
  /** DoorDash external_delivery_id — used to correlate webhook updates. */
  externalDeliveryId?: string
  deliveryTrackingUrl?: string
  deliveryStatus?: DeliveryStatus
}

const store = new Map<string, KitchenOrder>()

/** Index: externalDeliveryId → sessionId (for DoorDash webhook lookups). */
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

/**
 * Look up an order by its DoorDash externalDeliveryId.
 * Used by the DoorDash webhook handler.
 */
export function getOrderByDeliveryId(externalDeliveryId: string): KitchenOrder | undefined {
  const sessionId = deliveryIndex.get(externalDeliveryId)
  if (!sessionId) return undefined
  return store.get(sessionId)
}

/**
 * Update delivery status after a DoorDash webhook fires.
 */
export function updateOrderDeliveryStatus(
  externalDeliveryId: string,
  status: string,
  trackingUrl?: string,
) {
  const sessionId = deliveryIndex.get(externalDeliveryId)
  if (!sessionId) return

  const order = store.get(sessionId)
  if (!order) return

  const updated: KitchenOrder = {
    ...order,
    deliveryStatus: status as DeliveryStatus,
    ...(trackingUrl ? { deliveryTrackingUrl: trackingUrl } : {}),
  }
  store.set(sessionId, updated)
}

export function isEmpty(): boolean {
  return store.size === 0
}
