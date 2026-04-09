import type { Metadata } from 'next'
import { Inter, Playfair_Display, Bebas_Neue } from 'next/font/google'
import './globals.css'
import { CartProvider } from '@/context/CartContext'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' })
const bebas = Bebas_Neue({ weight: '400', subsets: ['latin'], variable: '--font-bebas' })

export const metadata: Metadata = {
  title: 'Tsing Tsao | Waukee, Iowa',
  description: 'Order online from Tsing Tsao in Waukee, Iowa. Authentic Chinese cuisine.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${playfair.variable} ${bebas.variable} font-sans antialiased bg-slate-900 text-white`}
      >
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  )
}
