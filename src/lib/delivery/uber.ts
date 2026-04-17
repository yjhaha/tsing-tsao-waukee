/**
 * Uber Direct API client (Deliveries v1).
 *
 * Authentication: OAuth 2.0 client credentials flow.
 * Tokens are short-lived (~1 hour) and cached in-process.
 *
 * Required env vars:
 *   UBER_CLIENT_ID
 *   UBER_CLIENT_SECRET
 *   UBER_CUSTOMER_ID   ← your organization/customer UUID from direct.uber.com
 *
 * Docs: https://developer.uber.com/docs/deliveries/overview
 */

import { DeliveryAddress, DeliveryQuote, DeliveryDispatch, DispatchParams } from './types'
import { getDeliveryConfig } from './config'

const AUTH_URL = 'https://auth.uber.com/oauth/v2/token'
const API_BASE = 'https://api.uber.com/v1'

// ── Token cache ───────────────────────────────────────────────────────────────

let cachedToken: { value: string; expiresAt: number } | null = null

async function getAccessToken(): Promise<string> {
  const now = Date.now()
  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.value
  }

  const params = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: process.env.UBER_CLIENT_ID!,
    client_secret: process.env.UBER_CLIENT_SECRET!,
    scope: 'eats.deliveries',
  })

  const res = await fetch(AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Uber auth failed ${res.status}: ${text}`)
  }

  const data = await res.json()
  cachedToken = {
    value: data.access_token,
    expiresAt: now + data.expires_in * 1000,
  }
  return cachedToken.value
}

// ── HTTP helper ───────────────────────────────────────────────────────────────

async function uberFetch<T>(
  method: 'GET' | 'POST',
  path: string,
  body?: object,
): Promise<T> {
  const token = await getAccessToken()
  const customerId = process.env.UBER_CUSTOMER_ID!

  const res = await fetch(`${API_BASE}/customers/${customerId}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const text = await res.text()
  if (!res.ok) {
    throw new Error(`Uber Direct API ${res.status} ${res.statusText}: ${text}`)
  }
  try {
    return JSON.parse(text) as T
  } catch {
    return text as unknown as T
  }
}

// ── Address formatter ─────────────────────────────────────────────────────────
// Uber expects addresses as a stringified JSON object.

function formatAddress(a: DeliveryAddress): string {
  const streetParts = [a.street]
  if (a.unit) streetParts.push(a.unit)
  return JSON.stringify({
    street_address: streetParts,
    city: a.city,
    state: a.state,
    zip_code: a.zip,
    country: 'US',
  })
}

// ── E.164 phone normalizer ────────────────────────────────────────────────────

function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  return digits.startsWith('1') ? `+${digits}` : `+1${digits}`
}

// ── Quote ─────────────────────────────────────────────────────────────────────

interface UberQuoteResponse {
  id: string
  currency_type: string
  fee: number           // in cents
  expires: string       // ISO timestamp
  pickup_eta: number    // seconds from now
  dropoff_eta: number   // seconds from now
}

export async function getUberQuote(
  externalDeliveryId: string,
  dropoffAddress: DeliveryAddress,
  _orderValueCents: number,
): Promise<DeliveryQuote> {
  const config = getDeliveryConfig()

  const raw = await uberFetch<UberQuoteResponse>('POST', '/delivery_quotes', {
    pickup_address: formatAddress(config.address),
    dropoff_address: formatAddress(dropoffAddress),
  })

  return {
    externalDeliveryId: raw.id ?? externalDeliveryId,
    providerFeeCents: raw.fee ?? 700,
    customerFeeCents: config.customerFeeCents,
    restaurantFeeCents: config.restaurantFeeCents,
    expiresAt: raw.expires,
    pickupEtaMinutes: raw.pickup_eta ? Math.round(raw.pickup_eta / 60) : undefined,
    dropoffEtaMinutes: raw.dropoff_eta ? Math.round(raw.dropoff_eta / 60) : undefined,
  }
}

// ── Dispatch ──────────────────────────────────────────────────────────────────

interface UberDeliveryResponse {
  id: string
  status: string
  tracking_url: string
}

export async function createUberDelivery(
  params: DispatchParams,
): Promise<DeliveryDispatch> {
  const config = getDeliveryConfig()

  const raw = await uberFetch<UberDeliveryResponse>('POST', '/deliveries', {
    // Pickup
    pickup_name: config.restaurantName,
    pickup_address: formatAddress(config.address),
    pickup_phone_number: toE164(config.phone),
    // Dropoff
    dropoff_name: params.dropoffName || 'Customer',
    dropoff_address: formatAddress(params.dropoffAddress),
    dropoff_phone_number: toE164(params.dropoffPhone || '+10000000000'),
    dropoff_notes: params.dropoffInstructions ?? '',
    // Manifest (what's being delivered)
    manifest_items: [
      {
        name: 'Food order',
        quantity: 1,
        size: 'small',
        price: params.orderValueCents,
      },
    ],
  })

  return {
    externalDeliveryId: raw.id,
    trackingUrl: raw.tracking_url,
    status: (raw.status as DeliveryDispatch['status']) ?? 'created',
  }
}

// ── Status fetch ──────────────────────────────────────────────────────────────

interface UberDeliveryStatusResponse {
  id: string
  status: string
  tracking_url: string
}

export async function getUberDeliveryStatus(
  deliveryId: string,
): Promise<{ status: string; trackingUrl: string }> {
  const raw = await uberFetch<UberDeliveryStatusResponse>(
    'GET',
    `/deliveries/${encodeURIComponent(deliveryId)}`,
  )
  return { status: raw.status, trackingUrl: raw.tracking_url }
}
