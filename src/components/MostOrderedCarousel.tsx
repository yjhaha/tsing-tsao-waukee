'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/context/CartContext'

const SLIDES = [
  {
    id: 'app-2',
    name: 'Crab Rangoon',
    description: 'Crispy wonton shells filled with cream cheese and crab, served with sweet chili sauce',
    price: 6.99,
    image: '/images/menu/crab_rangoons.jpg',
  },
  {
    id: 'app-1',
    name: 'Egg Rolls',
    description: 'Crispy golden rolls filled with seasoned pork and vegetables, served with sweet and sour sauce',
    price: 3.99,
    image: '/images/menu/egg_rolls.jpg',
  },
  {
    id: 'bf-2',
    name: 'Mongolian Beef',
    description: 'Crispy sliced beef with scallions in a rich, slightly sweet hoisin sauce',
    price: 10.99,
    image: '/images/menu/mongolian_beef.jpg',
  },
  {
    id: 'ch-3',
    name: 'Orange Chicken',
    description: 'Crispy chicken tossed in a tangy orange glaze, sweet and just a hint of heat',
    price: 10.99,
    image: '/images/menu/orange_chicken.jpg',
  },
  {
    id: 'ch-2',
    name: 'Sesame Chicken',
    description: 'Golden crispy chicken glazed in a sweet sesame sauce, garnished with sesame seeds',
    price: 10.99,
    image: '/images/menu/sesame_chicken.jpg',
  },
]

export default function MostOrderedCarousel() {
  const [index, setIndex] = useState(0)
  const { addItem } = useCart()
  const router = useRouter()

  const prev = () => setIndex(i => (i - 1 + SLIDES.length) % SLIDES.length)
  const next = () => setIndex(i => (i + 1) % SLIDES.length)
  const slide = SLIDES[index]

  function handleAdd() {
    addItem({ id: slide.id, name: slide.name, price: slide.price, image: slide.image })
    router.push('/menu')
  }

  return (
    <div className="bg-slate-800 rounded-2xl overflow-hidden select-none">
      {/* Photo */}
      <div
        className="relative w-full cursor-pointer"
        style={{ aspectRatio: '4/3' }}
        onClick={next}
      >
        <Image
          key={slide.image}
          src={slide.image}
          alt={slide.name}
          fill
          className="object-cover transition-opacity duration-300"
          priority
          sizes="(max-width: 1024px) 100vw, 50vw"
        />
        {/* Subtle left/right tap zones */}
        <button
          onClick={e => { e.stopPropagation(); prev() }}
          type="button"
          aria-label="Previous"
          className="absolute left-0 top-0 h-full w-1/4 opacity-0"
        />
        <button
          onClick={e => { e.stopPropagation(); next() }}
          type="button"
          aria-label="Next"
          className="absolute right-0 top-0 h-full w-1/4 opacity-0"
        />
      </div>

      {/* Info panel */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-bold text-lg leading-snug">{slide.name}</h3>
            <p className="text-slate-400 text-sm mt-1 leading-relaxed line-clamp-2">{slide.description}</p>
          </div>
          {/* Price + add */}
          <div className="flex items-center gap-2 shrink-0 mt-0.5">
            <div className="bg-slate-700 rounded-xl px-3 py-2 text-white font-bold text-base tabular-nums">
              ${slide.price.toFixed(2)}
            </div>
            <button
              onClick={handleAdd}
              type="button"
              aria-label={`Add ${slide.name} to order`}
              className="bg-slate-700 hover:bg-brand-gold hover:text-slate-900 text-white rounded-xl w-11 h-11 flex items-center justify-center text-2xl font-light transition-colors duration-150 active:scale-95"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Arrows + Dots row */}
      <div className="flex items-center justify-center gap-3 pb-3.5">
        <button
          onClick={prev}
          type="button"
          aria-label="Previous"
          className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-700 hover:bg-slate-600 text-white text-lg leading-none active:scale-90 transition-all shrink-0"
        >
          ‹
        </button>
        <div className="flex items-center gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              type="button"
              aria-label={`Go to slide ${i + 1}`}
              className={`rounded-full transition-all duration-200 ${
                i === index
                  ? 'w-6 h-2 bg-white'
                  : 'w-2 h-2 bg-slate-600 hover:bg-slate-400'
              }`}
            />
          ))}
        </div>
        <button
          onClick={next}
          type="button"
          aria-label="Next"
          className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-700 hover:bg-slate-600 text-white text-lg leading-none active:scale-90 transition-all shrink-0"
        >
          ›
        </button>
      </div>
    </div>
  )
}
