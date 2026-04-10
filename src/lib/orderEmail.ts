export interface OrderEmailItem {
  name: string
  quantity: number
  amount_total: number // in cents
}

export interface OrderEmailData {
  customerEmail: string
  customerName?: string
  customerPhone?: string
  orderType: string // 'pickup' | 'delivery'
  items: OrderEmailItem[]
  amountTotal: number // in cents
  sessionId: string
}

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function formatOrderType(value: string): string {
  const map: Record<string, string> = {
    pickup: 'Pickup',
    delivery: 'Delivery',
  }
  return map[value] ?? value
}

export function buildOrderEmailHtml(data: OrderEmailData): string {
  const { customerEmail, customerName, customerPhone, orderType, items, amountTotal, sessionId } = data

  const itemRows = items
    .map(
      item => `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #2a2a2a; font-size: 15px; color: #e2e8f0;">
            ${item.name}
          </td>
          <td style="padding: 10px 0; border-bottom: 1px solid #2a2a2a; text-align: center; color: #94a3b8; font-size: 14px;">
            ×${item.quantity}
          </td>
          <td style="padding: 10px 0; border-bottom: 1px solid #2a2a2a; text-align: right; font-size: 15px; color: #e2e8f0;">
            ${formatCurrency(item.amount_total)}
          </td>
        </tr>`
    )
    .join('')

  const orderTypeBadgeColor = orderType === 'pickup' ? '#D4AF37' : '#3b82f6'
  const orderTypeLabel = formatOrderType(orderType)

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Order Confirmation – Tsing Tsao Waukee</title>
</head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a;min-height:100vh;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#1e293b;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.4);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a1a1a 0%,#2d1a00 100%);padding:32px 36px;text-align:center;">
              <div style="font-size:13px;letter-spacing:0.25em;color:#D4AF37;text-transform:uppercase;margin-bottom:8px;">Tsing Tsao Waukee</div>
              <h1 style="margin:0;font-size:28px;font-weight:800;color:#ffffff;line-height:1.2;">Order Confirmed!</h1>
              <p style="margin:12px 0 0;color:#94a3b8;font-size:14px;">Thanks for ordering — we're on it.</p>
            </td>
          </tr>

          <!-- Order type badge -->
          <tr>
            <td style="padding: 20px 36px 0;">
              <span style="display:inline-block;background-color:${orderTypeBadgeColor};color:#0f172a;font-weight:700;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;padding:4px 14px;border-radius:999px;">
                ${orderTypeLabel}
              </span>
            </td>
          </tr>

          <!-- Customer info -->
          <tr>
            <td style="padding: 16px 36px;">
              <p style="margin:0;font-size:14px;color:#94a3b8;">
                ${customerName ? `<strong style="color:#cbd5e1;">${customerName}</strong><br/>` : ''}
                ${customerEmail}
                ${customerPhone ? `<br/>${customerPhone}` : ''}
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr><td style="padding: 0 36px;"><hr style="border:none;border-top:1px solid #334155;" /></td></tr>

          <!-- Items table -->
          <tr>
            <td style="padding: 20px 36px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <thead>
                  <tr>
                    <th style="text-align:left;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#64748b;padding-bottom:8px;">Item</th>
                    <th style="text-align:center;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#64748b;padding-bottom:8px;">Qty</th>
                    <th style="text-align:right;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#64748b;padding-bottom:8px;">Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemRows}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- Total -->
          <tr>
            <td style="padding: 0 36px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-size:16px;font-weight:700;color:#ffffff;">Total</td>
                  <td style="font-size:20px;font-weight:800;color:#D4AF37;text-align:right;">${formatCurrency(amountTotal)}</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr><td style="padding: 0 36px;"><hr style="border:none;border-top:1px solid #334155;" /></td></tr>

          <!-- Contact / pickup info -->
          <tr>
            <td style="padding: 24px 36px;">
              <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#cbd5e1;text-transform:uppercase;letter-spacing:0.1em;">
                ${orderType === 'pickup' ? 'Pickup Address' : 'Questions about your order?'}
              </p>
              <p style="margin:0;font-size:14px;color:#94a3b8;line-height:1.6;">
                Tsing Tsao Waukee<br/>
                905 University Ave, Waukee, IA 50263<br/>
                <a href="tel:+15158309600" style="color:#D4AF37;text-decoration:none;">(515) 830-9600</a><br/>
                <a href="https://tsingtsao.com" style="color:#D4AF37;text-decoration:none;">tsingtsao.com</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#0f172a;padding:20px 36px;text-align:center;border-top:1px solid #1e293b;">
              <p style="margin:0;font-size:12px;color:#475569;">
                Order ID: ${sessionId.slice(-12).toUpperCase()}<br/>
                Powered by <a href="https://tsingtsao.com" style="color:#D4AF37;text-decoration:none;">Course</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export function buildOrderEmailText(data: OrderEmailData): string {
  const { customerEmail, customerPhone, orderType, items, amountTotal, sessionId } = data
  const lines = [
    'ORDER CONFIRMED – TSING TSAO WAUKEE',
    '=====================================',
    `Order type: ${formatOrderType(orderType)}`,
    `Email: ${customerEmail}`,
    customerPhone ? `Phone: ${customerPhone}` : '',
    '',
    'ITEMS',
    '-----',
    ...items.map(i => `${i.name} x${i.quantity}  ${formatCurrency(i.amount_total)}`),
    '',
    `TOTAL: ${formatCurrency(amountTotal)}`,
    '',
    'PICKUP / CONTACT',
    '----------------',
    'Tsing Tsao Waukee',
    '905 University Ave, Waukee, IA 50263',
    '(515) 830-9600',
    'tsingtsao.com',
    '',
    `Order ID: ${sessionId.slice(-12).toUpperCase()}`,
  ]
  return lines.filter(l => l !== undefined).join('\n')
}
