'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import NavBar from '@/components/NavBar'
import type { DeliveryAddress } from '@/lib/delivery/types'

interface OrderDetails {
  sessionId: string
  orderType: string
  amountTotal: number
  customerName?: string
  deliveryAddress: DeliveryAddress | null
  deliveryTrackingUrl: string | null
  deliveryStatus: string | null
}

function formatAddress(a: DeliveryAddress): string {
  const parts = [a.street]
  if (a.unit) parts.push(`#${a.unit}`)
  return `${parts.join(', ')}, ${a.city}, ${a.state} ${a.zip}`
}

// ── Delivery Tracking Panel ───────────────────────────────────────────────────

function DeliveryTrackingPanel({ order }: { order: OrderDetails }) {
  const statusLabels: Record<string, { label: string; icon: string; color: string }> = {
    created:         { label: 'Order confirmed — driver will be assigned soon', icon: '✅', color: 'text-slate-300' },
    driver_assigned: { label: 'Driver assigned and heading to restaurant',       icon: '🛵', color: 'text-blue-400' },
    picked_up:       { label: 'Your food has been picked up!',                   icon: '🥡', color: 'text-brand-gold' },
    delivered:       { label: 'Delivered!',                                      icon: '🎉', color: 'text-green-400' },
    cancelled:       { label: 'Delivery was cancelled — please contact us',      icon: '⚠️', color: 'text-red-400' },
    failed:          { label: 'Delivery issue — please contact us',              icon: '⚠️', color: 'text-red-400' },
  }

  const current = order.deliveryStatus
    ? (statusLabels[order.deliveryStatus] ?? statusLabels.created)
    : statusLabels.created

  return (
    <div className="mt-8 bg-slate-800 rounded-2xl p-5 text-left">
      <h2 className="text-white font-semibold text-base mb-4 flex items-center gap-2">
        🛵 <span>Delivery Status</span>
      </h2>

      {order.deliveryAddress && (
        <div className="mb-4">
          <p className="text-slate-500 text-xs uppercase tracking-wide mb-1">Delivering to</p>
          <p className="text-slate-200 text-sm">{formatAddress(order.deliveryAddress)}</p>
        </div>
      )}

      <div className="mb-4 flex items-start gap-3">
        <span className="text-xl">{current.icon}</span>
        <p className={`text-sm font-medium ${current.color}`}>{current.label}</p>
      </div>

      {order.deliveryTrackingUrl ? (
        <a
          href={order.deliveryTrackingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full py-3 text-center bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors text-sm"
        >
          Track on Map →
        </a>
      ) : (
        <p className="text-slate-500 text-xs text-center">
          Live tracking link will be sent to your email once a driver is assigned.
        </p>
      )}
    </div>
  )
}

// ── Inner component — uses useSearchParams, must be inside <Suspense> ─────────

function SuccessContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')

  const [order, setOrder] = useState<OrderDetails | null>(null)
  const [attempts, setAttempts] = useState(0)

  useEffect(() => {
    if (!sessionId) return

    let timeoutId: ReturnType<typeof setTimeout>

    async function poll() {
      try {
        const res = await fetch(`/api/orders/${sessionId}`)
        if (res.ok) {
          const data = await res.json()
          setOrder(data)
          // Keep polling delivery orders until we have a tracking URL (max ~1 min)
          if (data.orderType === 'delivery' && !data.deliveryTrackingUrl && attempts < 12) {
            setAttempts(n => n + 1)
            timeoutId = setTimeout(poll, 5_000)
          }
          return
        }
      } catch { /* ignore */ }

      if (attempts < 12) {
        setAttempts(n => n + 1)
        timeoutId = setTimeout(poll, 3_000)
      }
    }

    poll()
    return () => clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  const isDelivery = order?.orderType === 'delivery'

  return (
    <div className="max-w-md mx-auto px-4 pt-32 pb-12 text-center">
      <div className="text-6xl mb-6">{isDelivery ? '🛵' : '🎉'}</div>
      <h1 className="font-display italic text-4xl text-white mb-3">Order Placed!</h1>
      <p className="text-slate-400 text-base mb-2">
        {isDelivery
          ? "Your order is confirmed. We're preparing your food and dispatching a driver."
          : "Thank you for ordering from Tsing Tsao. We're preparing your food now."}
      </p>
      <p className="text-slate-500 text-sm mb-6">
        A confirmation will be sent to your email shortly.
      </p>

      {isDelivery && order && <DeliveryTrackingPanel order={order} />}

      {!order && sessionId && (
        <div className="mt-4 text-slate-600 text-sm animate-pulse">
          Loading order details…
        </div>
      )}

      <div className="mt-8">
        <Link
          href="/menu"
          className="inline-block px-8 py-3.5 bg-brand-gold text-slate-900 rounded-xl font-bold hover:bg-yellow-400 transition-colors"
        >
          Back to Menu
        </Link>
      </div>
    </div>
  )
}

// ── Page — wraps the inner component in Suspense ──────────────────────────────

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-slate-900">
      <NavBar />
      <Suspense
        fallback={
          <div className="max-w-md mx-auto px-4 pt-32 pb-12 text-center">
            <div className="text-6xl mb-6">🎉</div>
            <h1 className="font-display italic text-4xl text-white mb-3">Order Placed!</h1>
            <p className="text-slate-500 text-sm animate-pulse">Loading…</p>
          </div>
        }
      >
        <SuccessContent />
      </Suspense>
    </div>
  )
}
