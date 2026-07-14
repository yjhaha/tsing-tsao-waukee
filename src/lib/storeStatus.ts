import { redis } from './orderStore'
import { isOpen, getNextOpening } from './businessHours'

const CLOSURE_KEY = 'store:closure'
const MAX_TTL_SECONDS = 60 * 60 * 24 * 90 // 90 days — defensive cap, not a product limit

export interface ClosureOverride {
  reason: string | null
  until: string | null // ISO timestamp; null = closed indefinitely until manually reopened
  setAt: number
}

export interface StoreStatus {
  open: boolean
  reason: string | null
  nextOpening: string | null // ISO; null when open, or when closure is indefinite
  override: { reason: string | null; until: string | null } | null
}

export async function getClosureOverride(): Promise<ClosureOverride | null> {
  const val = await redis.get<ClosureOverride>(CLOSURE_KEY)
  if (!val) return null
  if (val.until && new Date(val.until).getTime() <= Date.now()) return null
  return val
}

export async function setClosureOverride(reason: string | null, until: string | null): Promise<void> {
  const override: ClosureOverride = { reason, until, setAt: Date.now() }
  if (until) {
    const ttl = Math.min(MAX_TTL_SECONDS, Math.max(60, Math.ceil((new Date(until).getTime() - Date.now()) / 1000)))
    await redis.set(CLOSURE_KEY, override, { ex: ttl })
  } else {
    await redis.set(CLOSURE_KEY, override)
  }
}

export async function clearClosureOverride(): Promise<void> {
  await redis.del(CLOSURE_KEY)
}

/** Returns the next moment the schedule says the store is open, at-or-after `from`. */
function nextOpeningAtOrAfter(from: Date): Date {
  return isOpen(from) ? from : getNextOpening(from)
}

export async function getStoreStatus(now = new Date()): Promise<StoreStatus> {
  const override = await getClosureOverride()

  if (override) {
    const nextOpening = override.until ? nextOpeningAtOrAfter(new Date(override.until)) : null
    return {
      open: false,
      reason: override.reason,
      nextOpening: nextOpening ? nextOpening.toISOString() : null,
      override: { reason: override.reason, until: override.until },
    }
  }

  const open = isOpen(now)
  return {
    open,
    reason: null,
    nextOpening: open ? null : getNextOpening(now).toISOString(),
    override: null,
  }
}
