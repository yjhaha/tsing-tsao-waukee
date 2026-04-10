'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'next/navigation'
import { FaSearchPlus, FaTimes, FaInfoCircle, FaFire } from 'react-icons/fa'
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
  loMeinChowMein?: boolean
}

export interface MenuCategory {
  id: string
  name: string
  description?: string
  items: MenuItem[]
}

const DELIVERY_URL = 'https://order.online/store/tsing-tsao-waukee-32583501/?delivery=true'
const SPICE_CATEGORIES = new Set(['chicken', 'beef', 'pork', 'seafood'])

type OrderMode = 'pickup' | 'delivery'

function fmt(price: number) {
  return `$${price.toFixed(2)}`
}

// ── Image lightbox ──────────────────────────────────────────────────────────
function ImageLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', handleKey); document.body.style.overflow = '' }
  }, [onClose])

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
        onClick={onClose}
        aria-label="Close image"
        type="button"
      >
        <FaTimes />
      </button>
      <div
        className="relative max-w-2xl w-full max-h-[85vh]"
        style={{ aspectRatio: '16/10' }}
        onClick={e => e.stopPropagation()}
      >
        <Image src={src} alt={alt} fill className="object-contain rounded-2xl" sizes="(max-width: 768px) 100vw, 800px" />
      </div>
      <p className="absolute bottom-6 text-white/60 text-sm">{alt}</p>
    </div>,
    document.body
  )
}

// ── Noodle info tooltip ─────────────────────────────────────────────────────
function NoodleInfo() {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen(v => !v)}
        className="text-slate-500 hover:text-brand-gold transition-colors focus:outline-none"
        aria-label="Noodle type information"
      >
        <FaInfoCircle className="text-sm" />
      </button>
      {open && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 bg-slate-700 border border-slate-600 text-xs text-slate-200 rounded-xl p-3 z-50 shadow-xl pointer-events-none">
          <div className="space-y-1">
            <p><span className="text-white font-semibold">Lo Mein</span> — soft, chewy noodles</p>
            <p><span className="text-white font-semibold">Chow Mein</span> — hard, crispy noodles</p>
          </div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-700" />
        </div>
      )}
    </div>
  )
}

// ── Size toggle ─────────────────────────────────────────────────────────────
function SizeToggle({ sizes, selectedIdx, onChange }: { sizes: MenuItemSize[]; selectedIdx: number; onChange: (i: number) => void }) {
  return (
    <div className="flex rounded-xl bg-slate-700 p-1 gap-0.5">
      {sizes.map((size, i) => (
        <button
          key={size.name}
          type="button"
          onClick={() => onChange(i)}
          className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all duration-150 leading-none whitespace-nowrap ${
            i === selectedIdx
              ? 'bg-brand-gold text-slate-900 shadow-sm'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          {size.name === 'Half' ? '½' : size.name}
        </button>
      ))}
    </div>
  )
}

// ── Spice level meter ───────────────────────────────────────────────────────
function SpiceMeter({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-1.5 mt-1.5">
      <span className="text-slate-500 text-[11px] font-medium leading-none mr-0.5">Spice:</span>
      {[1, 2, 3, 4, 5].map(level => (
        <button
          key={level}
          type="button"
          onClick={() => onChange(value === level ? 0 : level)}
          aria-label={`Spice level ${level}`}
          className="leading-none transition-transform active:scale-90"
        >
          <FaFire className={`text-base ${level <= value ? 'text-orange-500' : 'text-slate-600 hover:text-slate-400'}`} />
        </button>
      ))}
      {value === 0 && <span className="text-slate-600 text-[11px] leading-none">none</span>}
      {value > 0 && (
        <span className="text-orange-400 text-[11px] leading-none font-medium">
          {['', 'mild', 'medium', 'hot', 'very hot', 'fire'][value]}
        </span>
      )}
    </div>
  )
}

// ── Menu row ────────────────────────────────────────────────────────────────
function MenuRow({ item, orderMode, showSpiceLevel }: { item: MenuItem; orderMode: OrderMode; showSpiceLevel?: boolean }) {
  const { addItem } = useCart()
  const [selectedSizeIdx, setSelectedSizeIdx] = useState(0)
  const [spiceLevel, setSpiceLevel] = useState(0)
  const [lightboxOpen, setLightboxOpen] = useState(false)

  const price = item.sizes ? item.sizes[selectedSizeIdx].price : (item.price ?? 0)

  const handleAdd = useCallback(() => {
    if (orderMode === 'delivery') {
      window.location.href = DELIVERY_URL
      return
    }
    const sizeName = item.sizes?.[selectedSizeIdx]?.name
    let cartName = sizeName ? `${item.name} (${sizeName})` : item.name
    if (spiceLevel > 0) cartName += ` · Spice ×${spiceLevel}`
    const cartId = [item.id, sizeName?.toLowerCase(), spiceLevel > 0 ? `s${spiceLevel}` : ''].filter(Boolean).join('-')
    addItem({ id: cartId, name: cartName, price, image: item.image })
  }, [orderMode, item, selectedSizeIdx, spiceLevel, price, addItem])

  const showSpice = showSpiceLevel && orderMode === 'pickup'

  return (
    <>
      <div className="flex flex-col bg-slate-800 rounded-xl hover:bg-slate-700/60 transition-colors">
        <div className="flex items-center gap-3 p-3">
          {/* Thumbnail — expandable */}
          <div
            className={`relative w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-slate-700 ${item.image ? 'cursor-zoom-in group' : ''}`}
            onClick={() => item.image && setLightboxOpen(true)}
            role={item.image ? 'button' : undefined}
            aria-label={item.image ? `View ${item.name} photo` : undefined}
            tabIndex={item.image ? 0 : undefined}
            onKeyDown={e => { if (e.key === 'Enter' && item.image) setLightboxOpen(true) }}
          >
            {item.image ? (
              <>
                <Image src={item.image} alt={item.name} fill className="object-cover transition-transform duration-200 group-hover:scale-105" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200 flex items-center justify-center">
                  <FaSearchPlus className="text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 drop-shadow text-base" />
                </div>
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl text-slate-600">🍽</div>
            )}
          </div>

          {/* Name + description */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-brand-gold font-semibold text-sm leading-snug">{item.name}</h3>
              {item.spicy && <FaFire className="text-white text-xs shrink-0" />}
              {item.loMeinChowMein && <NoodleInfo />}
            </div>
            <p className="text-slate-400 text-xs leading-relaxed mt-0.5 line-clamp-2">{item.description}</p>
            {item.serves && <p className="text-slate-500 text-[10px] mt-0.5">{item.serves}</p>}
            {/* Spice meter inline under description */}
            {showSpice && <SpiceMeter value={spiceLevel} onChange={setSpiceLevel} />}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {item.sizes && (
              <div className="flex flex-col items-end gap-1.5">
                <SizeToggle sizes={item.sizes} selectedIdx={selectedSizeIdx} onChange={setSelectedSizeIdx} />
                <span className="text-white font-semibold text-sm tabular-nums text-right">{fmt(price)}</span>
              </div>
            )}
            {!item.sizes && item.price !== undefined && (
              <span className="text-white font-semibold text-sm tabular-nums">{fmt(item.price)}</span>
            )}
            <button
              onClick={handleAdd}
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
      </div>

      {lightboxOpen && item.image && (
        <ImageLightbox src={item.image} alt={item.name} onClose={() => setLightboxOpen(false)} />
      )}
    </>
  )
}

// ── Category section ────────────────────────────────────────────────────────
function CategorySection({ id, name, description, items, orderMode }: MenuCategory & { orderMode: OrderMode }) {
  const showSpiceLevel = SPICE_CATEGORIES.has(id)
  return (
    <section id={id} className="scroll-mt-[104px]">
      <div className="mb-3">
        <h2 className="font-display italic text-2xl text-white">{name}</h2>
        {description && <p className="text-slate-500 text-xs mt-0.5">{description}</p>}
      </div>
      <div className="space-y-2">
        {items.map(item => (
          <MenuRow key={item.id} item={item} orderMode={orderMode} showSpiceLevel={showSpiceLevel} />
        ))}
      </div>
    </section>
  )
}

// ── Root component ──────────────────────────────────────────────────────────
export default function MenuList({ categories }: { categories: MenuCategory[] }) {
  const { count, total } = useCart()
  const searchParams = useSearchParams()
  const [orderMode, setOrderMode] = useState<OrderMode>('pickup')

  // Honour ?mode=delivery from landing page ORDER DELIVERY button
  useEffect(() => {
    const mode = searchParams.get('mode')
    if (mode === 'delivery') setOrderMode('delivery')
    else if (mode === 'pickup') setOrderMode('pickup')
  }, [searchParams])

  const mostOrdered = categories.flatMap(c => c.items).filter(i => i.popular)

  return (
    <div>
      {/* ── Sticky header: Pickup/Delivery toggle (top) then category nav ── */}
      <div className="sticky top-14 z-30 bg-slate-900/95 backdrop-blur border-b border-slate-700/60">
        {/* Pickup / Delivery toggle */}
        <div className="px-4 pt-2.5 pb-2">
          <div className="flex rounded-xl bg-slate-800 p-1 max-w-xs">
            <button
              type="button"
              onClick={() => setOrderMode('pickup')}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
                orderMode === 'pickup' ? 'bg-brand-gold text-slate-900 shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Pickup
            </button>
            <button
              type="button"
              onClick={() => setOrderMode('delivery')}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
                orderMode === 'delivery' ? 'bg-brand-gold text-slate-900 shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              Delivery
            </button>
          </div>
          {orderMode === 'delivery' && (
            <p className="text-slate-500 text-xs mt-1.5 ml-1">
              Tap any item to continue on our delivery partner&apos;s site.
            </p>
          )}
        </div>

        {/* Category nav */}
        <nav className="border-t border-slate-700/40 px-4">
          <div className="flex gap-1 overflow-x-auto py-2 scrollbar-none">
            {categories.map(cat => (
              <a
                key={cat.id}
                href={`#${cat.id}`}
                className="shrink-0 px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-700/60 rounded-lg transition-colors whitespace-nowrap"
              >
                {cat.name}
              </a>
            ))}
          </div>
        </nav>
      </div>

      <div className="p-4 space-y-8 pb-28">
        {/* Most Ordered virtual section */}
        {mostOrdered.length > 0 && (
          <section>
            <div className="mb-3">
              <h2 className="font-display italic text-2xl text-white">Most Ordered</h2>
              <p className="text-slate-500 text-xs mt-0.5">The most commonly ordered items and dishes from this store</p>
            </div>
            <div className="space-y-2">
              {mostOrdered.map(item => (
                <MenuRow key={`popular-${item.id}`} item={item} orderMode={orderMode} showSpiceLevel={SPICE_CATEGORIES.has(item.id.split('-')[0])} />
              ))}
            </div>
          </section>
        )}

        {categories.map(cat => (
          <CategorySection key={cat.id} {...cat} orderMode={orderMode} />
        ))}
      </div>

      {/* Floating cart bar */}
      {orderMode === 'pickup' && count > 0 && (
        <div className="fixed bottom-0 left-0 right-0 lg:left-1/2 z-40 p-3 bg-slate-900/95 backdrop-blur border-t border-slate-700/60">
          <Link
            href="/cart"
            className="flex items-center justify-between w-full max-w-lg mx-auto bg-brand-gold text-slate-900 px-5 py-3.5 rounded-xl font-bold hover:bg-yellow-400 transition-colors"
          >
            <span className="bg-amber-600/30 px-2.5 py-0.5 rounded-md text-sm font-bold min-w-[2rem] text-center">{count}</span>
            <span>View Order</span>
            <span className="tabular-nums">{`$${total.toFixed(2)}`}</span>
          </Link>
        </div>
      )}
    </div>
  )
}
