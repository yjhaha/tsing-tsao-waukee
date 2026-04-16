// ── Shared delivery types ─────────────────────────────────────────────────────

export interface DeliveryAddress {
  street: string
  unit?: string
  city: string
  state: string
  zip: string
}

/** Quote returned from the delivery provider (DoorDash Drive or Uber Direct). */
export interface DeliveryQuote {
  /** DoorDash external_delivery_id or Uber quote_id — used when creating the delivery. */
  externalDeliveryId: string
  /** Total provider fee in cents (e.g. 700 = $7.00). */
  providerFeeCents: number
  /** Amount charged to the customer in cents (e.g. 500 = $5.00). */
  customerFeeCents: number
  /** Amount absorbed by the restaurant in cents (e.g. 200 = $2.00). */
  restaurantFeeCents: number
  /** ISO-8601 — when this quote expires and can no longer be accepted. */
  expiresAt?: string
  /** Estimated minutes to pickup (optional, from provider). */
  pickupEtaMinutes?: number
  /** Estimated minutes to dropoff (optional, from provider). */
  dropoffEtaMinutes?: number
}

/** Confirmed delivery created after payment. */
export interface DeliveryDispatch {
  externalDeliveryId: string
  trackingUrl: string
  status: DeliveryStatus
}

export type DeliveryStatus =
  | 'created'
  | 'driver_assigned'
  | 'picked_up'
  | 'delivered'
  | 'cancelled'
  | 'failed'
