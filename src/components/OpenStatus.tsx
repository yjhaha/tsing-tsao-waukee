'use client'

import { useEffect, useState } from 'react'

// Hours in Central Time (America/Chicago)
// [dayOfWeek (0=Sun…6=Sat), openHour, openMin, closeHour, closeMin]
const SCHEDULE: [number, number, number, number, number][] = [
  [0, 11, 0, 20, 30], // Sunday    11:00 AM – 8:30 PM
  [1, 11, 0, 21,  0], // Monday    11:00 AM – 9:00 PM
  [2, 11, 0, 21,  0], // Tuesday
  [3, 11, 0, 21,  0], // Wednesday
  [4, 11, 0, 21,  0], // Thursday
  [5, 11, 0, 21, 30], // Friday    11:00 AM – 9:30 PM
  [6, 11, 0, 21, 30], // Saturday
]

function isOpen(): boolean {
  // Use Intl to get Central Time parts
  const now = new Date()
  const ct = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    hour: 'numeric',
    minute: 'numeric',
    weekday: 'short',
    hour12: false,
  }).formatToParts(now)

  const parts: Record<string, string> = {}
  ct.forEach(p => { parts[p.type] = p.value })

  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  const dow = dayMap[parts.weekday] ?? -1
  const h = parseInt(parts.hour, 10)
  const m = parseInt(parts.minute, 10)
  const totalMins = h * 60 + m

  const row = SCHEDULE.find(r => r[0] === dow)
  if (!row) return false
  const [, oh, om, ch, cm] = row
  return totalMins >= oh * 60 + om && totalMins < ch * 60 + cm
}

export default function OpenStatus() {
  const [open, setOpen] = useState<boolean | null>(null)

  useEffect(() => {
    setOpen(isOpen())
    const id = setInterval(() => setOpen(isOpen()), 60_000)
    return () => clearInterval(id)
  }, [])

  if (open === null) return null // SSR: render nothing until hydrated

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
      open ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'
    }`}>
      <span className={`relative flex h-2 w-2`}>
        {open && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${open ? 'bg-green-400' : 'bg-red-500'}`} />
      </span>
      {open ? 'Open Now' : 'Closed'}
    </div>
  )
}
