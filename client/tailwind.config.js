/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontSize: {
        'xs': '1.01563rem',
        'sm': '1.17188rem',
        'base': '1.46484rem',
        'lg': '1.64063rem',
        'xl': '1.95313rem',
        '2xl': '2.44141rem',
        '3xl': '3.05176rem',
        '4xl': '3.8147rem',
        '5xl': '4.76837rem',
        '6xl': '5.96046rem',
        '7xl': '7.45058rem',
        '8xl': '9.31323rem',
        '9xl': '11.64153rem',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
