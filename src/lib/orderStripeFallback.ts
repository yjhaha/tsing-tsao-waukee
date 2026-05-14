import Stripe from 'stripe'
import type { KitchenOrder } from './orderStore'

/**
 * Build a KitchenOrder from a Stripe Checkout Session. Used to surface paid
 * orders when the webhook didn't manage to persist them to Redis (e.g. Redis
 * was at its quota, or transient failure). Returns the order in 'new' status —
 * callers should overlay the dedicated status key on top if available.
 */
export function sessionToKitchenOrder(s: Stripe.Checkout.Session): KitchenOrder {
  const meta = s.metadata ?? {}
  const orderType = meta.order_type ?? 'pickup'

  const deliveryAddress =
    orderType === 'delivery' && meta.delivery_street
      ? {
          street: meta.delivery_street,
          unit: meta.delivery_unit || undefined,
          city: meta.delivery_city ?? '',
          state: meta.delivery_state ?? '',
          zip: meta.delivery_zip ?? '',
        }
      : undefined

  let itemComments: Record<string, string> = {}
  try {
    if (meta.item_comments) itemComments = JSON.parse(meta.item_comments)
  } catch { /* ignore malformed */ }

  const items = (s.line_items?.data ?? [])
    .filter(li => li.description !== 'Delivery Fee' && li.description !== 'Driver Tip')
    .map((li, idx) => ({
      name: li.description ?? 'Item',
      quantity: li.quantity ?? 1,
      amount_total: li.amount_total,
      comment: itemComments[String(idx)] || undefined,
    }))

  const taxTotal = s.total_details?.amount_tax ?? 0

  return {
    sessionId: s.id,
    createdAt: s.created,
    customerEmail: s.customer_details?.email ?? undefined,
    customerName: s.customer_details?.name ?? undefined,
    customerPhone: s.customer_details?.phone ?? undefined,
    orderType,
    status: 'new',
    items,
    amountTotal: s.amount_total ?? 0,
    taxTotal: taxTotal > 0 ? taxTotal : undefined,
    scheduledFor: meta.scheduled_for || undefined,
    deliveryAddress,
    externalDeliveryId: meta.delivery_external_id || undefined,
    deliveryStatus: orderType === 'delivery' ? 'created' : undefined,
  }
}

/**
 * Fetch a paid Checkout Session by id and convert it to a KitchenOrder.
 * Returns null if the session doesn't exist, isn't paid, or the API call
 * throws — callers should treat null as "no fallback available".
 */
export async function buildOrderFromStripeSession(
  stripe: Stripe,
  sessionId: string,
): Promise<KitchenOrder | null> {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items'],
    })
    if (session.payment_status !== 'paid') return null
    return sessionToKitchenOrder(session)
  } catch (err) {
    console.error(`[orderStripeFallback] retrieve(${sessionId}) failed:`, err)
    return null
  }
}
