/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-jakarta)", "Inter", "system-ui", "sans-serif"],
      },
      colors: {
        ink: "#1b1530",
        lavender: {
          50: "#faf8ff",
          100: "#f3efff",
          200: "#e8e0ff",
          300: "#d6caff",
          400: "#bba9ff",
        },
        brand: {
          400: "#9b82ff",
          500: "#7c5cfc",
          600: "#6a47ea",
          700: "#5835c7",
          800: "#43289a",
        },
      },
      boxShadow: {
        soft: "0 2px 4px rgba(27,21,48,.03), 0 14px 36px -14px rgba(106,71,234,.22)",
        lift: "0 4px 8px rgba(27,21,48,.04), 0 24px 48px -16px rgba(106,71,234,.30)",
      },
      borderRadius: {
        "4xl": "2rem",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: 0, transform: "translateY(12px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        pop: {
          "0%": { opacity: 0, transform: "scale(.96) translateY(8px)" },
          "100%": { opacity: 1, transform: "scale(1) translateY(0)" },
        },
        slideIn: {
          "0%": { opacity: 0, transform: "translateX(24px)" },
          "100%": { opacity: 1, transform: "translateX(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-up": "fadeUp .45s cubic-bezier(.2,.8,.2,1) both",
        pop: "pop .25s cubic-bezier(.2,.8,.2,1) both",
        "slide-in": "slideIn .3s cubic-bezier(.2,.8,.2,1) both",
      },
    },
  },
  plugins: [],
};
