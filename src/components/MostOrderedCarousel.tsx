'use client'

import Image from 'next/image'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/context/CartContext'

const SLIDES = [
  { id: 'app-2', name: 'Crab Rangoon',   price: 6.95,  image: '/images/menu/crab_rangoons.jpg' },
  { id: 'app-1', name: 'Egg Rolls',      price: 3.95,  image: '/images/menu/egg_rolls.jpg'     },
  { id: 'bf-2',  name: 'Mongolian Beef', price: 13.95, image: '/images/menu/mongolian_beef.jpg' },
  { id: 'ch-3',  name: 'Orange Chicken', price: 12.95, image: '/images/menu/orange_chicken.jpg' },
  { id: 'ch-2',  name: 'Sesame Chicken', price: 12.95, image: '/images/menu/sesame_chicken.jpg' },
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
    <div className="info-card overflow-hidden">
      {/* Slide */}
      <div className="relative h-56 sm:h-64 bg-slate-800 select-none">
        <Image
          key={slide.image}
          src={slide.image}
          alt={slide.name}
          fill
          className="object-cover"
          priority
        />

        {/* Dish name label — top left */}
        <div className="absolute top-3 left-3">
          <span className="flex items-center gap-2 py-1.5 px-3 text-xs font-semibold text-white bg-black/50 backdrop-blur-sm border border-white/25 rounded-lg">
            {slide.name}
          </span>
        </div>

        {/* Add to cart — top right */}
        <button
          onClick={handleAdd}
          type="button"
          aria-label={`Add ${slide.name} to order`}
          className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-sm border border-white/25 text-white hover:bg-brand-gold hover:border-brand-gold hover:text-slate-900 active:scale-90 transition-all duration-150 text-lg font-light leading-none"
        >
          +
        </button>

        {/* Left arrow */}
        <button
          onClick={prev}
          type="button"
          aria-label="Previous"
          className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-sm border border-white/25 text-white hover:bg-black/70 active:scale-90 transition-all"
        >
          ‹
        </button>

        {/* Right arrow */}
        <button
          onClick={next}
          type="button"
          aria-label="Next"
          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 backdrop-blur-sm border border-white/25 text-white hover:bg-black/70 active:scale-90 transition-all"
        >
          ›
        </button>
      </div>

      {/* Dots */}
      <div className="flex items-center justify-center gap-1.5 py-3">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            type="button"
            aria-label={`Go to slide ${i + 1}`}
            className={`rounded-full transition-all duration-200 ${
              i === index
                ? 'w-5 h-1.5 bg-brand-gold'
                : 'w-1.5 h-1.5 bg-slate-600 hover:bg-slate-400'
            }`}
          />
        ))}
      </div>
    </div>
  )
}
