'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import NavBar from '@/components/NavBar'
import type { DeliveryAddress } from '@/lib/delivery/types'
import { FaMotorcycle, FaShoppingBag, FaCheckCircle, FaExclamationTriangle, FaClock, FaMapMarkerAlt } from 'react-icons/fa'

// ── Types ─────────────────────────────────────────────────────────────────────

interface OrderDetails {
  sessionId: string
  orderType: string
  amountTotal: number
  customerName?: string
  deliveryAddress: DeliveryAddress | null
  deliveryTrackingUrl: string | null
  deliveryStatus: string | null
  externalDeliveryId: string | null
  courierLat: number | null
  courierLng: number | null
  courierName: string | null
  dropoffEtaAt: string | null
}

function formatAddress(a: DeliveryAddress): string {
  const parts = [a.street]
  if (a.unit) parts.push(`#${a.unit}`)
  return `${parts.join(', ')}, ${a.city}, ${a.state} ${a.zip}`
}

// ── Static map URL (Google Maps Static API — needs NEXT_PUBLIC_GOOGLE_MAPS_KEY) ──

function buildMapUrl({
  restaurantLat, restaurantLng,
  customerAddress,
  courierLat, courierLng,
}: {
  restaurantLat: number
  restaurantLng: number
  customerAddress: string
  courierLat?: number | null
  courierLng?: number | null
}): string | null {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY
  if (!key) return null

  const base = 'https://maps.googleapis.com/maps/api/staticmap'
  const style = [
    'feature:all|element:geometry|color:0x1e293b',
    'feature:all|element:labels.text.fill|color:0x94a3b8',
    'feature:road|element:geometry|color:0x334155',
    'feature:water|element:geometry|color:0x0f172a',
    'feature:poi|visibility:off',
  ].map(s => `&style=${encodeURIComponent(s)}`).join('')

  const restaurantMarker = `color:0xFFAE00|label:R|${restaurantLat},${restaurantLng}`
  const customerMarker   = `color:0x22c55e|label:C|${customerAddress}`

  let url = `${base}?size=580x260&scale=2&key=${key}${style}`
  url += `&markers=${encodeURIComponent(restaurantMarker)}`
  url += `&markers=${encodeURIComponent(customerMarker)}`

  if (courierLat && courierLng) {
    const courierMarker = `color:0x60a5fa|label:D|${courierLat},${courierLng}`
    url += `&markers=${encodeURIComponent(courierMarker)}`
  }

  return url
}

// ── ETA display ───────────────────────────────────────────────────────────────

function EtaDisplay({ dropoffEtaAt }: { dropoffEtaAt: string | null }) {
  const [display, setDisplay] = useState<string | null>(null)

  useEffect(() => {
    if (!dropoffEtaAt) { setDisplay(null); return }

    function compute() {
      const diffMs = new Date(dropoffEtaAt!).getTime() - Date.now()
      if (diffMs <= 0) { setDisplay('Arriving now'); return }
      const mins = Math.round(diffMs / 60_000)
      const eta = new Date(dropoffEtaAt!).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      setDisplay(`~${mins} min  ·  ${eta}`)
    }

    compute()
    const t = setInterval(compute, 30_000)
    return () => clearInterval(t)
  }, [dropoffEtaAt])

  if (!display) return null

  return (
    <div className="flex items-center gap-2.5 px-4 py-3 bg-brand-gold/10 border border-brand-gold/25 rounded-xl text-sm">
      <FaClock className="text-brand-gold shrink-0 text-base" />
      <span className="text-slate-300">Estimated arrival:</span>
      <span className="text-brand-gold font-bold tabular-nums">{display}</span>
    </div>
  )
}

// ── Delivery status steps ─────────────────────────────────────────────────────

const STATUS_STEPS: { key: string; label: string; icon: React.ReactNode }[] = [
  { key: 'created',         label: 'Confirmed',      icon: <FaCheckCircle /> },
  { key: 'driver_assigned', label: 'Driver assigned', icon: <FaMotorcycle /> },
  { key: 'picked_up',       label: 'Picked up',       icon: <FaShoppingBag /> },
  { key: 'delivered',       label: 'Delivered',       icon: <FaCheckCircle /> },
]

const STATUS_ORDER = ['created', 'driver_assigned', 'picked_up', 'delivered']

function StatusStepper({ status }: { status: string | null }) {
  const currentIdx = STATUS_ORDER.indexOf(status ?? 'created')
  const isCancelled = status === 'cancelled' || status === 'failed'

  if (isCancelled) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 bg-red-900/40 border border-red-600/50 rounded-xl text-red-200 text-sm">
        <FaExclamationTriangle className="shrink-0 text-red-400 text-base" />
        <span>Delivery was cancelled — please call us at (515) 830-9600</span>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-4 gap-2">
      {STATUS_STEPS.map((step, idx) => {
        const done    = idx <= currentIdx
        const current = idx === currentIdx
        return (
          <div
            key={step.key}
            className={`flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl text-center text-xs font-semibold transition-all ${
              current
                ? 'bg-brand-gold text-slate-900 shadow-lg shadow-yellow-900/30'
                : done
                ? 'bg-green-800/60 text-green-200 border border-green-700/40'
                : 'bg-slate-700/40 text-slate-500 border border-slate-700/30'
            }`}
          >
            <span className="text-sm">{step.icon}</span>
            <span className="leading-tight">{step.label}</span>
          </div>
        )
      })}
    </div>
  )
}

// ── Delivery tracking panel ───────────────────────────────────────────────────

function DeliveryTrackingPanel({ order }: { order: OrderDetails }) {
  const [tracking, setTracking] = useState<{
    status: string | null
    trackingUrl: string | null
    courierLat: number | null
    courierLng: number | null
    courierName: string | null
    dropoffEtaAt: string | null
    terminal: boolean
  }>({
    status: order.deliveryStatus,
    trackingUrl: order.deliveryTrackingUrl,
    courierLat: order.courierLat,
    courierLng: order.courierLng,
    courierName: order.courierName,
    dropoffEtaAt: order.dropoffEtaAt,
    terminal: false,
  })

  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const poll = useCallback(async () => {
    if (!order.externalDeliveryId) return
    try {
      const res = await fetch(`/api/orders/${order.sessionId}/tracking`)
      if (res.ok) {
        const data = await res.json()
        setTracking(data)
        if (!data.terminal) {
          pollRef.current = setTimeout(poll, 15_000)
        }
        return
      }
    } catch { /* ignore */ }
    pollRef.current = setTimeout(poll, 15_000)
  }, [order.sessionId, order.externalDeliveryId])

  useEffect(() => {
    const isTerminal = ['delivered', 'cancelled', 'failed'].includes(order.deliveryStatus ?? '')
    if (!isTerminal && order.externalDeliveryId) {
      pollRef.current = setTimeout(poll, 5_000)
    }
    return () => { if (pollRef.current) clearTimeout(pollRef.current) }
  }, [poll, order.deliveryStatus, order.externalDeliveryId])

  const restaurantLat = parseFloat(process.env.NEXT_PUBLIC_RESTAURANT_LAT ?? '41.6132')
  const restaurantLng = parseFloat(process.env.NEXT_PUBLIC_RESTAURANT_LNG ?? '-93.8692')
  const customerAddr  = order.deliveryAddress ? formatAddress(order.deliveryAddress) : ''
  const mapUrl = customerAddr ? buildMapUrl({
    restaurantLat,
    restaurantLng,
    customerAddress: customerAddr,
    courierLat: tracking.courierLat,
    courierLng: tracking.courierLng,
  }) : null

  const currentStatus  = tracking.status ?? order.deliveryStatus
  const trackingUrl    = tracking.trackingUrl ?? order.deliveryTrackingUrl
  const courierName    = tracking.courierName ?? order.courierName
  const dropoffEtaAt   = tracking.dropoffEtaAt ?? order.dropoffEtaAt

  return (
    <div className="bg-slate-800/90 border border-slate-700/60 rounded-2xl overflow-hidden text-left h-full flex flex-col">

      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between gap-2 border-b border-slate-700/50">
        <h2 className="text-white font-bold text-base flex items-center gap-2">
          <FaMotorcycle className="text-brand-gold text-lg" />
          <span>Delivery Tracking</span>
        </h2>
        {courierName && (
          <span className="text-xs text-slate-300 bg-slate-700 px-2.5 py-1 rounded-full border border-slate-600/50">
            Driver: <span className="text-white font-semibold">{courierName}</span>
          </span>
        )}
      </div>

      {/* Map */}
      {mapUrl ? (
        <div className="mx-5 mt-4 mb-3 rounded-xl overflow-hidden border border-slate-600/50">
          <img
            src={mapUrl}
            alt="Delivery route map"
            className="w-full block"
            key={`${tracking.courierLat ?? 0}-${tracking.courierLng ?? 0}`}
          />
          <div className="px-4 py-2 bg-slate-900/80 flex items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-brand-gold" />Restaurant</span>
            {tracking.courierLat && <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-400" />Driver</span>}
            <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-green-400" />You</span>
          </div>
        </div>
      ) : (
        order.deliveryAddress && (
          <div className="mx-5 mt-4 mb-3 px-4 py-3 bg-slate-700/40 border border-slate-600/40 rounded-xl flex items-start gap-3 text-sm">
            <FaMapMarkerAlt className="text-brand-gold shrink-0 mt-0.5 text-base" />
            <div>
              <p className="text-slate-400 text-xs uppercase tracking-wider mb-1 font-medium">Delivering to</p>
              <p className="text-slate-100 font-medium">{formatAddress(order.deliveryAddress)}</p>
            </div>
          </div>
        )
      )}

      {/* Status stepper */}
      <div className="px-5 pb-3 space-y-3">
        <StatusStepper status={currentStatus} />
        <EtaDisplay dropoffEtaAt={dropoffEtaAt} />
      </div>

      {/* Track live button */}
      <div className="px-5 pb-5 pt-1 mt-auto">
        {trackingUrl ? (
          <a
            href={trackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 text-center bg-brand-gold hover:bg-yellow-300 text-slate-900 font-bold rounded-xl transition-colors text-sm shadow-lg shadow-yellow-900/20"
          >
            <FaMapMarkerAlt /> Track Live on Uber →
          </a>
        ) : (
          <p className="text-slate-400 text-sm text-center py-1">
            A live tracking link will be emailed once a driver is assigned.
          </p>
        )}
      </div>
    </div>
  )
}

// ── Dev-only simulate button ──────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  created:         'Confirmed',
  driver_assigned: 'Driver Assigned',
  picked_up:       'Picked Up',
  delivered:       'Delivered',
}

const NEXT_STATUS_LABEL: Record<string, string> = {
  created:         'Assign Driver',
  driver_assigned: 'Mark Picked Up',
  picked_up:       'Mark Delivered',
}

function SimulateButton({ sessionId, currentStatus, onAdvance }: {
  sessionId: string
  currentStatus: string | null
  onAdvance: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const status = currentStatus ?? 'created'
  const nextLabel = NEXT_STATUS_LABEL[status]

  if (done || !nextLabel) return (
    <div className="px-4 py-2.5 bg-green-900/30 border border-green-700/40 rounded-xl text-xs text-green-300 text-center">
      Simulation complete — delivery marked as delivered
    </div>
  )

  async function advance() {
    setLoading(true)
    try {
      const res = await fetch('/api/dev/simulate-delivery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
      const data = await res.json()
      if (data.done) setDone(true)
      onAdvance()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border border-dashed border-slate-600 rounded-xl p-3 space-y-2">
      <p className="text-xs text-slate-500 font-mono uppercase tracking-wider">Dev — simulate delivery</p>
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-slate-400">
          Current: <span className="text-slate-200 font-medium">{STATUS_LABELS[status] ?? status}</span>
        </span>
        <button
          onClick={advance}
          disabled={loading}
          className="text-xs px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {loading ? 'Advancing…' : `→ ${nextLabel}`}
        </button>
      </div>
    </div>
  )
}

// ── Inner component ───────────────────────────────────────────────────────────

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
  const isDev = process.env.NODE_ENV === 'development'

  // Refresh order data (used by simulate button to pull latest status)
  function refreshOrder() {
    if (!sessionId) return
    fetch(`/api/orders/${sessionId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setOrder(data) })
      .catch(() => {})
  }

  // Two-column layout for delivery orders; single column for pickup
  if (isDelivery && order) {
    return (
      <div className="max-w-5xl mx-auto px-4 pt-28 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-6 items-start">

          {/* ── Left column: confirmation info ── */}
          <div className="text-center lg:text-left flex flex-col gap-5">
            <div>
              <h1 className="font-display italic text-4xl text-white mb-2">Order Placed!</h1>
              <p className="text-slate-300 text-base mb-2 leading-relaxed">
                Your order is confirmed. We&apos;re preparing your food and dispatching a driver.
              </p>
              <p className="text-slate-500 text-sm">
                A confirmation will be sent to your email shortly.
              </p>
            </div>

            {/* Order summary card */}
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl px-5 py-4 text-left space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Order total</span>
                <span className="text-white font-semibold">
                  ${(order.amountTotal / 100).toFixed(2)}
                </span>
              </div>
              {order.customerName && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Name</span>
                  <span className="text-white">{order.customerName}</span>
                </div>
              )}
              {order.deliveryAddress && (
                <div className="flex items-start justify-between text-sm gap-4">
                  <span className="text-slate-400 shrink-0">Delivering to</span>
                  <span className="text-white text-right">{formatAddress(order.deliveryAddress)}</span>
                </div>
              )}
            </div>

            {isDev && (
              <SimulateButton
                sessionId={order.sessionId}
                currentStatus={order.deliveryStatus}
                onAdvance={refreshOrder}
              />
            )}

            <Link
              href="/menu"
              className="inline-block w-full lg:w-auto px-8 py-3.5 bg-brand-gold text-slate-900 rounded-xl font-bold hover:bg-yellow-400 transition-colors text-center"
            >
              Back to Menu
            </Link>
          </div>

          {/* ── Right column: tracking panel ── */}
          <div>
            <DeliveryTrackingPanel order={order} />
          </div>
        </div>
      </div>
    )
  }

  // ── Pickup / loading fallback: single column ──
  return (
    <div className="max-w-lg mx-auto px-4 pt-32 pb-12 text-center">
      <h1 className="font-display italic text-4xl text-white mb-3">Order Placed!</h1>
      <p className="text-slate-400 text-base mb-2">
        Thank you for ordering from Tsing Tsao. We&apos;re preparing your food now.
      </p>
      <p className="text-slate-500 text-sm mb-6">
        A confirmation will be sent to your email shortly.
      </p>

      {!order && sessionId && (
        <div className="mt-4 text-slate-600 text-sm animate-pulse">
          Loading order details…
        </div>
      )}

      {order && (
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl px-5 py-4 text-left space-y-3 mb-6">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Order total</span>
            <span className="text-white font-semibold">
              ${(order.amountTotal / 100).toFixed(2)}
            </span>
          </div>
          {order.customerName && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-400">Name</span>
              <span className="text-white">{order.customerName}</span>
            </div>
          )}
        </div>
      )}

      <Link
        href="/menu"
        className="inline-block px-8 py-3.5 bg-brand-gold text-slate-900 rounded-xl font-bold hover:bg-yellow-400 transition-colors"
      >
        Back to Menu
      </Link>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-slate-900">
      <NavBar />
      <Suspense
        fallback={
          <div className="max-w-lg mx-auto px-4 pt-32 pb-12 text-center">
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
