/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#73AF6F",
          50: "#f0f7ef",
          100: "#d9eed8",
          200: "#b3ddb1",
          300: "#8dcc8a",
          400: "#73AF6F",
          500: "#5a9456",
          600: "#437840",
          700: "#2e5c2b",
          800: "#1b3f19",
          900: "#0a2308",
        },
        surface: {
          DEFAULT: "#171717", // body background
          raised: "#1F1F1F", // cards, sidebar
          overlay: "#252525", // hover states, inputs
          border: "#313131", // all borders
        },
        ink: {
          DEFAULT: "#EDEDED", // primary text
          muted: "#A1A1A1", // secondary text
          faint: "#606060", // disabled / placeholder
        },
        status: {
          pending: { bg: "#2d2206", text: "#f59e0b", ring: "#92400e" },
          approved: { bg: "#0d2818", text: "#22c55e", ring: "#14532d" },
          rejected: { bg: "#2d0e0e", text: "#ef4444", ring: "#7f1d1d" },
        },
      },
      fontFamily: {
        display: ['"Jetbrains Mono"', "Inter", "serif"],
        sans: ['"Plus Jakarta Sans"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.5)",
        modal: "0 25px 60px rgba(0,0,0,0.7)",
        glow: "0 0 20px rgba(115,175,111,0.25)",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease forwards",
        "slide-up": "slideUp 0.35s cubic-bezier(0.16,1,0.3,1) forwards",
        shimmer: "shimmer 1.6s infinite",
      },
      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: {
          from: { opacity: 0, transform: "translateY(12px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-400px 0" },
          "100%": { backgroundPosition: "400px 0" },
        },
      },
    },
  },
  plugins: [],
};
