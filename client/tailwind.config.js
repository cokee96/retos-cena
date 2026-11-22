/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        night: '#1a1a2e',
        'night-light': '#16213e',
        accent: '#e94560',
        'accent-dark': '#c73652',
        gold: '#f5a623',
      },
    },
  },
  plugins: [],
};
