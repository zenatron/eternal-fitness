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
          'gradient-x': {
            '0%, 100%': {
              'background-size': '200% 200%',
              'background-position': 'left center'
            },
            '50%': {
              'background-size': '200% 200%',
              'background-position': 'right center'
            },
          },
        },
        animation: {
          'gradient-move': 'gradient-move 3s ease infinite',
          'gradient-x': 'gradient-x 3s ease-in-out infinite',
        },
        colors: {
          'apple-blue': '#007AFF',
          'apple-green': '#34C759',
          'apple-yellow': '#FFCC00',
          'apple-orange': '#FF9500',
          'apple-red': '#FF3B30',
          // Theme colors
          'app-bg': {
            light: '#f9fafb', // Slightly lighter gray than gray-50
            dark: '#111827', // Matches gray-900
          },
          'app-card': {
            light: '#ffffff', // White for cards in light mode
            dark: '#1f2937', // Gray-800 for cards in dark mode
          },
        },
      },
  },
  darkMode: 'class',
  plugins: [],
};