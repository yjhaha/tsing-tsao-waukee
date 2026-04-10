import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { Resend } from 'resend'
import { buildOrderEmailHtml, buildOrderEmailText, OrderEmailItem } from '@/lib/orderEmail'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia',
})

const resend = new Resend(process.env.RESEND_API_KEY!)

// Next.js App Router: disable body parsing so we can verify Stripe's raw signature
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('stripe-signature')

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('[webhook] STRIPE_WEBHOOK_SECRET is not set')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[webhook] Signature verification failed:', message)
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    try {
      await handleOrderConfirmation(session)
    } catch (err) {
      console.error('[webhook] Failed to send order confirmation:', err)
      // Return 200 so Stripe doesn't retry — the order was placed, email is non-critical
    }
  }

  return NextResponse.json({ received: true })
}

async function handleOrderConfirmation(session: Stripe.Checkout.Session) {
  const customerEmail = session.customer_details?.email
  if (!customerEmail) {
    console.warn('[webhook] No customer email on session', session.id)
    return
  }

  // Retrieve line items (not included in the webhook payload by default)
  const lineItemsResponse = await stripe.checkout.sessions.listLineItems(session.id, {
    limit: 100,
  })

  const items: OrderEmailItem[] = lineItemsResponse.data.map(li => ({
    name: li.description ?? 'Item',
    quantity: li.quantity ?? 1,
    amount_total: li.amount_total, // cents
  }))

  // Extract order type from custom_fields
  const orderTypeField = session.custom_fields?.find(f => f.key === 'order_type')
  const orderType = orderTypeField?.dropdown?.value ?? 'pickup'

  const customerName = session.customer_details?.name ?? undefined
  const customerPhone = session.customer_details?.phone ?? undefined

  const emailData = {
    customerEmail,
    customerName,
    customerPhone,
    orderType,
    items,
    amountTotal: session.amount_total ?? 0,
    sessionId: session.id,
  }

  const { error } = await resend.emails.send({
    from: 'Tsing Tsao Waukee <orders@tsingtsao.com>',
    to: customerEmail,
    subject: `Your Tsing Tsao order is confirmed! 🥡`,
    html: buildOrderEmailHtml(emailData),
    text: buildOrderEmailText(emailData),
  })

  if (error) {
    throw new Error(`Resend error: ${JSON.stringify(error)}`)
  }

  console.log(`[webhook] Confirmation email sent to ${customerEmail} for session ${session.id}`)
}
