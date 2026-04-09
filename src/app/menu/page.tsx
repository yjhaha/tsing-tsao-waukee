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
              <div key={src} className="relative overflow-hidden">
                <Image src={src} alt={alt} fill className="object-cover" />
              </div>
            ))}
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/40 to-slate-950/20" />
          <div className="relative h-full flex items-center justify-center">
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

          {/* Sticky category nav */}
          <nav className="sticky top-14 z-10 bg-slate-900/95 backdrop-blur border-b border-slate-700/50 px-4">
            <div className="flex gap-1 overflow-x-auto py-2.5 scrollbar-none">
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

          <MenuList categories={categories} />
        </div>
      </div>
    </div>
  )
}
