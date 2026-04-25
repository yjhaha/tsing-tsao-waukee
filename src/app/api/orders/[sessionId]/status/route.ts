import { NextRequest, NextResponse } from 'next/server'
import { updateOrderStatus } from '@/lib/orderStore'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const body = await req.json().catch(() => ({}))
  if (!body.pin || body.pin !== process.env.NEXT_PUBLIC_KITCHEN_PIN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { sessionId } = await params
  const status = body.status as string

  if (status !== 'new' && status !== 'active' && status !== 'ready') {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  await updateOrderStatus(sessionId, status)
  return NextResponse.json({ ok: true })
}
