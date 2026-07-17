/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bey: {
          red: '#E63946',
          black: '#1A1A1A',
          yellow: '#FFD23F',
        },
      },
    },
  },
  plugins: [],
};
