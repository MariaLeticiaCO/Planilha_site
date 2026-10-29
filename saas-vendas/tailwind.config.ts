import type { Config } from 'tailwindcss';
import forms from '@tailwindcss/forms';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        marca: {
          50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 300: '#c4b5fd', 400: '#a78bfa',
          500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9', 800: '#5b21b6', 900: '#4c1d95', 950: '#2e1065'
        },
        tinta: { DEFAULT: '#0f172a', 2: '#475569', 3: '#94a3b8' }
      },
      fontFamily: {
        sans: ['var(--fonte-texto)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--fonte-titulo)', 'var(--fonte-texto)', 'ui-sans-serif', 'sans-serif']
      },
      boxShadow: {
        suave: '0 1px 2px rgb(15 23 42 / 0.04), 0 4px 16px -4px rgb(15 23 42 / 0.06)',
        destaque: '0 12px 32px -8px rgb(109 40 217 / 0.45)'
      },
      keyframes: {
        entrar: { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'none' } },
        subir: { from: { transform: 'translateY(100%)' }, to: { transform: 'none' } }
      },
      animation: { entrar: 'entrar .25s ease-out both', subir: 'subir .25s cubic-bezier(.2,.8,.2,1) both' }
    }
  },
  plugins: [forms]
} satisfies Config;
