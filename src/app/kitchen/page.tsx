'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { DeliveryAddress } from '@/lib/delivery/types'
import {
  FaClock,
  FaMotorcycle,
  FaShoppingBag,
  FaCheckCircle,
  FaExclamationTriangle,
  FaSun,
  FaMoon,
} from 'react-icons/fa'

// ── Types ────────────────────────────────────────────────────────────────────
interface OrderItem {
  name: string
  quantity: number
  amount_total: number
}

interface Order {
  sessionId: string
  createdAt: number
  customerName?: string
  customerPhone?: string
  orderType: string
  items: OrderItem[]
  amountTotal: number
  taxTotal?: number
  // Delivery fields
  deliveryAddress?: DeliveryAddress
  deliveryTrackingUrl?: string
  deliveryStatus?: string
}

type OrderStatus = 'new' | 'active' | 'ready'
type Theme = 'light' | 'dark'

// ── Theme tokens ─────────────────────────────────────────────────────────────
// The global tailwind config overrides the `slate` palette to crimson/red for
// the customer-facing site. The kitchen UI intentionally opts out of that
// brand theming in favor of neutral, high-contrast grays so it reads at a
// glance on a busy line. We use Tailwind's default `zinc` palette (untouched
// by the global override) for pure charcoal/white surfaces.
function tokens(theme: Theme) {
  if (theme === 'light') {
    return {
      page: 'bg-white text-zinc-900',
      topBar: 'bg-white/95 border-zinc-200',
      heading: 'text-zinc-900',
      muted: 'text-zinc-500',
      subtle: 'text-zinc-400',
      hint: 'text-zinc-600',
      card: 'bg-white border-zinc-200 shadow-sm',
      cardNew: 'bg-white border-amber-500 shadow-md',
      cardReady: 'bg-zinc-50 border-zinc-200 opacity-70',
      cardTitle: 'text-zinc-900',
      itemText: 'text-zinc-800',
      itemPrice: 'text-zinc-500',
      dropoffBox: 'bg-zinc-100 text-zinc-700',
      dropoffLabel: 'text-zinc-500',
      accent: 'text-amber-600',
      accentInactive: 'text-zinc-400',
      badgeNew: 'bg-amber-500 text-white',
      badgeReady: 'bg-green-600 text-white',
      badgeActiveCount: 'bg-amber-500 text-white',
      badgeDeliveryCount: 'bg-amber-500 text-white',
      badgePickupCount: 'bg-zinc-200 text-zinc-800',
      badgeDelivery: 'bg-amber-100 text-amber-800',
      badgePickup: 'bg-zinc-100 text-zinc-700',
      btnReady: 'bg-green-600 hover:bg-green-700 text-white',
      btnReopen: 'bg-zinc-200 hover:bg-zinc-300 text-zinc-800',
      overdue: 'text-red-600',
      errorText: 'text-red-600',
      pinInput: 'bg-white text-zinc-900 border-zinc-300',
      pinFocus: 'focus:border-amber-500',
      pinError: 'border-red-500',
      toggle: 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-zinc-200',
      completedLabel: 'text-zinc-500',
    }
  }
  // dark / charcoal
  return {
    page: 'bg-zinc-950 text-white',
    topBar: 'bg-zinc-900/95 border-zinc-800',
    heading: 'text-white',
    muted: 'text-zinc-400',
    subtle: 'text-zinc-500',
    hint: 'text-zinc-400',
    card: 'bg-zinc-800 border-zinc-700',
    cardNew: 'bg-zinc-800 border-amber-400',
    cardReady: 'bg-zinc-900 border-zinc-800 opacity-60',
    cardTitle: 'text-white',
    itemText: 'text-zinc-200',
    itemPrice: 'text-zinc-500',
    dropoffBox: 'bg-zinc-900/60 text-zinc-300',
    dropoffLabel: 'text-zinc-500',
    accent: 'text-amber-400',
    accentInactive: 'text-zinc-500',
    badgeNew: 'bg-amber-400 text-zinc-900',
    badgeReady: 'bg-green-700 text-green-100',
    badgeActiveCount: 'bg-amber-400 text-zinc-900',
    badgeDeliveryCount: 'bg-amber-400 text-zinc-900',
    badgePickupCount: 'bg-zinc-700 text-zinc-200',
    badgeDelivery: 'bg-amber-400/15 text-amber-300',
    badgePickup: 'bg-zinc-700 text-zinc-300',
    btnReady: 'bg-green-600 hover:bg-green-500 text-white',
    btnReopen: 'bg-zinc-700 hover:bg-zinc-600 text-zinc-200',
    overdue: 'text-red-400',
    errorText: 'text-red-400',
    pinInput: 'bg-zinc-800 text-white border-zinc-600',
    pinFocus: 'focus:border-amber-400',
    pinError: 'border-red-500',
    toggle: 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-zinc-700',
    completedLabel: 'text-zinc-500',
  }
}

// ── Delivery status display config ───────────────────────────────────────────
function deliveryStatusConfig(theme: Theme): Record<string, { label: string; icon: JSX.Element; color: string }> {
  if (theme === 'light') {
    return {
      created:         { label: 'Awaiting driver',  icon: <FaClock />,                color: 'bg-zinc-200 text-zinc-800' },
      driver_assigned: { label: 'Driver assigned',  icon: <FaMotorcycle />,           color: 'bg-amber-500 text-white' },
      picked_up:       { label: 'Picked up',        icon: <FaShoppingBag />,          color: 'bg-amber-200 text-amber-900' },
      delivered:       { label: 'Delivered',        icon: <FaCheckCircle />,          color: 'bg-green-100 text-green-800' },
      cancelled:       { label: 'Cancelled',        icon: <FaExclamationTriangle />,  color: 'bg-red-100 text-red-800' },
      failed:          { label: 'Failed',           icon: <FaExclamationTriangle />,  color: 'bg-red-100 text-red-800' },
    }
  }
  return {
    created:         { label: 'Awaiting driver',  icon: <FaClock />,                color: 'bg-zinc-700 text-zinc-200' },
    driver_assigned: { label: 'Driver assigned',  icon: <FaMotorcycle />,           color: 'bg-amber-400 text-zinc-900' },
    picked_up:       { label: 'Picked up',        icon: <FaShoppingBag />,          color: 'bg-amber-700 text-amber-100' },
    delivered:       { label: 'Delivered',        icon: <FaCheckCircle />,          color: 'bg-green-700 text-green-100' },
    cancelled:       { label: 'Cancelled',        icon: <FaExclamationTriangle />,  color: 'bg-red-700 text-red-100' },
    failed:          { label: 'Failed',           icon: <FaExclamationTriangle />,  color: 'bg-red-700 text-red-100' },
  }
}

// ── Audio chime ──────────────────────────────────────────────────────────────
function playChime() {
  try {
    const ctx = new AudioContext()
    const notes = [880, 1100, 1320, 1760]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = freq
      const t = ctx.currentTime + i * 0.12
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.9, t + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4)
      osc.start(t)
      osc.stop(t + 0.4)
    })
  } catch { /* silently ignore if audio context is unavailable */ }
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const OVERDUE_MINUTES = 25

function timeAgo(unix: number): string {
  const secs = Math.floor(Date.now() / 1000) - unix
  if (secs < 60) return `${secs}s ago`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  return `${Math.floor(mins / 60)}h ${mins % 60}m ago`
}

function isOverdue(unix: number): boolean {
  const mins = Math.floor((Date.now() / 1000 - unix) / 60)
  return mins >= OVERDUE_MINUTES
}

function fmt(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

const POLL_INTERVAL = 10_000
const PIN = process.env.NEXT_PUBLIC_KITCHEN_PIN ?? '0000'

// ── Theme storage ────────────────────────────────────────────────────────────
const THEME_KEY = 'kitchen_theme'

function loadTheme(): Theme {
  if (typeof window === 'undefined') return 'dark'
  try {
    const raw = localStorage.getItem(THEME_KEY)
    return raw === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

function saveTheme(theme: Theme) {
  try { localStorage.setItem(THEME_KEY, theme) } catch { /* ignore */ }
}

// ── Theme Toggle ─────────────────────────────────────────────────────────────
function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  const t = tokens(theme)
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`inline-flex items-center justify-center w-9 h-9 rounded-lg border transition-colors ${t.toggle}`}
    >
      {theme === 'dark' ? <FaSun className="w-4 h-4" /> : <FaMoon className="w-4 h-4" />}
    </button>
  )
}

// ── PIN Gate ─────────────────────────────────────────────────────────────────
function PinGate({
  theme,
  onToggleTheme,
  onUnlock,
}: {
  theme: Theme
  onToggleTheme: () => void
  onUnlock: () => void
}) {
  const t = tokens(theme)
  const [digits, setDigits] = useState(['', '', '', ''])
  const [error, setError] = useState(false)
  const refs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ]

  useEffect(() => { refs[0].current?.focus() }, [])

  function handleDigit(i: number, val: string) {
    if (!/^\d?$/.test(val)) return
    const next = [...digits]
    next[i] = val.slice(-1)
    setDigits(next)
    setError(false)
    if (val && i < 3) refs[i + 1].current?.focus()
    if (val && i === 3) {
      const pin = [...next.slice(0, 3), val.slice(-1)].join('')
      if (pin === PIN) {
        sessionStorage.setItem('kitchen_auth', '1')
        onUnlock()
      } else {
        setError(true)
        setDigits(['', '', '', ''])
        setTimeout(() => refs[0].current?.focus(), 50)
      }
    }
  }

  function handleKey(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      refs[i - 1].current?.focus()
    }
  }

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center gap-8 relative ${t.page}`}>
      <div className="absolute top-4 right-4">
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      </div>
      <h1 className={`font-display italic text-4xl ${t.heading}`}>Kitchen Display</h1>
      <p className={`text-sm ${t.muted}`}>Enter your 4-digit PIN</p>
      <div className="flex gap-4">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={refs[i]}
            type="password"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={e => handleDigit(i, e.target.value)}
            onKeyDown={e => handleKey(i, e)}
            className={`w-14 h-16 text-center text-2xl font-bold rounded-xl border-2 outline-none transition-colors ${t.pinInput} ${
              error ? t.pinError : t.pinFocus
            }`}
          />
        ))}
      </div>
      {error && <p className={`text-sm ${t.errorText}`}>Incorrect PIN</p>}
    </div>
  )
}

// ── Delivery Status Badge ─────────────────────────────────────────────────────
function DeliveryStatusBadge({
  theme,
  status,
  trackingUrl,
}: {
  theme: Theme
  status?: string
  trackingUrl?: string
}) {
  const t = tokens(theme)
  const statusMap = deliveryStatusConfig(theme)
  const config = status ? statusMap[status] : statusMap.created

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${config.color}`}>
        <span>{config.icon}</span>
        {config.label}
      </span>
      {trackingUrl && (
        <a
          href={trackingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`text-[10px] font-bold underline transition-colors ${t.accent} hover:opacity-80`}
          onClick={e => e.stopPropagation()}
        >
          Track driver →
        </a>
      )}
    </div>
  )
}

// ── Order Card ────────────────────────────────────────────────────────────────
function OrderCard({
  theme,
  order,
  status,
  onMarkReady,
  onMarkActive,
}: {
  theme: Theme
  order: Order
  status: OrderStatus
  onMarkReady: () => void
  onMarkActive: () => void
}) {
  const t = tokens(theme)
  const [, forceUpdate] = useState(0)
  useEffect(() => {
    const tick = setInterval(() => forceUpdate(n => n + 1), 30_000)
    return () => clearInterval(tick)
  }, [])

  const shortId = order.sessionId.slice(-6).toUpperCase()
  const isDelivery = order.orderType === 'delivery'

  const cardSurface =
    status === 'new'
      ? t.cardNew
      : status === 'ready'
      ? t.cardReady
      : t.card

  return (
    <div className={`rounded-2xl border flex flex-col gap-3 p-4 transition-colors ${cardSurface}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`font-bold text-lg ${t.cardTitle}`}>#{shortId}</span>
            {status === 'new' && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${t.badgeNew}`}>
                New
              </span>
            )}
            {status === 'ready' && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${t.badgeReady}`}>
                Ready
              </span>
            )}
            {/* Delivery/Pickup badge */}
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${
              isDelivery ? t.badgeDelivery : t.badgePickup
            }`}>
              {isDelivery ? <><FaMotorcycle /> Delivery</> : <><FaShoppingBag /> Pickup</>}
            </span>
          </div>
          {status !== 'ready' && isOverdue(order.createdAt) ? (
            <p className={`text-xs mt-0.5 flex items-center gap-1 ${t.overdue}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="inline w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              {timeAgo(order.createdAt)}
            </p>
          ) : (
            <p className={`text-xs mt-0.5 ${t.muted}`}>{timeAgo(order.createdAt)}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className={`font-bold ${t.cardTitle}`}>{fmt(order.amountTotal)}</p>
        </div>
      </div>

      {/* Delivery status */}
      {isDelivery && (
        <DeliveryStatusBadge
          theme={theme}
          status={order.deliveryStatus}
          trackingUrl={order.deliveryTrackingUrl}
        />
      )}

      {/* Delivery address */}
      {isDelivery && order.deliveryAddress && (
        <div className={`text-xs rounded-lg px-3 py-2 ${t.dropoffBox}`}>
          <p className={`font-medium mb-0.5 uppercase tracking-wide text-[10px] ${t.dropoffLabel}`}>Drop off</p>
          <p>
            {order.deliveryAddress.street}
            {order.deliveryAddress.unit ? ` #${order.deliveryAddress.unit}` : ''},&nbsp;
            {order.deliveryAddress.city}, {order.deliveryAddress.state} {order.deliveryAddress.zip}
          </p>
        </div>
      )}

      {/* Customer info */}
      {(order.customerName || order.customerPhone) && (
        <div className="text-sm">
          {order.customerName && <p className={`font-medium ${t.cardTitle}`}>{order.customerName}</p>}
          {order.customerPhone && (
            <a
              href={`tel:${order.customerPhone}`}
              className={`font-medium ${status !== 'ready' ? t.accent : t.accentInactive}`}
            >
              {order.customerPhone}
            </a>
          )}
        </div>
      )}

      {/* Items */}
      <ul className="space-y-1">
        {order.items.map((item, i) => (
          <li key={i} className="flex items-baseline justify-between gap-2">
            <span className={`text-sm ${t.itemText}`}>
              <span className={`font-bold mr-1.5 ${t.accent}`}>{item.quantity}×</span>
              {item.name}
            </span>
            <span className={`text-xs tabular-nums shrink-0 ${t.itemPrice}`}>{fmt(item.amount_total)}</span>
          </li>
        ))}
        {order.taxTotal ? (
          <li className="flex items-baseline justify-between gap-2 border-t border-zinc-200/60 dark:border-zinc-700/60 pt-1 mt-1">
            <span className={`text-xs ${t.muted}`}>Tax</span>
            <span className={`text-xs tabular-nums shrink-0 ${t.muted}`}>{fmt(order.taxTotal)}</span>
          </li>
        ) : null}
      </ul>

      {/* Actions */}
      {status !== 'ready' ? (
        <button
          type="button"
          onClick={onMarkReady}
          className={`mt-1 w-full py-2.5 rounded-xl font-semibold text-sm transition-colors active:scale-95 ${t.btnReady}`}
        >
          {isDelivery ? 'Ready for Pickup by Driver' : 'Mark Ready'}
        </button>
      ) : (
        <button
          type="button"
          onClick={onMarkActive}
          className={`mt-1 w-full py-2.5 rounded-xl font-semibold text-sm transition-colors ${t.btnReopen}`}
        >
          Reopen
        </button>
      )}
    </div>
  )
}

const STORAGE_KEY = 'kitchen_ready_statuses'

function loadStoredStatuses(): Record<string, OrderStatus> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveStoredStatuses(statuses: Record<string, OrderStatus>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(statuses))
  } catch { /* ignore */ }
}

// ── Kitchen Display ───────────────────────────────────────────────────────────
function KitchenDisplay({
  theme,
  onToggleTheme,
}: {
  theme: Theme
  onToggleTheme: () => void
}) {
  const t = tokens(theme)
  const [orders, setOrders] = useState<Order[]>([])
  const [statuses, setStatuses] = useState<Record<string, OrderStatus>>({})
  const [countdown, setCountdown] = useState(POLL_INTERVAL / 1000)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const knownIds = useRef<Set<string>>(new Set())
  const firstLoad = useRef(true)
  const countdownRef = useRef(POLL_INTERVAL / 1000)

  // Load persisted ready statuses from localStorage on mount
  useEffect(() => {
    setStatuses(loadStoredStatuses())
  }, [])

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders?pin=${encodeURIComponent(PIN)}`)
      if (!res.ok) return
      const { orders: fetched }: { orders: Order[] } = await res.json()

      const stored = loadStoredStatuses()
      const newOnes: string[] = []
      fetched.forEach(o => {
        if (!knownIds.current.has(o.sessionId)) {
          knownIds.current.add(o.sessionId)
          if (!firstLoad.current && stored[o.sessionId] !== 'ready') {
            newOnes.push(o.sessionId)
          }
        }
      })

      if (newOnes.length > 0) {
        playChime()
        setStatuses(prev => {
          const next = { ...prev }
          newOnes.forEach(id => { next[id] = 'new' })
          saveStoredStatuses(next)
          return next
        })
      }

      setOrders(fetched)
      setLastUpdated(new Date())
      countdownRef.current = POLL_INTERVAL / 1000
      setCountdown(POLL_INTERVAL / 1000)
      firstLoad.current = false
    } catch {
      // network error — retry next cycle
    }
  }, [])

  // Initial fetch + polling
  useEffect(() => {
    fetchOrders()
    const poll = setInterval(fetchOrders, POLL_INTERVAL)
    return () => clearInterval(poll)
  }, [fetchOrders])

  // Countdown ticker
  useEffect(() => {
    const tick = setInterval(() => {
      countdownRef.current = Math.max(0, countdownRef.current - 1)
      setCountdown(countdownRef.current)
    }, 1000)
    return () => clearInterval(tick)
  }, [])

  function getStatus(id: string): OrderStatus {
    return statuses[id] ?? 'active'
  }

  async function markReady(id: string) {
    setStatuses(prev => {
      const next = { ...prev, [id]: 'ready' as OrderStatus }
      saveStoredStatuses(next)
      return next
    })
    try {
      await fetch(`/api/orders/${id}/ready`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: PIN }),
      })
    } catch {
      // non-critical
    }
  }

  function markActive(id: string) {
    setStatuses(prev => {
      const next = { ...prev, [id]: 'active' as OrderStatus }
      saveStoredStatuses(next)
      return next
    })
  }

  const active = orders.filter(o => getStatus(o.sessionId) !== 'ready')
  const done = orders.filter(o => getStatus(o.sessionId) === 'ready')
  const deliveryCount = active.filter(o => o.orderType === 'delivery').length
  const pickupCount = active.filter(o => o.orderType !== 'delivery').length

  return (
    <div className={`min-h-screen ${t.page}`}>
      {/* Top bar */}
      <div className={`sticky top-0 z-10 backdrop-blur border-b px-4 py-3 flex items-center justify-between gap-3 ${t.topBar}`}>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className={`font-display italic text-xl ${t.heading}`}>Kitchen Display</h1>
          {active.length > 0 && (
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${t.badgeActiveCount}`}>
              {active.length} active
            </span>
          )}
          {deliveryCount > 0 && (
            <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${t.badgeDeliveryCount}`}>
              <FaMotorcycle /> {deliveryCount} delivery
            </span>
          )}
          {pickupCount > 0 && (
            <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${t.badgePickupCount}`}>
              <FaShoppingBag /> {pickupCount} pickup
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className={`text-xs text-right ${t.subtle}`}>
            <p>Refreshing in {countdown}s</p>
            {lastUpdated && <p>Updated {lastUpdated.toLocaleTimeString()}</p>}
          </div>
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </div>
      </div>

      <div className="p-4 max-w-5xl mx-auto">
        {active.length === 0 && done.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <p className={`text-lg ${t.muted}`}>No orders in the last 24 hours</p>
            <p className={`text-sm ${t.subtle}`}>Orders will appear here automatically</p>
          </div>
        )}

        {active.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
            {active.map(o => (
              <OrderCard
                key={o.sessionId}
                theme={theme}
                order={o}
                status={getStatus(o.sessionId)}
                onMarkReady={() => markReady(o.sessionId)}
                onMarkActive={() => markActive(o.sessionId)}
              />
            ))}
          </div>
        )}

        {done.length > 0 && (
          <>
            <p className={`text-xs font-semibold uppercase tracking-widest mb-3 ${t.completedLabel}`}>
              Completed ({done.length})
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {done.map(o => (
                <OrderCard
                  key={o.sessionId}
                  theme={theme}
                  order={o}
                  status="ready"
                  onMarkReady={() => markReady(o.sessionId)}
                  onMarkActive={() => markActive(o.sessionId)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function KitchenPage() {
  const [unlocked, setUnlocked] = useState(false)
  const [theme, setTheme] = useState<Theme>('dark')

  // Hydrate theme + auth from storage on mount
  useEffect(() => {
    setTheme(loadTheme())
    if (sessionStorage.getItem('kitchen_auth') === '1') setUnlocked(true)
  }, [])

  function toggleTheme() {
    setTheme(prev => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark'
      saveTheme(next)
      return next
    })
  }

  if (!unlocked) {
    return <PinGate theme={theme} onToggleTheme={toggleTheme} onUnlock={() => setUnlocked(true)} />
  }
  return <KitchenDisplay theme={theme} onToggleTheme={toggleTheme} />
}
