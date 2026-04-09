import Image from 'next/image'
import Link from 'next/link'
import NavBar from '@/components/NavBar'

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
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/40 to-slate-950/20" />
          {/* CTA content */}
          <div className="relative h-full flex flex-col items-center justify-center gap-3 px-12 text-center">
            <h1 className="font-display italic font-bold text-5xl xl:text-6xl text-white leading-tight drop-shadow-lg mb-4">
              START YOUR<br />ORDER
            </h1>
            <div className="w-full max-w-xs space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Link href="/menu" className="hero-btn">VIEW MENU 🍴</Link>
                <a href="tel:+15154902888" className="hero-btn">CALL 📞</a>
              </div>
              <Link href="/menu" className="hero-btn w-full">ORDER PICKUP</Link>
              <Link href="/menu" className="hero-btn w-full">ORDER DELIVERY</Link>
            </div>
          </div>
        </aside>

        {/* ── Right scrollable panel ── */}
        <main className="w-full lg:w-1/2 min-h-screen p-4 space-y-3">
          {/* Mobile hero */}
          <div className="lg:hidden relative h-52 rounded-2xl overflow-hidden mb-2">
            <Image src="/images/menu/hero-image.png" alt="Tsing Tsao" fill className="object-cover" />
            <div className="absolute inset-0 bg-black/55 flex flex-col items-center justify-center gap-3 px-6">
              <h1 className="font-display italic font-bold text-3xl text-white text-center leading-tight">
                START YOUR ORDER
              </h1>
              <Link href="/menu" className="hero-btn text-sm px-6">VIEW MENU 🍴</Link>
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
                className="mt-3 inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
              >
                View Menu 🍴
              </Link>
            </div>
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden shrink-0 bg-slate-700">
              <Image src="/images/storefront.jpg" alt="Tsing Tsao Waukee" fill className="object-cover" />
            </div>
          </div>

          {/* Hours card */}
          <div className="info-card p-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-xl text-white mb-3">Our Hours</h2>
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
            </div>
            <a
              href="tel:+15154902888"
              className="shrink-0 flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors whitespace-nowrap mt-1"
            >
              Order Over Phone 📞
            </a>
          </div>

          {/* Location card */}
          <div className="info-card">
            <div className="flex h-40">
              <iframe
                src="https://maps.google.com/maps?q=950+SE+University+Ave+Waukee+IA+50263&output=embed&z=15"
                className="flex-1 border-0 min-w-0"
                loading="lazy"
                title="Tsing Tsao Waukee location"
              />
              <div className="relative w-36 shrink-0 bg-slate-700">
                <Image src="/images/menu/orange_chicken.jpg" alt="Orange Chicken" fill className="object-cover" />
              </div>
            </div>
            <div className="p-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-white">Visit Us</h3>
                <p className="text-slate-400 text-xs mt-0.5">950 SE University Ave, Waukee, IA 50263</p>
              </div>
              <a
                href="https://maps.google.com/?q=950+SE+University+Ave,+Waukee,+IA+50263"
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-1"
              >
                Get Directions to Us 📍
              </a>
            </div>
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
              href="https://g.page/r/REPLACE_WITH_GOOGLE_PLACE_ID/review"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white rounded-xl p-2.5 shrink-0 hover:opacity-90 transition-opacity"
              title="Scan to leave a Google Review"
            >
              {/* Replace src with actual QR code image once generated */}
              <div className="w-20 h-20 bg-slate-100 flex flex-col items-center justify-center rounded gap-1.5">
                <div className="grid grid-cols-3 gap-0.5">
                  {[1,0,1, 0,1,0, 1,0,1].map((filled, i) => (
                    <div key={i} className={`w-5 h-5 rounded-sm ${filled ? 'bg-slate-800' : 'bg-slate-200'}`} />
                  ))}
                </div>
                <p className="text-[9px] text-slate-500 font-bold tracking-widest">SCAN ME</p>
              </div>
            </a>
          </div>

          {/* Available On card */}
          <div className="info-card p-5">
            <h2 className="font-display text-xl text-white mb-4">Available On</h2>
            <div className="flex flex-wrap gap-2.5">
              <a
                href="#"
                className="px-4 py-2.5 bg-[#FF3008] text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
              >
                DoorDash
              </a>
              <a
                href="#"
                className="px-4 py-2.5 bg-[#F63440] text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
              >
                GrubHub
              </a>
              <a
                href="#"
                className="px-4 py-2.5 bg-black text-white rounded-xl text-sm font-bold border border-slate-600 hover:border-slate-400 transition-colors"
              >
                Uber Eats
              </a>
              <a
                href="#"
                className="px-4 py-2.5 bg-[#00B67A] text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
              >
                EatFuti
              </a>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
