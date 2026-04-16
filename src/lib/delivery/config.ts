// ── Per-restaurant delivery configuration ─────────────────────────────────────
//
// All values are sourced from environment variables so the same codebase can
// power any Course Studio restaurant without code changes — just a different
// .env.local per deployment.

export interface RestaurantDeliveryConfig {
  restaurantName: string
  address: {
    street: string
    city: string
    state: string
    zip: string
    /** Decimal latitude — used for Haversine radius check. */
    lat: number
    /** Decimal longitude — used for Haversine radius check. */
    lng: number
  }
  phone: string
  /** Maximum straight-line delivery radius in miles. */
  deliveryRadiusMiles: number
  /** Amount charged to the customer in cents (e.g. 500 = $5.00). */
  customerFeeCents: number
  /** Amount the restaurant absorbs in cents (e.g. 200 = $2.00). */
  restaurantFeeCents: number
}

/**
 * Returns the delivery config for the current restaurant deployment.
 * Defaults below reflect Tsing Tsao Waukee (IA).
 */
export function getDeliveryConfig(): RestaurantDeliveryConfig {
  return {
    restaurantName: process.env.RESTAURANT_NAME ?? 'Tsing Tsao Waukee',
    address: {
      street: process.env.RESTAURANT_ADDRESS_STREET ?? '905 University Ave',
      city: process.env.RESTAURANT_ADDRESS_CITY ?? 'Waukee',
      state: process.env.RESTAURANT_ADDRESS_STATE ?? 'IA',
      zip: process.env.RESTAURANT_ADDRESS_ZIP ?? '50263',
      lat: parseFloat(process.env.RESTAURANT_LAT ?? '41.6082'),
      lng: parseFloat(process.env.RESTAURANT_LNG ?? '-93.9946'),
    },
    phone: process.env.RESTAURANT_PHONE ?? '(515) 830-9600',
    deliveryRadiusMiles: parseFloat(process.env.DELIVERY_RADIUS_MILES ?? '5'),
    customerFeeCents: parseInt(process.env.DELIVERY_FEE_CUSTOMER_CENTS ?? '500', 10),
    restaurantFeeCents: parseInt(process.env.DELIVERY_FEE_RESTAURANT_CENTS ?? '200', 10),
  }
}
