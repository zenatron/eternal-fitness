/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'], // Adjust to match your project structure
  theme: {
      extend: {
        keyframes: {
          'gradient-move': {
            '0%': { backgroundPosition: '0% 50%' },
            '50%': { backgroundPosition: '100% 50%' },
            '100%': { backgroundPosition: '0% 50%' },
          },
        },
        animation: {
          'gradient-move': 'gradient-move 3s ease infinite',
        },
        colors: {
          'apple-blue': '#007AFF',
          'apple-green': '#34C759',
          'apple-yellow': '#FFCC00',
          'apple-orange': '#FF9500',
          'apple-red': '#FF3B30',
        },
      },
  },
  darkMode: 'class',
  plugins: [],
};