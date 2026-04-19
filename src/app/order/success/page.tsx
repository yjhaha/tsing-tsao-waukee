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
  // Dark-ish map style parameters
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
    <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-700/50 rounded-xl text-sm">
      <FaClock className="text-brand-gold shrink-0" />
      <span className="text-slate-300">Estimated arrival: </span>
      <span className="text-brand-gold font-semibold tabular-nums">{display}</span>
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
      <div className="flex items-center gap-2 px-4 py-3 bg-red-900/30 border border-red-700/40 rounded-xl text-red-300 text-sm">
        <FaExclamationTriangle className="shrink-0 text-red-400" />
        <span>Delivery was cancelled — please call us at (515) 830-9600</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1">
      {STATUS_STEPS.map((step, idx) => {
        const done    = idx <= currentIdx
        const current = idx === currentIdx
        return (
          <div key={step.key} className="flex items-center gap-1 min-w-0">
            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              done
                ? current
                  ? 'bg-brand-gold text-slate-900'
                  : 'bg-green-700/50 text-green-300'
                : 'bg-slate-700/50 text-slate-500'
            }`}>
              <span className="text-[11px]">{step.icon}</span>
              <span className="hidden sm:inline">{step.label}</span>
            </div>
            {idx < STATUS_STEPS.length - 1 && (
              <div className={`h-0.5 w-3 shrink-0 rounded ${idx < currentIdx ? 'bg-green-600' : 'bg-slate-700'}`} />
            )}
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
    // Start polling if delivery is still active
    const isTerminal = ['delivered', 'cancelled', 'failed'].includes(order.deliveryStatus ?? '')
    if (!isTerminal && order.externalDeliveryId) {
      pollRef.current = setTimeout(poll, 5_000) // first poll after 5s
    }
    return () => { if (pollRef.current) clearTimeout(pollRef.current) }
  }, [poll, order.deliveryStatus, order.externalDeliveryId])

  // Map config from env
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
    <div className="mt-6 bg-slate-800 rounded-2xl overflow-hidden text-left">

      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between gap-2">
        <h2 className="text-white font-semibold text-base flex items-center gap-2">
          <FaMotorcycle className="text-brand-gold" />
          <span>Delivery Tracking</span>
        </h2>
        {courierName && (
          <span className="text-xs text-slate-400 bg-slate-700 px-2.5 py-1 rounded-full">
            Driver: <span className="text-slate-200 font-medium">{courierName}</span>
          </span>
        )}
      </div>

      {/* Map */}
      {mapUrl ? (
        <div className="mx-5 mb-4 rounded-xl overflow-hidden border border-slate-700/50">
          {/* key changes when courier moves, forcing the img to re-fetch */}
          <img
            src={mapUrl}
            alt="Delivery route map"
            className="w-full block"
            key={`${tracking.courierLat ?? 0}-${tracking.courierLng ?? 0}`}
          />
          <div className="px-3 py-2 bg-slate-900/60 flex items-center gap-4 text-[11px] text-slate-500">
            <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-brand-gold" />Restaurant</span>
            {tracking.courierLat && <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-blue-400" />Driver</span>}
            <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-green-500" />You</span>
          </div>
        </div>
      ) : (
        /* No Maps key — show address text instead */
        order.deliveryAddress && (
          <div className="mx-5 mb-4 px-4 py-3 bg-slate-700/30 rounded-xl flex items-start gap-2.5 text-sm">
            <FaMapMarkerAlt className="text-brand-gold shrink-0 mt-0.5" />
            <div>
              <p className="text-slate-500 text-xs uppercase tracking-wide mb-0.5">Delivering to</p>
              <p className="text-slate-200">{formatAddress(order.deliveryAddress)}</p>
            </div>
          </div>
        )
      )}

      {/* Status stepper + ETA */}
      <div className="px-5 pb-2 space-y-3">
        <StatusStepper status={currentStatus} />
        <EtaDisplay dropoffEtaAt={dropoffEtaAt} />
      </div>

      {/* Track live button */}
      <div className="px-5 pb-5 pt-3">
        {trackingUrl ? (
          <a
            href={trackingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 text-center bg-brand-gold hover:bg-yellow-400 text-slate-900 font-bold rounded-xl transition-colors text-sm"
          >
            <FaMapMarkerAlt /> Track Live on Uber →
          </a>
        ) : (
          <p className="text-slate-500 text-xs text-center">
            A live tracking link will be sent to your email once a driver is assigned.
          </p>
        )}
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
          // Keep polling until we get a tracking URL for delivery orders (max ~1 min)
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

// ── Page ──────────────────────────────────────────────────────────────────────

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
