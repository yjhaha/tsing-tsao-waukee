/**
 * POST /api/delivery/quote
 *
 * Validates a delivery address (radius check + DoorDash availability) and
 * returns a fee quote.  Called from the cart page before Stripe checkout.
 *
 * Request body:
 *   { address: DeliveryAddress; orderValueCents: number; sessionNonce: string }
 *
 * Response (200):
 *   { quote: DeliveryQuote }
 *
 * Response (422):
 *   { error: string; code: 'OUT_OF_RANGE' | 'UNAVAILABLE' | 'INVALID_ADDRESS' }
 */

import { NextRequest, NextResponse } from 'next/server'
import { DeliveryAddress } from '@/lib/delivery/types'
import { getDeliveryConfig } from '@/lib/delivery/config'
import { haversineDistanceMiles, geocodeAddress } from '@/lib/delivery/haversine'
import { getDoorDashQuote } from '@/lib/delivery/doordash'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { address, orderValueCents, sessionNonce } = body as {
      address: DeliveryAddress
      orderValueCents: number
      sessionNonce: string
    }

    if (!address?.street || !address?.city || !address?.state || !address?.zip) {
      return NextResponse.json(
        { error: 'Please fill in a complete delivery address.', code: 'INVALID_ADDRESS' },
        { status: 422 },
      )
    }

    const config = getDeliveryConfig()

    // ── 1. Geocode customer address & radius check ────────────────────────────
    const fullAddress = [address.street, address.unit, `${address.city}, ${address.state} ${address.zip}`]
      .filter(Boolean)
      .join(', ')

    const coords = await geocodeAddress(fullAddress)

    if (coords) {
      const distanceMiles = haversineDistanceMiles(
        config.address.lat,
        config.address.lng,
        coords[0],
        coords[1],
      )

      if (distanceMiles > config.deliveryRadiusMiles) {
        return NextResponse.json(
          {
            error: `Sorry, we only deliver within ${config.deliveryRadiusMiles} miles of the restaurant. Your address is approximately ${distanceMiles.toFixed(1)} miles away.`,
            code: 'OUT_OF_RANGE',
            distanceMiles: parseFloat(distanceMiles.toFixed(2)),
          },
          { status: 422 },
        )
      }
    }
    // If geocoding fails we continue — DoorDash will reject invalid addresses

    // ── 2. Get DoorDash quote ─────────────────────────────────────────────────
    // Use a stable external delivery ID derived from the nonce
    const externalDeliveryId = `cs_${sessionNonce}`

    const quote = await getDoorDashQuote(externalDeliveryId, address, orderValueCents ?? 0)

    return NextResponse.json({ quote })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[delivery/quote]', message)

    // DoorDash returns specific error messages for unsupported areas
    if (message.includes('422') || message.includes('outside') || message.includes('serviceable')) {
      return NextResponse.json(
        { error: 'Delivery is not available to that address.', code: 'UNAVAILABLE' },
        { status: 422 },
      )
    }

    return NextResponse.json({ error: 'Could not fetch delivery quote. Please try again.', code: 'UNAVAILABLE' }, { status: 500 })
  }
}
