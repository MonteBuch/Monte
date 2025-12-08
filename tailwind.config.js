/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],

  // ✅ RICHTIG platzierte Safelist
  safelist: [
    "bg-cyan-50", "bg-cyan-100", "bg-cyan-200",
    "bg-teal-50", "bg-teal-100", "bg-teal-200",
    "bg-blue-50", "bg-blue-100", "bg-blue-200",
    "bg-pink-50", "bg-pink-100", "bg-pink-200",
    "bg-yellow-50", "bg-yellow-100", "bg-yellow-200",
    "bg-green-50", "bg-green-100", "bg-green-200",
    "bg-violet-50", "bg-violet-100", "bg-violet-200",
    "bg-orange-50", "bg-orange-100", "bg-orange-200",
    "bg-slate-50", "bg-slate-100", "bg-slate-200",
    "bg-fuchsia-50", "bg-fuchsia-100", "bg-fuchsia-200",
    "bg-amber-50", "bg-amber-100", "bg-amber-200",
  ],

  theme: {
    extend: {},
  },
  plugins: [],
}