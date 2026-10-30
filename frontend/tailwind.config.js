/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bgDark: '#07060b',
        panelDark: '#0e0c14',
        borderDark: '#3a2a55',
        textLight: '#e9e4f5',
        pumpkin: '#ff7a1a',
        ghostPurple: '#8f7bff',
      },
      fontFamily: {
        elite: ['"Special Elite"', 'cursive', 'serif'],
        terminal: ['"VT323"', 'monospace'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      }
    },
  },
  plugins: [],
}
