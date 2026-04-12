import Image from 'next/image'
import Link from 'next/link'
import NavBar from '@/components/NavBar'
import MostOrderedCarousel from '@/components/MostOrderedCarousel'
import OpenStatus from '@/components/OpenStatus'
import { FaUtensils, FaPhone, FaMapMarkerAlt } from 'react-icons/fa'

const COLLAGE = [
  { src: '/images/menu/sesame_chicken.jpg', alt: 'Sesame Chicken' },
  { src: '/images/menu/crab_rangoons.jpg', alt: 'Crab Rangoon' },
  { src: '/images/menu/general_tsos.jpg', alt: "General Tso's Chicken" },
  { src: '/images/menu/beef_with_broccoli.jpg', alt: 'Beef with Broccoli' },
  { src: '/images/menu/chicken_lo_mein.jpg', alt: 'Chicken Lo Mein' },
  { src: '/images/menu/egg_rolls.jpg', alt: 'Egg Rolls' },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-900">
      <NavBar />

      <div className="lg:flex min-h-screen pt-14">
        {/* ── Left sticky panel ── */}
        <aside className="hidden lg:block lg:w-1/2 sticky top-14 h-[calc(100vh-3.5rem)]">
          {/* Photo collage */}
          <div className="absolute inset-0 grid grid-cols-2 grid-rows-3 gap-0.5 bg-slate-950">
            {COLLAGE.map(({ src, alt }) => (
              <div key={src} className="relative overflow-hidden">
                <Image src={src} alt={alt} fill className="object-cover" />
              </div>
            ))}
          </div>
          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/40 to-slate-950/20 pointer-events-none" />
          {/* CTA content */}
          <div className="relative h-full flex flex-col items-center justify-center gap-3 px-12 text-center pointer-events-none">
            <h1 className="font-display italic font-bold text-5xl xl:text-6xl text-white leading-tight drop-shadow-lg mb-4">
              START YOUR<br />ORDER
            </h1>
            <div className="w-full max-w-xs space-y-2 pointer-events-auto">
              <div className="grid grid-cols-2 gap-2">
                <Link href="/menu" className="hero-btn gap-2">
                  <FaUtensils className="text-xs" /> VIEW MENU
                </Link>
                <a href="tel:+15154902888" className="hero-btn gap-2">
                  <FaPhone className="text-xs" /> CALL
                </a>
              </div>
              <Link href="/menu?mode=pickup" className="hero-btn w-full">ORDER PICKUP</Link>
              <Link href="/menu?mode=delivery" className="hero-btn w-full">ORDER DELIVERY</Link>
            </div>
          </div>
        </aside>

        {/* ── Right scrollable panel ── */}
        <main className="w-full lg:w-1/2 min-h-screen p-4 space-y-3">
          {/* Mobile hero */}
          <div className="lg:hidden relative rounded-2xl overflow-hidden mb-2">
            <Image src="/images/menu/hero-image.png" alt="Tsing Tsao" fill className="object-cover" />
            <div className="absolute inset-0 bg-black/60" />
            <div className="relative z-10 flex flex-col items-center px-5 py-8">
              <h1 className="font-display italic font-bold text-3xl text-white text-center leading-tight mb-6">
                START YOUR ORDER
              </h1>
              <div className="w-full max-w-xs space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Link href="/menu" className="hero-btn gap-2 text-sm">
                    <FaUtensils className="text-xs" /> VIEW MENU
                  </Link>
                  <a href="tel:+15154902888" className="hero-btn gap-2 text-sm">
                    <FaPhone className="text-xs" /> CALL
                  </a>
                </div>
                <Link href="/menu?mode=pickup" className="hero-btn w-full text-sm">ORDER PICKUP</Link>
                <Link href="/menu?mode=delivery" className="hero-btn w-full text-sm">ORDER DELIVERY</Link>
              </div>
              <div className="pb-2" />
            </div>
          </div>

          {/* About card */}
          <div className="info-card p-5 flex gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="font-display text-xl text-white mb-1.5">About Tsing Tsao Waukee</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                Open since 2008. Keeping quality food accessible. Meals made fresh and to order.
              </p>
              <Link
                href="/menu"
                className="mt-3 inline-flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              >
                <FaUtensils className="text-xs text-brand-gold" /> View Menu
              </Link>
            </div>
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden shrink-0 bg-slate-700">
              <Image src="/images/storefront.jpg" alt="Tsing Tsao Waukee" fill className="object-cover" />
            </div>
          </div>

          {/* Hours card */}
          <div className="info-card p-5">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 className="font-display text-xl text-white">Our Hours</h2>
              <OpenStatus />
            </div>
            <div className="flex items-start justify-between gap-4">
              <dl className="space-y-1.5 text-sm">
                {[
                  ['Monday – Thursday:', '11:00 AM – 9:00 PM'],
                  ['Friday – Saturday:', '11:00 AM – 9:30 PM'],
                  ['Sunday:', '11:00 AM – 8:30 PM'],
                ].map(([day, hours]) => (
                  <div key={day} className="flex gap-2 flex-wrap">
                    <dt className="text-slate-400 min-w-[160px] shrink-0">{day}</dt>
                    <dd className="text-white">{hours}</dd>
                  </div>
                ))}
              </dl>
              <a
                href="tel:+15154902888"
                className="shrink-0 flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap"
              >
                <FaPhone className="text-xs text-brand-gold" /> Order Over Phone
              </a>
            </div>
          </div>

          {/* Location card */}
          <div className="info-card overflow-hidden">
            {/* Map pinned to Tsing Tsao Waukee */}
            <div className="h-48">
              <iframe
                src="https://maps.google.com/maps?q=41.6131745,-93.8692034&output=embed&z=17"
                className="w-full h-full border-0"
                loading="lazy"
                title="Tsing Tsao Waukee location"
              />
            </div>
            <div className="p-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-xl text-white">Visit Us</h3>
                <p className="text-slate-400 text-xs mt-0.5">160 SE Laurel St, Waukee, IA 50263</p>
              </div>
              <a
                href="https://www.google.com/maps/place/Tsing+Tsao/@41.613174,-93.8794817,15z/data=!3m1!4b1!4m6!3m5!1s0x87ec2362e35497a1:0x569048ffc528c237!8m2!3d41.6131745!4d-93.8692034!16s%2Fg%2F1tf9ntn_?hl=en-US&entry=ttu"
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
              >
                <FaMapMarkerAlt className="text-brand-gold" />
                Get Directions
              </a>
            </div>
          </div>

          {/* Most Ordered carousel */}
          <div>
            <h2 className="font-display text-xl text-white mb-2 px-1">Most Ordered</h2>
            <MostOrderedCarousel />
          </div>

          {/* Review card */}
          <div className="info-card p-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-xl text-white mb-3">Leave A Review</h2>
              <p className="text-2xl font-bold tracking-tight select-none mb-3">
                <span className="text-blue-400">G</span>
                <span className="text-red-400">o</span>
                <span className="text-amber-400">o</span>
                <span className="text-blue-400">g</span>
                <span className="text-green-400">l</span>
                <span className="text-red-400">e</span>
              </p>
              <p className="text-amber-400 text-xl tracking-widest">★★★★★</p>
            </div>
            <a
              href="https://maps.app.goo.gl/TRBtECsW9iRfwxhFA"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white rounded-xl p-1.5 shrink-0 hover:opacity-90 transition-opacity"
              title="Scan to leave a Google Review"
            >
              <Image
                src="/images/qr-google-review.png"
                alt="Scan to leave a Google Review"
                width={96}
                height={96}
                className="rounded-lg"
              />
            </a>
          </div>

          {/* Available On card */}
          <div className="info-card p-5">
            <h2 className="font-display text-xl text-white mb-4">Available On</h2>
            <div className="grid grid-cols-2 gap-3">
              <a href="https://order.online/store/tsing-tsao-waukee-32583501/?delivery=true" target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center bg-white rounded-xl px-4 py-3 h-16 hover:opacity-90 transition-opacity">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/logos/doordash.png" alt="DoorDash" className="h-14 w-auto object-contain" />
              </a>
              <a href="https://www.grubhub.com/restaurant/tsing-tsao-160-se-laurel-st-waukee/2534918" target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center bg-[#F5603D] rounded-xl px-4 py-3 h-16 hover:opacity-90 transition-opacity">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/logos/grubhub.svg" alt="Grubhub" className="h-10 w-auto object-contain brightness-0 invert" />
              </a>
              <a href="https://www.ubereats.com/store/tsing-tsao-waukees/OdKVOdx6WcmTv6KFtJK9tw?srsltid=AfmBOoqWNo_U6PtCVDGiDSSJ7w2SmUNyeSospZxA6TISqaR0JEJ9KH1C" target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center bg-white rounded-xl px-4 py-3 h-16 hover:opacity-90 transition-opacity">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/logos/ubereats.png" alt="Uber Eats" className="h-13 w-auto object-contain" />
              </a>
              <a href="https://eatfuticonnect.com/restaurants/detail/456" target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center bg-black rounded-xl px-4 py-3 h-16 border border-slate-700 hover:border-slate-500 transition-colors">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/logos/eatfuti.png" alt="EatFuti" className="h-10 w-auto object-contain" />
              </a>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
