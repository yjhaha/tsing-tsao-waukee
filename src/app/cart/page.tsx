'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import NavBar from '@/components/NavBar'
import { useCart } from '@/context/CartContext'

function fmt(price: number) {
  return `$${price.toFixed(2)}`
}

export default function CartPage() {
  const { items, total, count, updateQuantity, removeItem } = useCart()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCheckout() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Checkout failed')
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <NavBar />

      <div className="max-w-lg mx-auto px-4 pt-20 pb-12">
        <h1 className="font-display italic text-3xl text-white mb-6">Your Order</h1>

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
                      <Image src={item.image} alt={item.name} fill className="object-cover" />
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
                      className="ml-1 text-slate-600 hover:text-red-400 transition-colors text-sm"
                      aria-label="Remove item"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Order summary */}
            <div className="bg-slate-800 rounded-xl p-4 mb-5">
              <div className="flex justify-between text-sm text-slate-400 mb-1">
                <span>Subtotal ({count} item{count !== 1 ? 's' : ''})</span>
                <span className="tabular-nums">{fmt(total)}</span>
              </div>
              <div className="flex justify-between font-bold text-white text-base border-t border-slate-700 pt-2 mt-2">
                <span>Total</span>
                <span className="tabular-nums">{fmt(total)}</span>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-4 px-4 py-3 bg-red-900/40 border border-red-700/50 rounded-xl text-red-300 text-sm">
                {error}
              </div>
            )}

            {/* Checkout */}
            <div className="space-y-2">
              <button
                onClick={handleCheckout}
                disabled={loading}
                className="w-full py-4 bg-brand-gold text-slate-900 rounded-xl font-bold text-base
                           hover:bg-yellow-400 active:scale-[0.98] transition-all duration-150
                           disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? 'Redirecting to checkout…' : `Checkout · ${fmt(total)}`}
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
