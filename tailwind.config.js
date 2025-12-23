/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        present: '#10b981', // green
        excused: '#eab308', // yellow
        unexcused: '#ef4444', // red
      }
    },
  },
  plugins: [],
}

