/**
 * Delivery provider abstraction.
 *
 * Reads DELIVERY_PROVIDER from env ('doordash' | 'uber') and delegates
 * all calls to the appropriate client. The rest of the codebase only
 * imports from this file — never from doordash.ts or uber.ts directly.
 *
 * To switch providers for a new restaurant deployment, change one env var.
 */

import { DeliveryAddress, DeliveryQuote, DeliveryDispatch } from './types'
import { getDoorDashQuote, createDoorDashDelivery, getDoorDashDeliveryStatus } from './doordash'
import { getUberQuote, createUberDelivery, getUberDeliveryStatus } from './uber'
import type { DispatchParams } from './doordash'

function provider(): 'doordash' | 'uber' {
  const p = (process.env.DELIVERY_PROVIDER ?? 'doordash').toLowerCase()
  if (p === 'uber') return 'uber'
  return 'doordash'
}

/** Request a delivery fee quote from the configured provider. */
export async function getDeliveryQuote(
  externalDeliveryId: string,
  dropoffAddress: DeliveryAddress,
  orderValueCents: number,
): Promise<DeliveryQuote> {
  if (provider() === 'uber') {
    return getUberQuote(externalDeliveryId, dropoffAddress, orderValueCents)
  }
  return getDoorDashQuote(externalDeliveryId, dropoffAddress, orderValueCents)
}

/** Dispatch a driver after payment is confirmed. */
export async function createDelivery(params: DispatchParams): Promise<DeliveryDispatch> {
  if (provider() === 'uber') {
    return createUberDelivery(params)
  }
  return createDoorDashDelivery(params)
}

/** Fetch the latest status of a live delivery. */
export async function getDeliveryStatus(
  deliveryId: string,
): Promise<{ status: string; trackingUrl: string }> {
  if (provider() === 'uber') {
    return getUberDeliveryStatus(deliveryId)
  }
  return getDoorDashDeliveryStatus(deliveryId)
}

export type { DispatchParams }
