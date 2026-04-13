export interface KitchenOrder {
  sessionId: string
  createdAt: number
  customerEmail: string | undefined
  customerName: string | undefined
  customerPhone: string | undefined
  orderType: string
  items: { name: string; quantity: number; amount_total: number }[]
  amountTotal: number
}

const store = new Map<string, KitchenOrder>()

export function saveOrder(order: KitchenOrder) {
  store.set(order.sessionId, order)
}

export function getOrders(): KitchenOrder[] {
  return Array.from(store.values()).sort((a, b) => b.createdAt - a.createdAt)
}

export function getOrder(sessionId: string): KitchenOrder | undefined {
  return store.get(sessionId)
}

export function isEmpty(): boolean {
  return store.size === 0
}
