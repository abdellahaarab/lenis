import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#322F83',
        secondary: '#5C4999',
        signal: '#F2A93B'
      },
      fontSize: {
        '2xs': ['0.78rem', { lineHeight: '1.25rem' }],
        xs: ['0.84rem', { lineHeight: '1.35rem' }],
        sm: ['0.95rem', { lineHeight: '1.45rem' }],
        base: ['1.0625rem', { lineHeight: '1.65rem' }],
        lg: ['1.1875rem', { lineHeight: '1.75rem' }],
        xl: ['1.3125rem', { lineHeight: '1.85rem' }],
        '2xl': ['1.625rem', { lineHeight: '2.1rem' }],
        '3xl': ['2rem', { lineHeight: '2.4rem' }],
        '4xl': ['2.375rem', { lineHeight: '2.8rem' }],
        '5xl': ['3.125rem', { lineHeight: '1.15' }]
      }
    }
  },
  plugins: []
} satisfies Config;
