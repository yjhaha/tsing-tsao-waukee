import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import type { DeliveryAddress, DeliveryQuote } from '@/lib/delivery/types'
import { isOpen } from '@/lib/businessHours'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia',
})

export interface CheckoutItem {
  id: string
  name: string
  price: number
  quantity: number
  image?: string
  comment?: string
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      items,
      orderMode,
      deliveryAddress,
      deliveryQuote,
      tipCents,
      scheduledFor,
    }: {
      items: CheckoutItem[]
      orderMode?: 'pickup' | 'delivery'
      deliveryAddress?: DeliveryAddress
      deliveryQuote?: DeliveryQuote
      tipCents?: number
      scheduledFor?: string // ISO timestamp — provided when placing a scheduled order
    } = body

    if (!items?.length) {
      return NextResponse.json({ error: 'No items in cart' }, { status: 400 })
    }

    // Enforce business hours server-side; allow through if customer explicitly scheduled
    if (!scheduledFor && !isOpen()) {
      return NextResponse.json({ error: 'outside_hours' }, { status: 422 })
    }

    const isDelivery = orderMode === 'delivery'

    // Validate delivery prerequisites
    if (isDelivery && (!deliveryAddress || !deliveryQuote)) {
      return NextResponse.json(
        { error: 'Delivery address and quote are required for delivery orders.' },
        { status: 400 },
      )
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'

    // ── Build line items ─────────────────────────────────────────────────────
    const lineItems: NonNullable<Stripe.Checkout.SessionCreateParams['line_items']> = items.map(item => ({
      quantity: item.quantity,
      price_data: {
        currency: 'usd',
        unit_amount: Math.round(item.price * 100),
        tax_behavior: 'exclusive',
        product_data: {
          name: item.name,
          ...(item.image ? { images: [`${baseUrl}${item.image}`] } : {}),
        },
      },
    }))

    if (isDelivery && deliveryQuote) {
      lineItems.push({
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: deliveryQuote.customerFeeCents,
          tax_behavior: 'exclusive',
          product_data: {
            name: 'Delivery Fee',
            description: 'Direct delivery — no third-party commission',
          },
        },
      })
    }

    if (isDelivery && tipCents && tipCents > 0) {
      lineItems.push({
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: tipCents,
          tax_behavior: 'exclusive',
          // txcd_92010001 = Gratuity/Tips — excluded from tax by Stripe Tax
          product_data: { name: 'Driver Tip', tax_code: 'txcd_92010001' },
        },
      })
    }

    // ── Metadata for the webhook ─────────────────────────────────────────────
    const metadata: Record<string, string> = {
      order_type: isDelivery ? 'delivery' : 'pickup',
    }

    if (isDelivery && deliveryAddress) {
      metadata['delivery_street'] = deliveryAddress.street
      metadata['delivery_unit'] = deliveryAddress.unit ?? ''
      metadata['delivery_city'] = deliveryAddress.city
      metadata['delivery_state'] = deliveryAddress.state
      metadata['delivery_zip'] = deliveryAddress.zip
    }

    if (isDelivery && deliveryQuote) {
      metadata['delivery_external_id'] = deliveryQuote.externalDeliveryId
      metadata['delivery_customer_fee_cents'] = String(deliveryQuote.customerFeeCents)
      metadata['delivery_restaurant_fee_cents'] = String(deliveryQuote.restaurantFeeCents)
    }

    if (isDelivery && tipCents && tipCents > 0) {
      metadata['tip_cents'] = String(tipCents)
    }

    if (scheduledFor) {
      metadata['scheduled_for'] = scheduledFor
    }

    // Store per-item comments as {"0":"no peanuts","2":"extra spicy"} — index matches food items array
    const comments: Record<string, string> = {}
    items.forEach((item, idx) => { if (item.comment) comments[idx] = item.comment })
    if (Object.keys(comments).length > 0) {
      metadata['item_comments'] = JSON.stringify(comments)
    }

    // ── Create Stripe session ────────────────────────────────────────────────
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: lineItems,
      automatic_tax: { enabled: true },
      metadata,
      success_url: `${baseUrl}/order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/order/cancel`,
      phone_number_collection: { enabled: true },
      // Collect shipping address for delivery orders (for display purposes;
      // the real address is already in metadata from our validated quote)
      ...(isDelivery
        ? {
            shipping_address_collection: {
              allowed_countries: ['US'],
            },
          }
        : {}),
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[checkout]', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
