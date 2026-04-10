'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FaShoppingBag } from 'react-icons/fa'
import { useCart } from '@/context/CartContext'

export default function NavBar() {
  const { count } = useCart()
  const pathname = usePathname()

  return (
    <nav className="fixed top-0 inset-x-0 z-50 h-14 flex items-center justify-between px-5 bg-slate-900/95 backdrop-blur border-b border-slate-700/50">
      <Link href="/" className="font-condensed text-3xl text-brand-gold tracking-wider leading-none">
        TSING TSAO
      </Link>

      <div className="flex items-center gap-2">
        <Link
          href="/"
          className={`px-4 py-1.5 text-sm rounded-full transition-colors ${
            pathname === '/'
              ? 'bg-brand-gold text-slate-900 font-semibold'
              : 'text-slate-300 border border-slate-600 hover:border-slate-400 hover:text-white'
          }`}
        >
          About
        </Link>
        <Link
          href="/menu"
          className={`px-4 py-1.5 text-sm rounded-full transition-colors ${
            pathname === '/menu'
              ? 'bg-brand-gold text-slate-900 font-semibold'
              : 'text-slate-300 border border-slate-600 hover:border-slate-400 hover:text-white'
          }`}
        >
          Menu
        </Link>
        {count > 0 && (
          <Link
            href="/cart"
            className="ml-1 flex items-center gap-1.5 px-3.5 py-1.5 bg-brand-gold text-slate-900 text-sm font-bold rounded-full hover:bg-yellow-400 transition-colors"
          >
            <FaShoppingBag className="text-xs" /> {count}
          </Link>
        )}
      </div>
    </nav>
  )
}
