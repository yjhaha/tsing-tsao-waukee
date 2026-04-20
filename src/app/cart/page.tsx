'use client'

import { useState, useId, useRef, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import NavBar from '@/components/NavBar'
import { useCart } from '@/context/CartContext'
import type { DeliveryAddress, DeliveryQuote } from '@/lib/delivery/types'
import {
  FaMapMarkerAlt,
  FaMotorcycle,
  FaShoppingBag,
  FaTimes,
  FaCheckCircle,
  FaExclamationTriangle,
  FaInfoCircle,
} from 'react-icons/fa'

function fmt(price: number) {
  return `$${price.toFixed(2)}`
}

// ── Delivery Address Form ────────────────────────────────────────────────────

interface AddressFormProps {
  address: DeliveryAddress | null
  onChange: (a: DeliveryAddress) => void
  onValidate: () => void
  validating: boolean
  error: string | null
  quoted: boolean
  quote: DeliveryQuote | null
  streetRef?: React.RefObject<HTMLInputElement | null>
}

function AddressForm({ address, onChange, onValidate, validating, error, quoted, quote, streetRef }: AddressFormProps) {
  const prefix = useId()

  function set(field: keyof DeliveryAddress, value: string) {
    onChange({
      street: address?.street ?? '',
      unit: address?.unit ?? '',
      city: address?.city ?? '',
      state: address?.state ?? '',
      zip: address?.zip ?? '',
      [field]: value,
    })
  }

  return (
    <div className="bg-slate-800 rounded-xl p-4 mb-4">
      <h2 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
        <FaMapMarkerAlt className="text-brand-gold text-sm shrink-0" /> Delivery Address
      </h2>

      <div className="space-y-2.5">
        {/* Street + Unit */}
        <div className="flex gap-2">
          <div className="flex-1">
            <label htmlFor={`${prefix}-street`} className="block text-slate-400 text-xs mb-1">
              Street Address <span className="text-red-400">*</span>
            </label>
            <input
              ref={streetRef as React.RefObject<HTMLInputElement>}
              id={`${prefix}-street`}
              type="text"
              autoComplete="off"
              placeholder="123 Main St"
              value={address?.street ?? ''}
              onChange={e => set('street', e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-brand-gold"
            />
          </div>
          <div className="w-20">
            <label htmlFor={`${prefix}-unit`} className="block text-slate-400 text-xs mb-1">
              Unit
            </label>
            <input
              id={`${prefix}-unit`}
              type="text"
              autoComplete="address-line2"
              placeholder="Apt 2"
              value={address?.unit ?? ''}
              onChange={e => set('unit', e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-brand-gold"
            />
          </div>
        </div>

        {/* City / State / Zip */}
        <div className="flex gap-2">
          <div className="flex-1">
            <label htmlFor={`${prefix}-city`} className="block text-slate-400 text-xs mb-1">
              City <span className="text-red-400">*</span>
            </label>
            <input
              id={`${prefix}-city`}
              type="text"
              autoComplete="address-level2"
              placeholder="Waukee"
              value={address?.city ?? ''}
              onChange={e => set('city', e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-brand-gold"
            />
          </div>
          <div className="w-16">
            <label htmlFor={`${prefix}-state`} className="block text-slate-400 text-xs mb-1">
              State <span className="text-red-400">*</span>
            </label>
            <input
              id={`${prefix}-state`}
              type="text"
              autoComplete="address-level1"
              maxLength={2}
              placeholder="IA"
              value={address?.state ?? ''}
              onChange={e => set('state', e.target.value.toUpperCase())}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-brand-gold uppercase"
            />
          </div>
          <div className="w-24">
            <label htmlFor={`${prefix}-zip`} className="block text-slate-400 text-xs mb-1">
              ZIP <span className="text-red-400">*</span>
            </label>
            <input
              id={`${prefix}-zip`}
              type="text"
              autoComplete="postal-code"
              inputMode="numeric"
              maxLength={10}
              placeholder="50263"
              value={address?.zip ?? ''}
              onChange={e => set('zip', e.target.value.replace(/[^\d-]/g, ''))}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-brand-gold"
            />
          </div>
        </div>

        {/* Validate button */}
        <button
          type="button"
          onClick={onValidate}
          disabled={validating}
          className="w-full py-2.5 rounded-xl bg-slate-600 hover:bg-slate-500 text-white font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {validating
            ? 'Checking address…'
            : quoted
            ? 'Re-check Address'
            : 'Check Delivery Availability'}
        </button>

        {/* Success state */}
        {!validating && !error && quoted && quote && (
          <div className="flex items-start gap-2.5 px-4 py-3 bg-green-900/30 border border-green-700/40 rounded-xl text-green-300 text-sm">
            <FaCheckCircle className="shrink-0 text-green-400 mt-0.5" />
            <span>
              Delivery available
              {quote.dropoffEtaMinutes ? ` · Est. ${quote.dropoffEtaMinutes} min` : ''}
            </span>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="flex items-start gap-2.5 px-4 py-3 bg-red-900/40 border border-red-700/50 rounded-xl text-red-300 text-sm">
            <FaExclamationTriangle className="shrink-0 text-red-400 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Cart Page ─────────────────────────────────────────────────────────────────

export default function CartPage() {
  const {
    items, total, count, updateQuantity, removeItem,
    orderMode, setOrderMode,
    deliveryAddress, setDeliveryAddress,
    deliveryQuote, setDeliveryQuote,
    tipCents, setTipCents,
    grandTotal,
  } = useCart()

  const [loading, setLoading] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [addressError, setAddressError] = useState<string | null>(null)
  const [validating, setValidating] = useState(false)
  const [customTip, setCustomTip] = useState('')

  const streetInputRef = useRef<HTMLInputElement | null>(null)
  const autocompleteRef = useRef<any>(null)

  const TIP_PRESETS = [0, 200, 300, 500] // cents

  const isDelivery = orderMode === 'delivery'
  const deliveryReady = isDelivery && !!deliveryQuote
  const canCheckout = !isDelivery || deliveryReady

  // ── Pickup / Delivery toggle ──────────────────────────────────────────────

  function handleSetOrderMode(mode: 'pickup' | 'delivery') {
    setOrderMode(mode)
    if (mode === 'pickup') {
      setDeliveryQuote(null)
      setTipCents(0)
    }
  }

  // ── Google Places Autocomplete ────────────────────────────────────────────

  const handlePlaceChanged = useCallback(() => {
    if (!autocompleteRef.current) return
    const place = autocompleteRef.current.getPlace()
    if (!place?.address_components) return

    let street = '', city = '', state = '', zip = ''
    let streetNumber = '', route = ''

    for (const component of place.address_components) {
      const types = component.types
      if (types.includes('street_number')) streetNumber = component.long_name
      if (types.includes('route')) route = component.long_name
      if (types.includes('locality')) city = component.long_name
      if (types.includes('administrative_area_level_1')) state = component.short_name
      if (types.includes('postal_code')) zip = component.long_name
    }
    street = [streetNumber, route].filter(Boolean).join(' ')

    setDeliveryAddress({
      street,
      unit: deliveryAddress?.unit ?? '',
      city,
      state,
      zip,
    })
    setDeliveryQuote(null)
  }, [deliveryAddress?.unit, setDeliveryAddress, setDeliveryQuote])

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY
    if (!key || !streetInputRef.current) return

    function attach() {
      if (!streetInputRef.current || !(window as any).google?.maps?.places) return
      autocompleteRef.current = new (window as any).google.maps.places.Autocomplete(
        streetInputRef.current,
        { types: ['address'], componentRestrictions: { country: 'us' }, fields: ['address_components'] },
      )
      autocompleteRef.current.addListener('place_changed', handlePlaceChanged)
    }

    if ((window as any).google?.maps?.places) { attach(); return }

    if (document.querySelector('script[src*="maps.googleapis.com/maps/api/js"]')) {
      const iv = setInterval(() => {
        if ((window as any).google?.maps?.places) { clearInterval(iv); attach() }
      }, 100)
      return () => clearInterval(iv)
    }

    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`
    script.async = true
    script.defer = true
    script.onload = attach
    document.head.appendChild(script)
  }, [handlePlaceChanged])

  // ── Address validation ───────────────────────────────────────────────────

  async function handleValidateAddress() {
    if (!deliveryAddress?.street || !deliveryAddress?.city || !deliveryAddress?.state || !deliveryAddress?.zip) {
      setAddressError('Please fill in street, city, state, and ZIP.')
      return
    }

    setValidating(true)
    setAddressError(null)
    setDeliveryQuote(null)

    try {
      const sessionNonce = `${Date.now()}_${Math.random().toString(36).slice(2)}`
      const res = await fetch('/api/delivery/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: deliveryAddress,
          orderValueCents: Math.round(total * 100),
          sessionNonce,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setAddressError(data.error ?? 'Delivery not available to that address.')
        return
      }
      setDeliveryQuote(data.quote)
    } catch {
      setAddressError('Could not verify address. Please check your connection and try again.')
    } finally {
      setValidating(false)
    }
  }

  // ── Checkout ─────────────────────────────────────────────────────────────

  async function handleCheckout() {
    setLoading(true)
    setCheckoutError(null)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          orderMode,
          ...(isDelivery && deliveryAddress && deliveryQuote
            ? {
                deliveryAddress,
                deliveryQuote,
                tipCents: tipCents > 0 ? tipCents : undefined,
              }
            : {}),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Checkout failed')
      window.location.href = data.url
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-900">
      <NavBar />

      <div className="max-w-lg mx-auto px-4 pt-20 pb-12">
        <h1 className="font-display italic text-3xl text-white mb-3">Your Order</h1>

        {/* Pickup / Delivery toggle */}
        <div className="flex gap-2 mb-5 p-1 bg-slate-800 rounded-xl">
          <button
            type="button"
            onClick={() => handleSetOrderMode('pickup')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              !isDelivery
                ? 'bg-brand-gold text-slate-900'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FaShoppingBag className="text-xs" /> Pickup
          </button>
          <button
            type="button"
            onClick={() => handleSetOrderMode('delivery')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              isDelivery
                ? 'bg-brand-gold text-slate-900'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FaMotorcycle className="text-sm" /> Delivery
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-slate-400 text-lg mb-6">Your order is empty.</p>
            <Link
              href="/menu"
              className="px-6 py-3 bg-brand-gold text-slate-900 rounded-xl font-bold hover:bg-yellow-400 transition-colors"
            >
              Browse Menu
            </Link>
          </div>
        ) : (
          <>
            {/* Items */}
            <div className="space-y-2 mb-6">
              {items.map(item => (
                <div key={item.id} className="flex items-center gap-3 bg-slate-800 rounded-xl p-3">
                  {item.image && (
                    <div className="relative w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-slate-700">
                      <Image src={item.image} alt={item.name} fill className="object-cover" sizes="56px" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-brand-gold font-semibold text-sm leading-snug">{item.name}</p>
                    <p className="text-slate-400 text-xs mt-0.5">{fmt(item.price)} each</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => updateQuantity(item.id, -1)}
                      className="w-7 h-7 flex items-center justify-center rounded-full border border-slate-500 text-slate-300 hover:border-white hover:text-white transition-colors text-base"
                    >
                      –
                    </button>
                    <span className="w-5 text-center text-white text-sm font-medium tabular-nums">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, 1)}
                      className="w-7 h-7 flex items-center justify-center rounded-full border border-slate-500 text-slate-300 hover:border-white hover:text-white transition-colors text-base"
                    >
                      +
                    </button>
                    <span className="w-14 text-right text-white font-semibold text-sm tabular-nums">
                      {fmt(item.price * item.quantity)}
                    </span>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="ml-1 text-slate-600 hover:text-red-400 transition-colors"
                      aria-label="Remove item"
                    >
                      <FaTimes className="text-xs" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Delivery info hint — shown before address entry */}
            {isDelivery && !deliveryQuote && (
              <div className="mb-3 flex items-start gap-2.5 px-4 py-3 bg-slate-800 border border-slate-600/60 rounded-xl text-slate-400 text-sm">
                <FaInfoCircle className="shrink-0 text-slate-500 mt-0.5" />
                <span>Enter your address below and check availability before checking out.</span>
              </div>
            )}

            {/* Delivery address form */}
            {isDelivery && (
              <AddressForm
                address={deliveryAddress}
                onChange={setDeliveryAddress}
                onValidate={handleValidateAddress}
                validating={validating}
                error={addressError}
                quoted={!!deliveryQuote}
                quote={deliveryQuote}
                streetRef={streetInputRef}
              />
            )}

            {/* Driver tip — shown once delivery is quoted */}
            {isDelivery && deliveryQuote && (
              <div className="bg-slate-800 rounded-xl p-4 mb-4">
                <h2 className="text-white font-semibold text-sm mb-3">Driver Tip</h2>
                <div className="flex gap-2 mb-2">
                  {TIP_PRESETS.map(cents => (
                    <button
                      key={cents}
                      type="button"
                      onClick={() => { setTipCents(cents); setCustomTip('') }}
                      className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        tipCents === cents && customTip === ''
                          ? 'bg-brand-gold text-slate-900'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {cents === 0 ? 'None' : `$${(cents / 100).toFixed(0)}`}
                    </button>
                  ))}
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Other"
                    value={customTip}
                    onChange={e => {
                      setCustomTip(e.target.value)
                      const cents = Math.round(parseFloat(e.target.value || '0') * 100)
                      setTipCents(isNaN(cents) ? 0 : cents)
                    }}
                    className={`w-20 bg-slate-700 border rounded-lg px-2 py-2 text-white text-sm text-center placeholder:text-slate-500 focus:outline-none focus:border-brand-gold ${
                      customTip !== '' ? 'border-brand-gold' : 'border-slate-600'
                    }`}
                  />
                </div>
                <p className="text-slate-500 text-xs">100% goes to your driver.</p>
              </div>
            )}

            {/* Order summary */}
            <div className="bg-slate-800 rounded-xl p-4 mb-5">
              <div className="flex justify-between text-sm text-slate-400 mb-1">
                <span>Subtotal ({count} item{count !== 1 ? 's' : ''})</span>
                <span className="tabular-nums">{fmt(total)}</span>
              </div>

              {isDelivery && (
                <>
                  <div className="flex justify-between text-sm text-slate-400 mb-1">
                    <span>Delivery fee</span>
                    <span className="tabular-nums">
                      {deliveryQuote
                        ? fmt(deliveryQuote.customerFeeCents / 100)
                        : '—'}
                    </span>
                  </div>
                  {deliveryQuote && tipCents > 0 && (
                    <div className="flex justify-between text-sm text-slate-400 mb-1">
                      <span>Driver tip</span>
                      <span className="tabular-nums">{fmt(tipCents / 100)}</span>
                    </div>
                  )}
                  {deliveryQuote && (() => {
                    // DoorDash typically charges ~$5.99 delivery + 15% service fee
                    const ddFees = 5.99 + total * 0.15
                    const ourFee = deliveryQuote.customerFeeCents / 100
                    const savings = Math.max(0, ddFees - ourFee)
                    return savings > 0 ? (
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-400">Est. savings vs. DoorDash</span>
                        <span className="text-green-400 font-semibold tabular-nums">~{fmt(savings)}</span>
                      </div>
                    ) : null
                  })()}
                </>
              )}

              <div className="flex justify-between font-bold text-white text-base border-t border-slate-700 pt-2 mt-2">
                <span>Total</span>
                <span className="tabular-nums">
                  {isDelivery && deliveryQuote ? fmt(grandTotal) : fmt(total)}
                </span>
              </div>
            </div>

            {/* Checkout error */}
            {checkoutError && (
              <div className="mb-4 px-4 py-3 bg-red-900/40 border border-red-700/50 rounded-xl text-red-300 text-sm">
                {checkoutError}
              </div>
            )}

            {/* Checkout button */}
            <div className="space-y-2">
              <button
                onClick={handleCheckout}
                disabled={loading || !canCheckout}
                className="w-full py-4 bg-brand-gold text-slate-900 rounded-xl font-bold text-base
                           hover:bg-yellow-400 active:scale-[0.98] transition-all duration-150
                           disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading
                  ? 'Redirecting to checkout…'
                  : isDelivery && deliveryQuote
                  ? `Checkout · ${fmt(grandTotal)}`
                  : !isDelivery
                  ? `Checkout · ${fmt(total)}`
                  : 'Verify Address to Continue'}
              </button>
              <Link
                href="/menu"
                className="block w-full py-3 text-center text-sm text-slate-400 hover:text-white transition-colors"
              >
                ← Continue Ordering
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
