'use client'

import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'

export interface CartItem {
  id: string
  name: string
  price: number
  image?: string
  quantity: number
}

interface CartContextType {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'quantity'>) => void
  removeItem: (id: string) => void
  updateQuantity: (id: string, delta: number) => void
  total: number
  count: number
  clear: () => void
}

const CartContext = createContext<CartContextType | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])

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
  }

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const count = items.reduce((sum, i) => sum + i.quantity, 0)

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, total, count, clear }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
