/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'figtree': ['Figtree', 'sans-serif'],
      },
      colors: {
        black: '#000000',
        white: '#ffffff',
        gray: {
          50: '#f9f9f9',
          100: '#f3f3f3',
          200: '#e8e8e8',
          300: '#d1d1d1',
          400: '#b4b4b4',
          500: '#8b8b8b',
          600: '#6b6b6b',
          700: '#4a4a4a',
          800: '#2d2d2d',
          900: '#1a1a1a',
        }
      }
    },
  },
  plugins: [],
}