'use client'

import { useEffect, useState } from 'react'

interface StoreStatus {
  open: boolean
  reason: string | null
}

async function fetchStatus(): Promise<StoreStatus | null> {
  try {
    const res = await fetch('/api/store-status', { cache: 'no-store' })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export default function OpenStatus() {
  const [status, setStatus] = useState<StoreStatus | null>(null)

  useEffect(() => {
    let cancelled = false
    function refresh() {
      fetchStatus().then(s => { if (!cancelled && s) setStatus(s) })
    }
    refresh()
    const id = setInterval(refresh, 60_000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  if (status === null) return null // render nothing until first fetch resolves

  const { open, reason } = status

  return (
    <div
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
        open ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'
      }`}
      title={!open && reason ? `Closed — ${reason}` : undefined}
    >
      <span className="relative flex h-2 w-2">
        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${open ? 'bg-green-400' : 'bg-red-500'}`} />
        <span className={`relative inline-flex rounded-full h-2 w-2 ${open ? 'bg-green-400' : 'bg-red-500'}`} />
      </span>
      {open ? 'Open Now' : 'Closed'}
    </div>
  )
}
