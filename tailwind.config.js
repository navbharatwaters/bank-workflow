/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
        body: ['Outfit', 'sans-serif'],
      },
      colors: {
        navy: {
          DEFAULT: '#1B3A6B',
          50:  '#EEF4FF',
          100: '#DDEAFF',
          200: '#B8CFFC',
          300: '#7AAAF8',
          400: '#3B7EF3',
          500: '#1B5FE0',
          600: '#1B3A6B',
          700: '#162E55',
          800: '#0F1F3B',
          900: '#080F1E',
        },
        accent: {
          blue:  '#3B82F6',
          green: '#10B981',
          amber: '#F59E0B',
          red:   '#EF4444',
        },
      },
      animation: {
        'fade-up':       'fadeUp 0.45s ease forwards',
        'fade-in':       'fadeIn 0.3s ease forwards',
        'check-in':      'checkIn 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards',
        'pulse-dot':     'pulseDot 1.5s ease-in-out infinite',
        'indeterminate': 'indeterminate 1.4s ease-in-out infinite',
        'shimmer':       'shimmer 2s linear infinite',
        'float':         'float 6s ease-in-out infinite',
      },
      keyframes: {
        fadeUp:   { from: { opacity: 0, transform: 'translateY(20px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        fadeIn:   { from: { opacity: 0 }, to: { opacity: 1 } },
        checkIn:  {
          '0%':   { transform: 'scale(0) rotate(-10deg)', opacity: 0 },
          '70%':  { transform: 'scale(1.2) rotate(5deg)',  opacity: 1 },
          '100%': { transform: 'scale(1) rotate(0)' },
        },
        pulseDot: {
          '0%, 100%': { opacity: 1, transform: 'scale(1)' },
          '50%':      { opacity: 0.4, transform: 'scale(0.7)' },
        },
        indeterminate: {
          '0%':   { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(350%)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-20px)' },
        },
      },
    },
  },
  plugins: [],
}
