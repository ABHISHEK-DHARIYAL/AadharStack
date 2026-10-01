/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: { ink: '#17242C', vellum: '#E9ECE6', paper: '#F7F8F4', line: '#C6CCC3', safety: '#F26B21', steel: '#4A6474' },
      fontFamily: { sans: ['"Familjen Grotesk"', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
}
