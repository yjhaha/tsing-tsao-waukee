import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import type { DeliveryAddress, DeliveryQuote } from '@/lib/delivery/types'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia',
})

export interface CheckoutItem {
  id: string
  name: string
  price: number
  quantity: number
  image?: string
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      items,
      orderMode,
      deliveryAddress,
      deliveryQuote,
    }: {
      items: CheckoutItem[]
      orderMode?: 'pickup' | 'delivery'
      deliveryAddress?: DeliveryAddress
      deliveryQuote?: DeliveryQuote
    } = body

    if (!items?.length) {
      return NextResponse.json({ error: 'No items in cart' }, { status: 400 })
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
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map(item => ({
      quantity: item.quantity,
      price_data: {
        currency: 'usd',
        unit_amount: Math.round(item.price * 100),
        product_data: {
          name: item.name,
          ...(item.image ? { images: [`${baseUrl}${item.image}`] } : {}),
        },
      },
    }))

    // Add delivery fee line item (what the customer pays)
    if (isDelivery && deliveryQuote) {
      lineItems.push({
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: deliveryQuote.customerFeeCents,
          product_data: {
            name: 'Delivery Fee',
            description: 'Direct delivery — no third-party commission',
          },
        },
      })
    }

    // ── Metadata for the webhook ─────────────────────────────────────────────
    // We store delivery details in metadata so the webhook can dispatch DoorDash
    // after payment. Stripe metadata values must be strings.
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

    // ── Create Stripe session ────────────────────────────────────────────────
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: lineItems,
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
