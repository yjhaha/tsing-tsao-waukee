import Link from 'next/link'
import NavBar from '@/components/NavBar'

export default function CancelPage() {
  return (
    <div className="min-h-screen bg-slate-900">
      <NavBar />
      <div className="max-w-md mx-auto px-4 pt-32 pb-12 text-center">
        <div className="text-6xl mb-6">🛒</div>
        <h1 className="font-display italic text-4xl text-white mb-3">Order Cancelled</h1>
        <p className="text-slate-400 text-base mb-10">
          No worries — your cart is still saved. Ready when you are.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/cart"
            className="px-8 py-3.5 bg-brand-gold text-slate-900 rounded-xl font-bold hover:bg-yellow-400 transition-colors"
          >
            Back to Cart
          </Link>
          <Link
            href="/menu"
            className="px-8 py-3.5 border border-slate-600 text-slate-300 rounded-xl font-medium hover:border-slate-400 hover:text-white transition-colors"
          >
            Browse Menu
          </Link>
        </div>
      </div>
    </div>
  )
}
