/**
 * DoorDash Drive API client (v2).
 *
 * Authentication uses a short-lived JWT signed with HMAC-SHA256.
 * No extra npm packages needed — only Node's built-in `crypto`.
 *
 * Required env vars:
 *   DOORDASH_DEVELOPER_ID
 *   DOORDASH_KEY_ID
 *   DOORDASH_SIGNING_SECRET   ← base64-encoded signing secret from the DD portal
 *   DOORDASH_BASE_URL         ← optional; defaults to production
 *
 * Docs: https://developer.doordash.com/en-US/docs/drive/tutorials/get_started
 */

import crypto from 'crypto'
import { DeliveryAddress, DeliveryQuote, DeliveryDispatch, DispatchParams, LiveDeliveryStatus } from './types'
import { getDeliveryConfig } from './config'

const BASE_URL =
  process.env.DOORDASH_BASE_URL ?? 'https://openapi.doordash.com'

// ── JWT ───────────────────────────────────────────────────────────────────────

function base64url(input: Buffer | string): string {
  const b = typeof input === 'string' ? Buffer.from(input) : input
  return b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function buildJwt(): string {
  const developerId = process.env.DOORDASH_DEVELOPER_ID!
  const keyId = process.env.DOORDASH_KEY_ID!
  const signingSecret = process.env.DOORDASH_SIGNING_SECRET!

  const now = Math.floor(Date.now() / 1000)

  const header = base64url(
    JSON.stringify({ alg: 'HS256', 'dd-ver': 'DD-JWT-V1', kid: keyId }),
  )
  const payload = base64url(
    JSON.stringify({ aud: 'doordash', iss: developerId, exp: now + 300, iat: now }),
  )

  const sigInput = `${header}.${payload}`
  // DD signing secret is base64-encoded in the portal
  const secret = Buffer.from(signingSecret, 'base64')
  const sig = crypto.createHmac('sha256', secret).update(sigInput).digest()
  return `${sigInput}.${base64url(sig)}`
}

// ── HTTP helper ───────────────────────────────────────────────────────────────

async function ddFetch<T>(
  method: 'GET' | 'POST' | 'PATCH',
  path: string,
  body?: object,
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${buildJwt()}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const text = await res.text()
  if (!res.ok) {
    throw new Error(
      `DoorDash Drive API ${res.status} ${res.statusText}: ${text}`,
    )
  }
  try {
    return JSON.parse(text) as T
  } catch {
    return text as unknown as T
  }
}

// ── Address formatter ─────────────────────────────────────────────────────────

function formatAddress(a: DeliveryAddress): string {
  const parts = [a.street]
  if (a.unit) parts.push(`#${a.unit}`)
  parts.push(`${a.city}, ${a.state} ${a.zip}`)
  return parts.join(', ')
}

// ── E.164 phone normalizer ────────────────────────────────────────────────────

function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  return digits.startsWith('1') ? `+${digits}` : `+1${digits}`
}

// ── Quote ─────────────────────────────────────────────────────────────────────

interface DdQuoteResponse {
  external_delivery_id: string
  fee: number
  expires_at?: string
  pickup_time_estimated?: string
  dropoff_time_estimated?: string
}

/**
 * Request a delivery quote from DoorDash Drive.
 * The `externalDeliveryId` should be unique per order (e.g. `delivery_<stripeSessionId>`).
 */
export async function getDoorDashQuote(
  externalDeliveryId: string,
  dropoffAddress: DeliveryAddress,
  orderValueCents: number,
): Promise<DeliveryQuote> {
  const config = getDeliveryConfig()

  const raw = await ddFetch<DdQuoteResponse>('POST', '/drive/v2/quotes', {
    external_delivery_id: externalDeliveryId,
    pickup_address: formatAddress(config.address),
    pickup_business_name: config.restaurantName,
    pickup_phone_number: toE164(config.phone),
    dropoff_address: formatAddress(dropoffAddress),
    dropoff_phone_number: '+15550000000', // placeholder — real number set at dispatch
    order_value: orderValueCents,
    currency: 'USD',
  })

  // Parse ETA minutes if provided
  let pickupEtaMinutes: number | undefined
  let dropoffEtaMinutes: number | undefined
  if (raw.pickup_time_estimated) {
    const diff = new Date(raw.pickup_time_estimated).getTime() - Date.now()
    pickupEtaMinutes = Math.round(diff / 60_000)
  }
  if (raw.dropoff_time_estimated) {
    const diff = new Date(raw.dropoff_time_estimated).getTime() - Date.now()
    dropoffEtaMinutes = Math.round(diff / 60_000)
  }

  return {
    externalDeliveryId: raw.external_delivery_id,
    providerFeeCents: raw.fee ?? 700,
    customerFeeCents: config.customerFeeCents,
    restaurantFeeCents: config.restaurantFeeCents,
    expiresAt: raw.expires_at,
    pickupEtaMinutes,
    dropoffEtaMinutes,
  }
}

// ── Dispatch ──────────────────────────────────────────────────────────────────

interface DdDeliveryResponse {
  external_delivery_id: string
  delivery_status: string
  tracking_url: string
}

// DispatchParams is defined in types.ts — re-exported here for convenience

/**
 * Create a real delivery on DoorDash Drive (called after payment is confirmed).
 * Pass the same `externalDeliveryId` that was used for the quote.
 */
export async function createDoorDashDelivery(
  params: DispatchParams,
): Promise<DeliveryDispatch> {
  const config = getDeliveryConfig()

  const raw = await ddFetch<DdDeliveryResponse>('POST', '/drive/v2/deliveries', {
    external_delivery_id: params.externalDeliveryId,
    pickup_address: formatAddress(config.address),
    pickup_business_name: config.restaurantName,
    pickup_phone_number: toE164(config.phone),
    dropoff_address: formatAddress(params.dropoffAddress),
    dropoff_business_name: params.dropoffName,
    dropoff_phone_number: toE164(params.dropoffPhone),
    dropoff_instructions: params.dropoffInstructions ?? '',
    order_value: params.orderValueCents,
    currency: 'USD',
  })

  return {
    externalDeliveryId: raw.external_delivery_id,
    trackingUrl: raw.tracking_url,
    status: (raw.delivery_status as DeliveryDispatch['status']) ?? 'created',
  }
}

// ── Delivery status fetch (with live dasher location + ETA) ──────────────────

interface DdDeliveryStatusResponse {
  delivery_status: string
  tracking_url: string
  dropoff_time_estimated?: string  // ISO-8601
  dasher?: {
    name?: string
    location?: { lat: number; lng: number }
  }
}

/** Fetch the latest status of a delivery (for polling). */
export async function getDoorDashDeliveryStatus(
  externalDeliveryId: string,
): Promise<LiveDeliveryStatus> {
  const raw = await ddFetch<DdDeliveryStatusResponse>(
    'GET',
    `/drive/v2/deliveries/${encodeURIComponent(externalDeliveryId)}`,
  )
  return {
    status: raw.delivery_status,
    trackingUrl: raw.tracking_url,
    courierLat: raw.dasher?.location?.lat,
    courierLng: raw.dasher?.location?.lng,
    courierName: raw.dasher?.name,
    dropoffEtaAt: raw.dropoff_time_estimated,
  }
}
