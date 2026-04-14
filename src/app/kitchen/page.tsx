'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

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
}

type OrderStatus = 'new' | 'active' | 'ready'

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

// ── PIN Gate ─────────────────────────────────────────────────────────────────
function PinGate({ onUnlock }: { onUnlock: () => void }) {
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
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-8">
      <h1 className="font-display italic text-4xl text-white">Kitchen Display</h1>
      <p className="text-slate-400 text-sm">Enter your 4-digit PIN</p>
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
            className={`w-14 h-16 text-center text-2xl font-bold rounded-xl border-2 bg-slate-800 text-white outline-none transition-colors ${
              error ? 'border-red-500' : 'border-slate-600 focus:border-brand-gold'
            }`}
          />
        ))}
      </div>
      {error && <p className="text-red-400 text-sm">Incorrect PIN</p>}
    </div>
  )
}

// ── Order Card ────────────────────────────────────────────────────────────────
function OrderCard({
  order,
  status,
  onMarkReady,
  onMarkActive,
}: {
  order: Order
  status: OrderStatus
  onMarkReady: () => void
  onMarkActive: () => void
}) {
  const [, forceUpdate] = useState(0)
  useEffect(() => {
    const t = setInterval(() => forceUpdate(n => n + 1), 30_000)
    return () => clearInterval(t)
  }, [])

  const shortId = order.sessionId.slice(-6).toUpperCase()

  return (
    <div className={`rounded-2xl border flex flex-col gap-3 p-4 transition-colors ${
      status === 'new'
        ? 'bg-slate-800 border-brand-gold'
        : status === 'ready'
        ? 'bg-slate-900 border-slate-700 opacity-60'
        : 'bg-slate-800 border-slate-700'
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-lg">#{shortId}</span>
            {status === 'new' && (
              <span className="bg-brand-gold text-slate-900 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                New
              </span>
            )}
            {status === 'ready' && (
              <span className="bg-green-700 text-green-100 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                Ready
              </span>
            )}
          </div>
          {status !== 'ready' && isOverdue(order.createdAt) ? (
            <p className="text-red-400 text-xs mt-0.5 flex items-center gap-1">
              {/* clock icon */}
              <svg xmlns="http://www.w3.org/2000/svg" className="inline w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              {timeAgo(order.createdAt)}
            </p>
          ) : (
            <p className="text-slate-400 text-xs mt-0.5">{timeAgo(order.createdAt)}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-white font-bold">{fmt(order.amountTotal)}</p>
          <p className="text-slate-500 text-xs capitalize">{order.orderType}</p>
        </div>
      </div>

      {/* Customer info */}
      {(order.customerName || order.customerPhone) && (
        <div className="text-sm">
          {order.customerName && <p className="text-white font-medium">{order.customerName}</p>}
          {order.customerPhone && (
            <a
              href={`tel:${order.customerPhone}`}
              className={`font-medium ${status !== 'ready' ? 'text-brand-gold' : 'text-slate-500'}`}
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
            <span className="text-slate-200 text-sm">
              <span className="text-brand-gold font-bold mr-1.5">{item.quantity}×</span>
              {item.name}
            </span>
            <span className="text-slate-500 text-xs tabular-nums shrink-0">{fmt(item.amount_total)}</span>
          </li>
        ))}
      </ul>

      {/* Actions */}
      {status !== 'ready' ? (
        <button
          type="button"
          onClick={onMarkReady}
          className="mt-1 w-full py-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-white font-semibold text-sm transition-colors active:scale-95"
        >
          Mark Ready
        </button>
      ) : (
        <button
          type="button"
          onClick={onMarkActive}
          className="mt-1 w-full py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold text-sm transition-colors"
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
function KitchenDisplay() {
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
      const res = await fetch('/api/orders')
      if (!res.ok) return
      const { orders: fetched }: { orders: Order[] } = await res.json()

      const stored = loadStoredStatuses()
      const newOnes: string[] = []
      fetched.forEach(o => {
        if (!knownIds.current.has(o.sessionId)) {
          knownIds.current.add(o.sessionId)
          // Only chime if it's not already known as ready (from localStorage)
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
      // Reset countdown
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

  // Countdown ticker — driven by countdownRef so it stays in sync with fetch
  useEffect(() => {
    const t = setInterval(() => {
      countdownRef.current = Math.max(0, countdownRef.current - 1)
      setCountdown(countdownRef.current)
    }, 1000)
    return () => clearInterval(t)
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
      await fetch(`/api/orders/${id}/ready`, { method: 'POST' })
    } catch {
      // non-critical — order is already marked ready in UI
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

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="font-display italic text-xl text-white">Kitchen Display</h1>
          <span className="bg-brand-gold text-slate-900 text-xs font-bold px-2 py-0.5 rounded-full">
            {active.length} active
          </span>
        </div>
        <div className="text-slate-500 text-xs text-right">
          <p>Refreshing in {countdown}s</p>
          {lastUpdated && <p>Updated {lastUpdated.toLocaleTimeString()}</p>}
        </div>
      </div>

      <div className="p-4 max-w-5xl mx-auto">
        {/* Active orders */}
        {active.length === 0 && done.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <p className="text-slate-500 text-lg">No orders in the last 24 hours</p>
            <p className="text-slate-600 text-sm">Orders will appear here automatically</p>
          </div>
        )}

        {active.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
            {active.map(o => (
              <OrderCard
                key={o.sessionId}
                order={o}
                status={getStatus(o.sessionId)}
                onMarkReady={() => markReady(o.sessionId)}
                onMarkActive={() => markActive(o.sessionId)}
              />
            ))}
          </div>
        )}

        {/* Ready orders */}
        {done.length > 0 && (
          <>
            <p className="text-slate-600 text-xs font-semibold uppercase tracking-widest mb-3">
              Completed ({done.length})
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {done.map(o => (
                <OrderCard
                  key={o.sessionId}
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

  useEffect(() => {
    if (sessionStorage.getItem('kitchen_auth') === '1') setUnlocked(true)
  }, [])

  if (!unlocked) return <PinGate onUnlock={() => setUnlocked(true)} />
  return <KitchenDisplay />
}
