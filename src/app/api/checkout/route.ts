import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-03-31.basil',
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
    const { items }: { items: CheckoutItem[] } = await req.json()

    if (!items?.length) {
      return NextResponse.json({ error: 'No items in cart' }, { status: 400 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: items.map(item => ({
        quantity: item.quantity,
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(item.price * 100), // cents
          product_data: {
            name: item.name,
            ...(item.image
              ? { images: [`${baseUrl}${item.image}`] }
              : {}),
          },
        },
      })),
      success_url: `${baseUrl}/order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/order/cancel`,
      custom_fields: [
        {
          key: 'order_type',
          label: { type: 'custom', custom: 'Pickup or Delivery?' },
          type: 'dropdown',
          dropdown: {
            options: [
              { label: 'Pickup', value: 'pickup' },
              { label: 'Delivery', value: 'delivery' },
            ],
          },
        },
      ],
      phone_number_collection: { enabled: true },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[checkout]', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
