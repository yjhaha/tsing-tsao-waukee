'use client'

import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'
import type { DeliveryAddress, DeliveryQuote } from '@/lib/delivery/types'

export interface CartItem {
  id: string
  name: string
  price: number
  image?: string
  quantity: number
}

export type OrderMode = 'pickup' | 'delivery'

interface CartContextType {
  // ── Items ──────────────────────────────────────────────────────────────────
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'quantity'>) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, delta: number) => void
  total: number
  count: number
  clear: () => void
  // ── Order mode ─────────────────────────────────────────────────────────────
  orderMode: OrderMode
  setOrderMode: (mode: OrderMode) => void
  // ── Delivery details (only relevant when orderMode === 'delivery') ─────────
  deliveryAddress: DeliveryAddress | null
  setDeliveryAddress: (address: DeliveryAddress | null) => void
  deliveryQuote: DeliveryQuote | null
  setDeliveryQuote: (quote: DeliveryQuote | null) => void
  /** Driver tip in cents (delivery only). */
  tipCents: number
  setTipCents: (cents: number) => void
  /** Total the customer pays = food subtotal + customer delivery fee + tip. */
  grandTotal: number
}

const CartContext = createContext<CartContextType | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [orderMode, setOrderMode] = useState<OrderMode>('pickup')
  const [deliveryAddress, setDeliveryAddress] = useState<DeliveryAddress | null>(null)
  const [deliveryQuote, setDeliveryQuote] = useState<DeliveryQuote | null>(null)
  const [tipCents, setTipCents] = useState<number>(0)

  function addItem(incoming: Omit<CartItem, 'quantity'>) {
    setItems(prev => {
      const exists = prev.find(i => i.id === incoming.id)
      if (exists) {
        return prev.map(i => i.id === incoming.id ? { ...i, quantity: i.quantity + 1 } : i)
      }
      return [...prev, { ...incoming, quantity: 1 }]
    })
  }

  function removeItem(id: string) {
    setItems(prev => prev.filter(i => i.id !== id))
  }

  function updateQuantity(id: string, delta: number) {
    setItems(prev =>
      prev.reduce<CartItem[]>((acc, item) => {
        if (item.id !== id) return [...acc, item]
        const next = item.quantity + delta
        return next > 0 ? [...acc, { ...item, quantity: next }] : acc
      }, [])
    )
  }

  function clear() {
    setItems([])
    setDeliveryAddress(null)
    setDeliveryQuote(null)
  }

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const count = items.reduce((sum, i) => sum + i.quantity, 0)

  const deliveryFeeDollars =
    orderMode === 'delivery' && deliveryQuote
      ? deliveryQuote.customerFeeCents / 100
      : 0
  const grandTotal = total + deliveryFeeDollars + (orderMode === 'delivery' ? tipCents / 100 : 0)

  function handleSetDeliveryAddress(address: DeliveryAddress | null) {
    setDeliveryAddress(address)
    setDeliveryQuote(null)
  }

  return (
    <CartContext.Provider
      value={{
        items, addItem, removeItem, updateQuantity, total, count, clear,
        orderMode, setOrderMode,
        deliveryAddress, setDeliveryAddress: handleSetDeliveryAddress,
        deliveryQuote, setDeliveryQuote,
        tipCents, setTipCents,
        grandTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
