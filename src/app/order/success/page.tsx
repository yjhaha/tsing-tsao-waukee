import Link from 'next/link'
import NavBar from '@/components/NavBar'

export default function SuccessPage() {
  return (
    <div className="min-h-screen bg-slate-900">
      <NavBar />
      <div className="max-w-md mx-auto px-4 pt-32 pb-12 text-center">
        <div className="text-6xl mb-6">🎉</div>
        <h1 className="font-display italic text-4xl text-white mb-3">Order Placed!</h1>
        <p className="text-slate-400 text-base mb-2">
          Thank you for ordering from Tsing Tsao. We&apos;re preparing your food now.
        </p>
        <p className="text-slate-500 text-sm mb-10">
          A confirmation will be sent to your email shortly.
        </p>
        <Link
          href="/menu"
          className="inline-block px-8 py-3.5 bg-brand-gold text-slate-900 rounded-xl font-bold hover:bg-yellow-400 transition-colors"
        >
          Back to Menu
        </Link>
      </div>
    </div>
  )
}
