/**
 * POST /api/webhooks/doordash
 *
 * Receives delivery status update webhooks from DoorDash Drive.
 * DoorDash sends these as POST requests with a JSON body.
 *
 * Docs: https://developer.doordash.com/en-US/docs/drive/reference/webhooks
 *
 * Configure in the DoorDash Developer Portal:
 *   Webhook URL: https://yourdomain.com/api/webhooks/doordash
 *
 * Currently this handler:
 *  - Updates the in-memory order store with the latest delivery status
 *  - Sends the customer a "driver assigned" and "on the way" notification email
 */

import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { updateOrderDeliveryStatus, getOrderByDeliveryId } from '@/lib/orderStore'

export const runtime = 'nodejs'

const resend = new Resend(process.env.RESEND_API_KEY!)

// DoorDash delivery status webhook payload
interface DdWebhookPayload {
  event_category: string
  event_type: string // e.g. "DASHER_CONFIRMED", "DASHER_PICKED_UP", "DELIVERED"
  event_timestamp: string
  data: {
    external_delivery_id: string
    delivery_status: string
    tracking_url?: string
    dasher?: {
      name?: string
      phone_number?: string
      location?: { lat: number; lng: number }
    }
  }
}

const STATUS_CUSTOMER_MESSAGES: Record<string, { subject: string; body: string } | null> = {
  DASHER_CONFIRMED: {
    subject: '🛵 Your driver is on the way to pick up your order!',
    body: 'A DoorDash driver has been assigned and is heading to Tsing Tsao to pick up your food.',
  },
  DASHER_PICKED_UP: {
    subject: '🥡 Your order is on its way!',
    body: 'Your order has been picked up and is now on the way to your address.',
  },
  DELIVERED: {
    subject: '✅ Your order has been delivered!',
    body: 'Your Tsing Tsao order has been delivered. Enjoy!',
  },
  DELIVERY_CANCELLED: {
    subject: '⚠️ Delivery update — please contact us',
    body: 'There was an issue with your delivery. Please call us at (515) 830-9600 so we can make it right.',
  },
}

export async function POST(req: NextRequest) {
  // Optional: verify DoorDash webhook signature
  // DoorDash includes an `x-doordash-signature` header with HMAC-SHA256
  // of the request body using your webhook secret.
  // If DOORDASH_WEBHOOK_SECRET is set, we verify it.
  const secret = process.env.DOORDASH_WEBHOOK_SECRET
  if (secret) {
    const signature = req.headers.get('x-doordash-signature')
    if (signature) {
      const rawBody = await req.text()
      const { createHmac } = await import('crypto')
      const expected = createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex')
      if (signature !== expected) {
        console.warn('[doordash webhook] Signature mismatch')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
      // Parse body from the already-consumed text
      const payload = JSON.parse(rawBody) as DdWebhookPayload
      await handleWebhook(payload)
      return NextResponse.json({ received: true })
    }
  }

  // No signature verification configured — just parse the body
  const payload = (await req.json()) as DdWebhookPayload
  await handleWebhook(payload)
  return NextResponse.json({ received: true })
}

async function handleWebhook(payload: DdWebhookPayload) {
  const { external_delivery_id, delivery_status, tracking_url } = payload.data ?? {}

  if (!external_delivery_id) {
    console.warn('[doordash webhook] Missing external_delivery_id')
    return
  }

  console.log(`[doordash webhook] ${external_delivery_id} → ${delivery_status}`)

  await updateOrderDeliveryStatus(external_delivery_id, delivery_status, tracking_url)

  // Send customer notification for key status changes
  const notification = STATUS_CUSTOMER_MESSAGES[payload.event_type]
  if (!notification) return

  const order = await getOrderByDeliveryId(external_delivery_id)
  if (!order?.customerEmail) return

  const restaurantName = process.env.RESTAURANT_NAME ?? 'Tsing Tsao Waukee'
  const restaurantPhone = process.env.RESTAURANT_PHONE ?? '(515) 830-9600'

  const trackingSection = order.deliveryTrackingUrl
    ? `<p style="margin:16px 0"><a href="${order.deliveryTrackingUrl}" style="display:inline-block;background:#D4AF37;color:#180008;font-weight:700;padding:10px 20px;border-radius:8px;text-decoration:none;">Track your delivery</a></p>`
    : ''

  await resend.emails.send({
    from: `${restaurantName} <orders@tsingtsao.com>`,
    to: order.customerEmail,
    subject: notification.subject,
    html: `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#180008;color:#f5dce2;padding:40px 16px">
      <div style="max-width:480px;margin:0 auto;background:#27000f;border-radius:16px;padding:32px">
        <p style="font-size:13px;letter-spacing:0.2em;color:#D4AF37;text-transform:uppercase;margin:0 0 8px">${restaurantName}</p>
        <h2 style="margin:0 0 16px;color:#fff">${notification.subject}</h2>
        <p style="color:#c47888;line-height:1.6">${notification.body}</p>
        ${trackingSection}
        <hr style="border-color:#560020;margin:24px 0"/>
        <p style="font-size:13px;color:#8f4a58">Questions? Call us at <a href="tel:${restaurantPhone}" style="color:#D4AF37">${restaurantPhone}</a></p>
      </div>
    </body></html>`,
    text: `${notification.subject}\n\n${notification.body}\n\n${order.deliveryTrackingUrl ? `Track your delivery: ${order.deliveryTrackingUrl}\n\n` : ''}Questions? Call ${restaurantPhone}`,
  }).catch(err => console.error('[doordash webhook] email error', err))
}
