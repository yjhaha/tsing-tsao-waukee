import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          gold: '#FFAE00',
          red: '#C41E3A',
        },
      },
      fontFamily: {
        display: ['var(--font-instrument-serif)', 'Georgia', 'serif'],
        sans: ['var(--font-bai-jamjuree)', 'system-ui', 'sans-serif'],
        condensed: ['var(--font-bebas)', 'Impact', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
