/**
 * POST /api/webhooks/uber
 *
 * Receives delivery status + courier location webhooks from Uber Direct.
 *
 * Configure in direct.uber.com → Settings → Webhooks:
 *   Webhook URL: https://yourdomain.com/api/webhooks/uber
 *
 * For local testing: expose localhost via ngrok, then set that URL in the portal.
 *   ngrok http 3000  →  https://abc123.ngrok.io/api/webhooks/uber
 *
 * Optional env var:
 *   UBER_WEBHOOK_SECRET — if set, verifies the x-uber-signature header (HMAC-SHA256)
 *
 * Uber Direct webhook event types we handle:
 *   delivery.status.changed  — status transitions (created → pickup → delivered)
 *   courier.update           — courier location ping (~every 30s when active)
 */

import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { updateOrderDeliveryStatus, updateOrderCourierLocation, getOrderByDeliveryId } from '@/lib/orderStore'

export const runtime = 'nodejs'

const resend = new Resend(process.env.RESEND_API_KEY!)

// ── Uber Direct webhook payload ───────────────────────────────────────────────

interface UberWebhookPayload {
  event_type: string   // 'delivery.status.changed' | 'courier.update'
  event_id: string
  created: number      // Unix timestamp (seconds)
  data: {
    id: string         // Uber delivery ID == our externalDeliveryId
    status?: string    // Uber status string
    tracking_url?: string
    dropoff_eta?: number  // Unix timestamp (seconds)
    courier?: {
      name?: string
      location?: { lat: number; lng: number }
    }
  }
}

// Maps Uber Direct status → our internal DeliveryStatus
const STATUS_MAP: Record<string, string> = {
  created:         'created',
  pickup:          'driver_assigned',
  pickup_complete: 'picked_up',
  dropoff:         'picked_up',
  delivered:       'delivered',
  cancelled:       'cancelled',
  returned:        'failed',
}

// Notification emails for key status changes
const STATUS_EMAILS: Record<string, { subject: string; body: string } | null> = {
  driver_assigned: {
    subject: '🛵 Your driver is on the way to pick up your order!',
    body: 'A driver has been assigned and is heading to Tsing Tsao to pick up your food.',
  },
  picked_up: {
    subject: '🥡 Your order is on its way!',
    body: 'Your order has been picked up and is now heading to your address.',
  },
  delivered: {
    subject: '✅ Your order has been delivered!',
    body: 'Your Tsing Tsao order has been delivered. Enjoy your meal!',
  },
  cancelled: {
    subject: '⚠️ Delivery update — please contact us',
    body: 'There was an issue with your delivery. Please call us at (515) 830-9600 so we can make it right.',
  },
}

export async function POST(req: NextRequest) {
  // Optional HMAC-SHA256 signature verification
  const secret = process.env.UBER_WEBHOOK_SECRET
  let rawBody: string

  if (secret) {
    rawBody = await req.text()
    const signature = req.headers.get('x-uber-signature')
    if (signature) {
      const { createHmac } = await import('crypto')
      const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
      if (signature !== expected) {
        console.warn('[uber webhook] Signature mismatch')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }
    await handleWebhook(JSON.parse(rawBody) as UberWebhookPayload)
  } else {
    const payload = (await req.json()) as UberWebhookPayload
    await handleWebhook(payload)
  }

  return NextResponse.json({ received: true })
}

async function handleWebhook(payload: UberWebhookPayload) {
  const { event_type, data } = payload
  const deliveryId = data?.id

  if (!deliveryId) {
    console.warn('[uber webhook] Missing delivery id')
    return
  }

  console.log(`[uber webhook] ${event_type} — delivery ${deliveryId}`)

  // ── Courier location update ────────────────────────────────────────────────
  if (event_type === 'courier.update' && data.courier?.location) {
    const { lat, lng } = data.courier.location
    const dropoffEtaAt = data.dropoff_eta
      ? new Date(data.dropoff_eta * 1000).toISOString()
      : undefined
    updateOrderCourierLocation(deliveryId, lat, lng, data.courier.name, dropoffEtaAt)
    return
  }

  // ── Delivery status change ─────────────────────────────────────────────────
  if (event_type === 'delivery.status.changed' && data.status) {
    const internalStatus = STATUS_MAP[data.status] ?? data.status
    updateOrderDeliveryStatus(deliveryId, internalStatus, data.tracking_url)

    // Also store courier location + ETA if included in the payload
    if (data.courier?.location) {
      const { lat, lng } = data.courier.location
      const dropoffEtaAt = data.dropoff_eta
        ? new Date(data.dropoff_eta * 1000).toISOString()
        : undefined
      updateOrderCourierLocation(deliveryId, lat, lng, data.courier.name, dropoffEtaAt)
    }

    // Send customer notification email for key status changes
    const notification = STATUS_EMAILS[internalStatus]
    if (!notification) return

    const order = getOrderByDeliveryId(deliveryId)
    if (!order?.customerEmail) return

    const restaurantName = process.env.RESTAURANT_NAME ?? 'Tsing Tsao Waukee'
    const restaurantPhone = process.env.RESTAURANT_PHONE ?? '(515) 830-9600'
    const trackingUrl = data.tracking_url ?? order.deliveryTrackingUrl

    const trackingBtn = trackingUrl
      ? `<p style="margin:16px 0"><a href="${trackingUrl}" style="display:inline-block;background:#FFAE00;color:#0f172a;font-weight:700;padding:10px 20px;border-radius:8px;text-decoration:none;">Track your delivery →</a></p>`
      : ''

    await resend.emails.send({
      from: `${restaurantName} <orders@tsingtsao.com>`,
      to: order.customerEmail,
      subject: notification.subject,
      html: `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#0f172a;color:#e2e8f0;padding:40px 16px">
        <div style="max-width:480px;margin:0 auto;background:#1e293b;border-radius:16px;padding:32px">
          <p style="font-size:13px;letter-spacing:0.2em;color:#FFAE00;text-transform:uppercase;margin:0 0 8px">${restaurantName}</p>
          <h2 style="margin:0 0 16px;color:#fff">${notification.subject}</h2>
          <p style="color:#94a3b8;line-height:1.6">${notification.body}</p>
          ${trackingBtn}
          <hr style="border-color:#334155;margin:24px 0"/>
          <p style="font-size:13px;color:#64748b">Questions? Call <a href="tel:${restaurantPhone}" style="color:#FFAE00">${restaurantPhone}</a></p>
        </div>
      </body></html>`,
      text: `${notification.subject}\n\n${notification.body}\n\n${trackingUrl ? `Track: ${trackingUrl}\n\n` : ''}Questions? Call ${restaurantPhone}`,
    }).catch(err => console.error('[uber webhook] email error', err))
  }
}
