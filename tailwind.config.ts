import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['LinaRound', 'MPLUSRounded1c', 'Cairo', 'Inter', 'system-ui', 'sans-serif'],
        cairo: ['LinaRound', 'Cairo', 'system-ui', 'sans-serif'],
        inter: ['MPLUSRounded1c', 'Inter', 'system-ui', 'sans-serif'],
        arabic: ['LinaRound', 'Cairo', 'sans-serif'],
        english: ['MPLUSRounded1c', 'Inter', 'sans-serif'],
      },
      fontSize: {
        'xs': ['0.84rem', { lineHeight: '1.35rem' }],
        'sm': ['0.95rem', { lineHeight: '1.5rem' }],
        'base': ['1.0625rem', { lineHeight: '1.65rem' }],
        'lg': ['1.1875rem', { lineHeight: '1.75rem' }],
        'xl': ['1.3125rem', { lineHeight: '1.85rem' }],
        '2xl': ['1.625rem', { lineHeight: '2.1rem' }],
        '3xl': ['2rem', { lineHeight: '2.4rem' }],
        '4xl': ['2.375rem', { lineHeight: '2.75rem' }],
        '5xl': ['3.125rem', { lineHeight: '1.15' }],
      },
      colors: {
        background: '#0B0B0F',
        foreground: '#F8F7FC',
        surface: {
          DEFAULT: '#17131F',
          light: '#F8F7FC',
          dark: '#0B0B0F',
        },
        muted: '#888888',
        'muted-foreground': '#aaaaaa',
        border: 'rgba(255,255,255,0.08)',
        purple: {
          DEFAULT: '#7C3AED',
          50: '#F5F3FF',
          100: '#EDE9FE',
          200: '#DDD6FE',
          300: '#C4B5FD',
          400: '#A78BFA',
          500: '#8B5CF6',
          600: '#7C3AED',
          700: '#6D28D9',
          800: '#5B21B6',
          900: '#4C1D95',
          950: '#2E1065',
        },
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '112': '28rem',
        '128': '32rem',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'marquee': 'marquee 40s linear infinite',
        'gradient-x': 'gradient-x 8s ease infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        'gradient-x': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
      backgroundSize: {
        '300%': '300%',
      },
      screens: {
        'xs': '360px',
      },
    },
  },
  plugins: [],
}

export default config
