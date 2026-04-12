import { Suspense } from 'react'
import Image from 'next/image'
import NavBar from '@/components/NavBar'
import MenuList from './MenuList'
import menuData from '../../../data/menu.json'
import type { MenuCategory } from './MenuList'

const COLLAGE = [
  { src: '/images/menu/general_tsos.jpg', alt: "General Tso's Chicken" },
  { src: '/images/menu/crab_rangoons.jpg', alt: 'Crab Rangoon' },
  { src: '/images/menu/beef_with_broccoli.jpg', alt: 'Beef with Broccoli' },
  { src: '/images/menu/egg_rolls.jpg', alt: 'Egg Rolls' },
  { src: '/images/menu/sesame_chicken.jpg', alt: 'Sesame Chicken' },
  { src: '/images/menu/orange_chicken.jpg', alt: 'Orange Chicken' },
]

const categories = menuData.categories as unknown as MenuCategory[]

export default function MenuPage() {
  return (
    <div className="min-h-screen bg-slate-900">
      <NavBar />

      <div className="lg:flex min-h-screen pt-14">
        {/* ── Left sticky panel ── */}
        <aside className="hidden lg:block lg:w-1/2 sticky top-14 h-[calc(100vh-3.5rem)]">
          <div className="absolute inset-0 grid grid-cols-2 grid-rows-3 gap-0.5 bg-slate-950">
            {COLLAGE.map(({ src, alt }) => (
              <div key={src} className="relative overflow-hidden group cursor-pointer">
                <Image src={src} alt={alt} fill className="object-cover transition-transform duration-300 group-hover:scale-105" />
                {/* Hover label */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300" />
                <div className="absolute bottom-2 left-2 right-2 flex justify-center pointer-events-none">
                  <span className="translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300
                                   py-1 px-2.5 bg-black/60 backdrop-blur-sm border border-white/20 rounded-lg
                                   text-white text-xs font-medium whitespace-nowrap">
                    {alt}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/40 to-slate-950/20 pointer-events-none" />
          <div className="relative h-full flex items-center justify-center pointer-events-none">
            <h1 className="font-display italic font-bold text-6xl xl:text-7xl text-white drop-shadow-lg tracking-wide">
              OUR MENU
            </h1>
          </div>
        </aside>

        {/* ── Right scrollable panel ── */}
        <div className="w-full lg:w-1/2 min-h-screen bg-slate-900">
          {/* Mobile header */}
          <div className="lg:hidden px-4 py-4">
            <h1 className="font-display italic font-bold text-3xl text-white">Our Menu</h1>
          </div>

          {/* MenuList owns both the Pickup/Delivery toggle (top) and the category nav (below it) */}
          <Suspense>
            <MenuList categories={categories} />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
