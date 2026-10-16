import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
      },
      boxShadow: {
        panel: '0 12px 32px rgb(15 23 42 / 8%)',
      },
      colors: {
        canvas: '#f7f8fc',
        ink: '#172033',
        muted: '#67748e',
        line: '#e5e9f2',
        brand: '#4f46e5',
      },
    },
  },
  plugins: [],
} satisfies Config;
