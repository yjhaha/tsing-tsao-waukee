import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { Resend } from 'resend'
import { buildOrderEmailHtml, buildOrderEmailText, OrderEmailItem } from '@/lib/orderEmail'
import { saveOrder } from '@/lib/orderStore'
import { createDelivery } from '@/lib/delivery/provider'
import type { DeliveryAddress } from '@/lib/delivery/types'

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
      console.error('[webhook] Failed to handle order confirmation:', err)
      // Return 200 so Stripe doesn't retry — the order was placed,
      // operational failures (email, delivery) are non-critical to payment receipt
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

  const customerName = session.customer_details?.name ?? undefined
  const customerPhone = session.customer_details?.phone ?? undefined

  // ── Extract order type & delivery metadata ─────────────────────────────────
  const meta = session.metadata ?? {}
  const orderType = meta.order_type ?? 'pickup'
  const isDelivery = orderType === 'delivery'

  let deliveryAddress: DeliveryAddress | undefined
  let externalDeliveryId: string | undefined

  if (isDelivery) {
    deliveryAddress = {
      street: meta.delivery_street ?? '',
      unit: meta.delivery_unit || undefined,
      city: meta.delivery_city ?? '',
      state: meta.delivery_state ?? '',
      zip: meta.delivery_zip ?? '',
    }
    externalDeliveryId = meta.delivery_external_id || undefined
  }

  // ── Retrieve line items ────────────────────────────────────────────────────
  const lineItemsResponse = await stripe.checkout.sessions.listLineItems(session.id, {
    limit: 100,
  })

  const items: OrderEmailItem[] = lineItemsResponse.data
    .filter(li => li.description !== 'Delivery Fee') // exclude the fee from order items
    .map(li => ({
      name: li.description ?? 'Item',
      quantity: li.quantity ?? 1,
      amount_total: li.amount_total,
    }))

  // ── Dispatch delivery ─────────────────────────────────────────────────────
  let deliveryTrackingUrl: string | undefined
  let dropoffEtaAt: string | undefined

  if (isDelivery && deliveryAddress && externalDeliveryId) {
    try {
      console.log(`[webhook] Dispatching delivery for session ${session.id}`)
      const dispatch = await createDelivery({
        externalDeliveryId,
        dropoffAddress: deliveryAddress,
        dropoffName: customerName ?? '',
        dropoffPhone: customerPhone ?? '',
        dropoffInstructions: '',
        orderValueCents: session.amount_total ?? 0,
      })
      deliveryTrackingUrl = dispatch.trackingUrl
      dropoffEtaAt = dispatch.dropoffEtaAt
      console.log(`[webhook] Delivery created: ${dispatch.externalDeliveryId}, tracking: ${dispatch.trackingUrl}`)
    } catch (err) {
      // Log but don't throw — customer paid, we must not leave them unconfirmed.
      console.error('[webhook] Delivery dispatch failed:', err)
    }
  }

  // ── Save to order store ────────────────────────────────────────────────────
  saveOrder({
    sessionId: session.id,
    createdAt: session.created,
    customerEmail,
    customerName,
    customerPhone,
    orderType,
    items,
    amountTotal: session.amount_total ?? 0,
    deliveryAddress,
    externalDeliveryId,
    deliveryTrackingUrl,
    deliveryStatus: isDelivery ? 'created' : undefined,
    dropoffEtaAt,
  })

  // ── Send confirmation email ────────────────────────────────────────────────
  const RESTAURANT_EMAIL = process.env.RESTAURANT_EMAIL ?? 'tsingtsaowaukee@gmail.com'
  const RESTAURANT_NAME = process.env.RESTAURANT_NAME ?? 'Tsing Tsao Waukee'

  const emailData = {
    customerEmail,
    customerName,
    customerPhone,
    orderType,
    items,
    amountTotal: session.amount_total ?? 0,
    sessionId: session.id,
    deliveryAddress,
    deliveryTrackingUrl,
    dropoffEtaAt,
  }

  const { error } = await resend.emails.send({
    from: `${RESTAURANT_NAME} <orders@tsingtsao.com>`,
    to: customerEmail,
    bcc: RESTAURANT_EMAIL,
    subject: `Your ${RESTAURANT_NAME} order is confirmed! 🥡`,
    html: buildOrderEmailHtml(emailData),
    text: buildOrderEmailText(emailData),
  })

  if (error) {
    throw new Error(`Resend error: ${JSON.stringify(error)}`)
  }

  console.log(
    `[webhook] Confirmation sent to ${customerEmail} (bcc: ${RESTAURANT_EMAIL}) for session ${session.id}` +
      (isDelivery ? ` [delivery, tracking: ${deliveryTrackingUrl ?? 'pending'}]` : ' [pickup]'),
  )
}
