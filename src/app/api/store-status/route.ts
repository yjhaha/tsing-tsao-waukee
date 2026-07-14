import { NextRequest, NextResponse } from 'next/server'
import { getStoreStatus, setClosureOverride, clearClosureOverride } from '@/lib/storeStatus'

// Never cache this route — closure state must always be live
export const dynamic = 'force-dynamic'

const MAX_REASON_LENGTH = 200

export async function GET() {
  const status = await getStoreStatus()
  return NextResponse.json(status)
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  if (!body.pin || body.pin !== process.env.NEXT_PUBLIC_KITCHEN_PIN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const closed = body.closed === true

  if (!closed) {
    await clearClosureOverride()
    return NextResponse.json(await getStoreStatus())
  }

  let until: string | null = null
  if (body.until) {
    const parsed = new Date(body.until)
    if (isNaN(parsed.getTime()) || parsed.getTime() <= Date.now()) {
      return NextResponse.json({ error: 'invalid_until' }, { status: 400 })
    }
    until = parsed.toISOString()
  }

  let reason: string | null = null
  if (typeof body.reason === 'string' && body.reason.trim()) {
    reason = body.reason.trim().slice(0, MAX_REASON_LENGTH)
  }

  await setClosureOverride(reason, until)
  return NextResponse.json(await getStoreStatus())
}
