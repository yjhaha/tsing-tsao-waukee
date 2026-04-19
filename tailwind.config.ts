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
          crimson: '#C50832',
        },
        slate: {
          50:  '#fff5f6',
          100: '#feeaed',
          200: '#fdd0d8',
          300: '#faa8b4',
          400: '#c47888',
          500: '#8f4a58',
          600: '#560020',
          700: '#3d0017',
          800: '#27000f',
          900: '#180008',
          950: '#0e0004',
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
