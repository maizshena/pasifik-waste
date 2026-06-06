/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#73AF6F',
          50:  '#f0f7ef',
          100: '#d9eed8',
          200: '#b3ddb1',
          300: '#8dcc8a',
          400: '#73AF6F',
          500: '#5a9456',
          600: '#437840',
          700: '#2e5c2b',
          800: '#1b3f19',
          900: '#0a2308',
        },
        surface: {
          DEFAULT: '#ffffff',
          muted:   '#f8faf8',
          border:  '#e4ede3',
          overlay: '#edf5ec',
        },
        ink: {
          DEFAULT: '#1a2e1a',
          muted:   '#4a6b49',
          faint:   '#8aaa89',
        },
      },
      fontFamily: {
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        sans:    ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        card:  '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        float: '0 4px 24px rgba(115,175,111,0.15)',
        modal: '0 20px 60px rgba(0,0,0,0.12)',
      },
      animation: {
        'fade-in':  'fadeIn 0.3s ease forwards',
        'slide-up': 'slideUp 0.35s cubic-bezier(0.16,1,0.3,1) forwards',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn:    { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp:   { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        pulseSoft: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.7' } },
      },
    },
  },
  plugins: [],
};