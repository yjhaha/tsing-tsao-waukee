import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { getOrder, updateOrderStatus } from '@/lib/orderStore'

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const body = await req.json().catch(() => ({}))
  if (!body.pin || body.pin !== process.env.NEXT_PUBLIC_KITCHEN_PIN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { sessionId } = await params
  const order = await getOrder(sessionId)

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  // Persist ready status before anything else — decoupled from email delivery
  await updateOrderStatus(sessionId, 'ready')

  if (!order.customerEmail) {
    // Status is saved; nothing more to do without an email address
    return NextResponse.json({ ok: true })
  }

  const name = order.customerName ? `, ${order.customerName.split(' ')[0]}` : ''
  const shortId = order.sessionId.slice(-6).toUpperCase()
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
          <p style="margin:28px 0 0;color:#8f4a58;font-size:12px;text-align:center;">160 SE Laurel St, Waukee, IA 50263 · (515) 490-2888</p>
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
