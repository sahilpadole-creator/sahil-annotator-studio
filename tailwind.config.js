/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#ecfeff',
          100: '#cffafe',
          500: '#06b6d4',
          600: '#0891b2',
          700: '#0e7490',
        },
        studio: {
          darkBg: '#090d16',
          darkPanel: '#111726',
          darkCard: '#182138',
          darkBorder: '#232f4e',
          lightBg: '#f8fafc',
          lightPanel: '#ffffff',
          lightCard: '#f1f5f9',
          lightBorder: '#e2e8f0',
        }
      }
    },
  },
  plugins: [],
}
