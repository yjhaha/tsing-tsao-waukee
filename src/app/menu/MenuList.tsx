'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCart } from '@/context/CartContext'

export interface MenuItemSize {
  name: string
  price: number
}

export interface MenuItem {
  id: string
  name: string
  description: string
  price?: number
  sizes?: MenuItemSize[]
  image?: string
  spicy?: boolean
  popular?: boolean
  serves?: string
}

export interface MenuCategory {
  id: string
  name: string
  description?: string
  items: MenuItem[]
}

function fmt(price: number) {
  return `$${price.toFixed(2)}`
}

function MenuRow({ item }: { item: MenuItem }) {
  const { addItem } = useCart()
  const price = item.price ?? item.sizes?.[0]?.price ?? 0

  return (
    <div className="flex items-center gap-3 p-3 bg-slate-800 rounded-xl hover:bg-slate-700/60 transition-colors">
      {/* Thumbnail */}
      <div className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-slate-700">
        {item.image ? (
          <Image src={item.image} alt={item.name} fill className="object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-2xl text-slate-600">🍽</div>
        )}
      </div>

      {/* Name + description */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <h3 className="text-brand-gold font-semibold text-sm leading-snug">{item.name}</h3>
          {item.spicy && <span className="text-[10px] text-red-400 leading-none">🌶</span>}
        </div>
        <p className="text-slate-400 text-xs leading-relaxed mt-0.5 line-clamp-2">{item.description}</p>
        {item.serves && <p className="text-slate-500 text-[10px] mt-0.5">{item.serves}</p>}
      </div>

      {/* Price + add button */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="text-right">
          {item.price !== undefined ? (
            <span className="text-white font-semibold text-sm tabular-nums">{fmt(item.price)}</span>
          ) : item.sizes ? (
            <div className="space-y-0.5">
              {item.sizes.map(s => (
                <div key={s.name} className="text-xs leading-tight">
                  <span className="text-slate-400">{s.name} </span>
                  <span className="text-white font-semibold tabular-nums">{fmt(s.price)}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
        <button
          onClick={() => addItem({ id: item.id, name: item.name, price, image: item.image })}
          className="w-8 h-8 flex items-center justify-center rounded-full border border-slate-500 text-slate-300
                     hover:border-brand-gold hover:text-brand-gold active:scale-90 transition-all duration-150
                     text-lg font-light leading-none"
          type="button"
          aria-label={`Add ${item.name} to order`}
        >
          +
        </button>
      </div>
    </div>
  )
}

function CategorySection({ id, name, description, items }: MenuCategory) {
  return (
    <section id={id} className="scroll-mt-[104px]">
      <div className="mb-3">
        <h2 className="font-display italic text-2xl text-white">{name}</h2>
        {description && <p className="text-slate-500 text-xs mt-0.5">{description}</p>}
      </div>
      <div className="space-y-2">
        {items.map(item => <MenuRow key={item.id} item={item} />)}
      </div>
    </section>
  )
}

export default function MenuList({ categories }: { categories: MenuCategory[] }) {
  const { count, total } = useCart()

  const mostOrdered = categories.flatMap(c => c.items).filter(i => i.popular)

  return (
    <div>
      <div className="p-4 space-y-8 pb-28">
        {/* Most Ordered virtual section */}
        {mostOrdered.length > 0 && (
          <section>
            <div className="mb-3">
              <h2 className="font-display italic text-2xl text-white">Most Ordered</h2>
              <p className="text-slate-500 text-xs mt-0.5">
                The most commonly ordered items and dishes from this store
              </p>
            </div>
            <div className="space-y-2">
              {mostOrdered.map(item => (
                <MenuRow key={`popular-${item.id}`} item={item} />
              ))}
            </div>
          </section>
        )}

        {/* All categories */}
        {categories.map(cat => (
          <CategorySection key={cat.id} {...cat} />
        ))}
      </div>

      {/* Floating cart bar */}
      {count > 0 && (
        <div className="fixed bottom-0 left-0 right-0 lg:left-1/2 z-40 p-3 bg-slate-900/95 backdrop-blur border-t border-slate-700/60">
          <Link
            href="/cart"
            className="flex items-center justify-between w-full max-w-lg mx-auto bg-brand-gold text-slate-900 px-5 py-3.5 rounded-xl font-bold hover:bg-yellow-400 transition-colors"
          >
            <span className="bg-amber-600/30 px-2.5 py-0.5 rounded-md text-sm font-bold min-w-[2rem] text-center">
              {count}
            </span>
            <span>View Order</span>
            <span className="tabular-nums">{`$${total.toFixed(2)}`}</span>
          </Link>
        </div>
      )}
    </div>
  )
}
