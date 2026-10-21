import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // SamDU Rasmiy Akademik va Davlat Hujjatlari Ranglar Palitrasi (Deep Royal Navy & Slate)
        primary: {
          50: '#f0f5fc',
          100: '#e1ecf9',
          200: '#c7def4',
          300: '#9ec7ed',
          400: '#6faae3',
          500: '#3f8ad6',
          600: '#1e6bb8',
          700: '#175494',
          800: '#144476',
          900: '#0f2b5c', // SamDU Asosiy Hujjat Rangi (Deep Academic Navy)
          950: '#091936',
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
