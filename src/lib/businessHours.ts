// Business hours for Tsing Tsao Waukee (all times in America/Chicago / CT)
//   Mon–Thu:  11:00 AM – 9:00 PM
//   Fri–Sat:  11:00 AM – 9:30 PM
//   Sun:      11:00 AM – 8:30 PM

const TZ = 'America/Chicago'

// [openMinutes, closeMinutes] indexed by CT day-of-week (0=Sun … 6=Sat)
const HOURS: [number, number][] = [
  [11 * 60,       20 * 60 + 30], // Sun  11:00 AM – 8:30 PM
  [11 * 60,       21 * 60],      // Mon  11:00 AM – 9:00 PM
  [11 * 60,       21 * 60],      // Tue
  [11 * 60,       21 * 60],      // Wed
  [11 * 60,       21 * 60],      // Thu
  [11 * 60,       21 * 60 + 30], // Fri  11:00 AM – 9:30 PM
  [11 * 60,       21 * 60 + 30], // Sat
]

// ── helpers ───────────────────────────────────────────────────────────────────

/** Returns the CT offset in minutes (e.g. -360 for CST, -300 for CDT). */
function ctOffsetMinutes(date: Date): number {
  const s = new Intl.DateTimeFormat('en-US', { timeZone: TZ, timeZoneName: 'shortOffset' })
    .formatToParts(date)
    .find(p => p.type === 'timeZoneName')?.value ?? 'GMT-6'
  const m = s.match(/GMT([+-])(\d+)(?::(\d+))?/)
  const sign = m?.[1] === '+' ? 1 : -1
  return sign * (parseInt(m?.[2] ?? '6', 10) * 60 + parseInt(m?.[3] ?? '0', 10))
}

/** Returns { dow, totalMins } in CT wall-clock time. */
function ctParts(date: Date): { dow: number; totalMins: number } {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, weekday: 'short', hour: 'numeric', minute: '2-digit', hour12: false,
  })
  const parts = Object.fromEntries(f.formatToParts(date).map(p => [p.type, p.value]))
  const dow = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(parts.weekday)
  const totalMins = parseInt(parts.hour, 10) * 60 + parseInt(parts.minute, 10)
  return { dow, totalMins }
}

/**
 * Returns a UTC Date whose CT wall-clock time equals `totalMins` minutes past
 * midnight on the same CT calendar day as `base`.
 */
function ctMidnightPlus(base: Date, totalMins: number): Date {
  // Get the CT calendar date (YYYY-MM-DD) for `base`
  const datePart = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(base) // "YYYY-MM-DD"
  const h = Math.floor(totalMins / 60)
  const m = totalMins % 60
  // Build a point in time by treating the CT date+time as if it were UTC,
  // then shift by the CT UTC-offset to get the true UTC instant.
  const pseudoUtcMs = Date.parse(`${datePart}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00Z`)
  const result = new Date(pseudoUtcMs - ctOffsetMinutes(base) * 60_000)
  return result
}

// ── public API ────────────────────────────────────────────────────────────────

export function isOpen(now = new Date()): boolean {
  const { dow, totalMins } = ctParts(now)
  const [open, close] = HOURS[dow]
  return totalMins >= open && totalMins < close
}

/** Returns the next opening time as a UTC Date. */
export function getNextOpening(now = new Date()): Date {
  const candidate = new Date(now)
  for (let i = 0; i < 8; i++) {
    const { dow, totalMins } = ctParts(candidate)
    const [open] = HOURS[dow]
    if (totalMins < open) {
      return ctMidnightPlus(candidate, open)
    }
    // Advance 24 h (always past close) and check the next day
    candidate.setTime(candidate.getTime() + 24 * 60 * 60_000)
  }
  // Unreachable for any realistic schedule
  return ctMidnightPlus(candidate, HOURS[ctParts(candidate).dow][0])
}

export function formatNextOpening(date: Date): string {
  return date.toLocaleString('en-US', {
    timeZone: TZ,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}
