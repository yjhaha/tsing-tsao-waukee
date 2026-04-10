import type { Metadata } from 'next'
import { Instrument_Serif, Bai_Jamjuree, Bebas_Neue } from 'next/font/google'
import './globals.css'
import { CartProvider } from '@/context/CartContext'

const instrumentSerif = Instrument_Serif({ weight: '400', style: ['normal', 'italic'], subsets: ['latin'], variable: '--font-instrument-serif' })
const baiJamjuree = Bai_Jamjuree({ weight: ['400', '500', '600', '700'], subsets: ['latin'], variable: '--font-bai-jamjuree' })
const bebas = Bebas_Neue({ weight: '400', subsets: ['latin'], variable: '--font-bebas' })

export const metadata: Metadata = {
  title: 'Tsing Tsao | Waukee, Iowa',
  description: 'Order online from Tsing Tsao in Waukee, Iowa. Authentic Chinese cuisine.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${instrumentSerif.variable} ${baiJamjuree.variable} ${bebas.variable} font-sans antialiased bg-slate-900 text-white`}
      >
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  )
}
