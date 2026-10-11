/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Core Pantone 15-3817 TCX Lavender (RGB 177, 155, 214 - #B19BD6)
        brand: {
          50: '#FAF7FD',
          100: '#F3ECFB',
          200: '#E6DAF6',
          300: '#D5C3EE',
          400: '#C3AEE4',
          500: '#B19BD6', // Official Pantone 15-3817 TCX Lavender
          600: '#987DC2',
          700: '#8164AD',
          800: '#6A4C97',
          900: '#53377F',
          950: '#2E1C4B',
        },
        lavender: {
          50: '#FAF7FD',
          100: '#F3ECFB',
          200: '#E6DAF6',
          300: '#D5C3EE',
          400: '#C3AEE4',
          500: '#B19BD6', // Official Pantone Lavender
          600: '#987DC2',
          700: '#8164AD',
          800: '#6A4C97',
          900: '#53377F',
          950: '#2E1C4B',
        },
        // Unified alias for emerald to seamless light violet
        emerald: {
          50: '#FAF7FD',
          100: '#F3ECFB',
          200: '#E6DAF6',
          300: '#D5C3EE',
          400: '#C3AEE4',
          500: '#B19BD6',
          600: '#987DC2',
          700: '#8164AD',
          800: '#6A4C97',
          900: '#53377F',
          950: '#2E1C4B',
        },
        // Unified alias for teal to complementary rich violet
        teal: {
          50: '#F8F5FD',
          100: '#EFE8FA',
          200: '#DFD1F4',
          300: '#C8B3EA',
          400: '#B396DE',
          500: '#9E7AD2',
          600: '#8760BF',
          700: '#724BAA',
          800: '#5D3A8F',
          900: '#472A72',
          950: '#281545',
        },
        slate: {
          850: '#151f32',
          900: '#0f172a',
          950: '#090d16',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow': '0 0 25px -5px rgba(177, 155, 214, 0.45)',
        'glow-brand': '0 0 25px -5px rgba(177, 155, 214, 0.45)',
        'glow-lavender': '0 0 25px -5px rgba(177, 155, 214, 0.5)',
        'glow-emerald': '0 0 25px -5px rgba(177, 155, 214, 0.45)',
      }
    },
  },
  plugins: [],
}
