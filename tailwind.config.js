/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['"Be Vietnam Pro"', 'system-ui', 'sans-serif'] },
      colors: {
        ink: '#1A1D21',
        muted: '#5B6470',
        sub: '#4A525C',
        line: '#E3E5E8',
        line2: '#D5D9DE',
        soft: '#F5F6F8',
        brand: { DEFAULT: '#2357D9', dark: '#1A43AD', soft: '#EAF0FD' },
        accent: { DEFAULT: '#E07B24', dark: '#A35211', soft: '#FFF4E5' },
      },
    },
  },
  plugins: [],
};
