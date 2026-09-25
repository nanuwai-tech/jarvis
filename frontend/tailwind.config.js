/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        jarvis: {
          dark: "#0B0E14",
          surface: "#121824",
          accent: "#00E5FF",
          glow: "#00B4D8",
          subtle: "#1E293B",
        }
      }
    },
  },
  plugins: [],
}
