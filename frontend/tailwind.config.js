/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: '#121212', // Very dark background
        surface: '#1E1E1E', // Slightly lighter surface
        primary: '#FFD700', // High contrast yellow
        secondary: '#00E5FF', // High contrast cyan
        error: '#FF5252', // High contrast red
        text: '#FFFFFF', // Pure white text
        textMuted: '#B3B3B3', // Muted text with good enough contrast
      }
    },
  },
  plugins: [],
}