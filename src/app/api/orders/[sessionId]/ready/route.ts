import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import Stripe from 'stripe'
import { getOrder, updateOrderStatus } from '@/lib/orderStore'
import { buildOrderFromStripeSession } from '@/lib/orderStripeFallback'
import { getRestaurantPhoneDisplay } from '@/lib/restaurant'

const resend = new Resend(process.env.RESEND_API_KEY!)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia',
})

// "Your order is ready" is meaningless for stale orders the owner is clearing
// from the kitchen view after the fact. Cap at 2h so legitimately delayed
// orders still notify, but 13h-old leftovers don't spam the customer.
const READY_EMAIL_MAX_AGE_SEC = 2 * 60 * 60

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const body = await req.json().catch(() => ({}))
  if (!body.pin || body.pin !== process.env.NEXT_PUBLIC_KITCHEN_PIN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { sessionId } = await params

  // Persist ready status FIRST — this writes to the dedicated status key,
  // which works even for orders that arrived via the Stripe fallback and
  // were never saved to Redis (e.g. webhook missed during Upstash quota
  // exhaustion). Without this, "Mark Ready" silently no-ops.
  try {
    await updateOrderStatus(sessionId, 'ready')
  } catch (err) {
    console.error(`[ready] updateOrderStatus failed for ${sessionId}:`, err)
    return NextResponse.json({ error: 'Failed to persist status' }, { status: 500 })
  }

  // Try Redis first (richer data), fall back to Stripe for orders the webhook
  // never managed to persist.
  let order = await getOrder(sessionId).catch(() => undefined)
  if (!order) {
    const fallback = await buildOrderFromStripeSession(stripe, sessionId)
    if (fallback) order = fallback
  }

  if (!order) {
    // Status is at least persisted; just nothing to email.
    return NextResponse.json({ ok: true, note: 'status_only' })
  }

  if (!order.customerEmail) {
    return NextResponse.json({ ok: true })
  }

  // Skip the customer-facing email for stale orders — owner is just cleaning
  // up the kitchen view (e.g. for orders already picked up in person).
  const ageSec = Math.floor(Date.now() / 1000) - order.createdAt
  if (ageSec > READY_EMAIL_MAX_AGE_SEC) {
    console.log(`[ready] Skipping ready email for stale order ${sessionId} (age ${ageSec}s)`)
    return NextResponse.json({ ok: true, note: 'skipped_stale_email' })
  }

  const name = order.customerName ? `, ${order.customerName.split(' ')[0]}` : ''
  const shortId = order.sessionId.slice(-6).toUpperCase()
  const restaurantPhone = getRestaurantPhoneDisplay()
  const itemLines = order.items
    .map(i => `${i.quantity}× ${i.name}`)
    .join('<br>')

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#180008;font-family:system-ui,sans-serif;color:#feeaed;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#180008;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#27000f;border-radius:16px;overflow:hidden;">
        <tr><td style="background:#f59e0b;padding:24px 32px;">
          <p style="margin:0;font-size:13px;color:#1c1917;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Tsing Tsao Waukee</p>
          <h1 style="margin:8px 0 0;font-size:26px;color:#0c0a09;font-weight:800;">Your order is ready${name}! 🥡</h1>
        </td></tr>
        <tr><td style="padding:28px 32px;">
          <p style="margin:0 0 20px;color:#c47888;font-size:14px;">Order <strong style="color:#feeaed;">#${shortId}</strong> is ready for <strong style="color:#feeaed;">pickup</strong> at the counter.</p>
          <table width="100%" style="border-collapse:collapse;">
            ${order.items.map(i => `
            <tr>
              <td style="padding:8px 0;border-top:1px solid #560020;color:#f5dce2;font-size:14px;">
                <span style="color:#f59e0b;font-weight:700;">${i.quantity}×</span> ${i.name}
              </td>
              <td style="padding:8px 0;border-top:1px solid #560020;color:#c47888;font-size:13px;text-align:right;">
                $${(i.amount_total / 100).toFixed(2)}
              </td>
            </tr>`).join('')}
            <tr>
              <td style="padding:12px 0 0;color:#feeaed;font-weight:700;font-size:15px;">Total</td>
              <td style="padding:12px 0 0;color:#f59e0b;font-weight:700;font-size:15px;text-align:right;">$${(order.amountTotal / 100).toFixed(2)}</td>
            </tr>
          </table>
          <p style="margin:28px 0 0;color:#8f4a58;font-size:12px;text-align:center;">160 SE Laurel St, Waukee, IA 50263 · ${restaurantPhone}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  const text = `Your order is ready${name}!\n\nOrder #${shortId} is ready for pickup at the counter.\n\n${order.items.map(i => `${i.quantity}x ${i.name}`).join('\n')}\n\nTotal: $${(order.amountTotal / 100).toFixed(2)}\n\nTsing Tsao Waukee — 160 SE Laurel St, Waukee, IA 50263`

  const { error } = await resend.emails.send({
    from: 'Tsing Tsao Waukee <orders@tsingtsao.com>',
    to: order.customerEmail,
    subject: `Your order is ready for pickup! 🥡`,
    html,
    text,
  })

  if (error) {
    console.error('[ready] Resend error:', error)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
