/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          bg: '#12181F',
          surface: '#1A222D',
          card: '#1E2733',
        },
        accent: {
          mint: '#00E676',
          emerald: '#10B981',
          gold: '#F59E0B',
          cyan: '#00D9F5',
        },
        sepia: {
          bg: '#F5F0E8',
          surface: '#EDE6D6',
          card: '#E8E0CF',
          text: '#5C4B37',
        },
      },
      fontFamily: {
        amiri: ['Amiri', 'serif'],
        cairo: ['Cairo', 'sans-serif'],
        tajawal: ['Tajawal', 'sans-serif'],
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'completion-flash': 'completion-flash 600ms ease-out',
        'slide-up': 'slide-up 400ms cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in': 'fade-in 300ms ease-out',
        'bounce-subtle': 'bounce-subtle 300ms ease-out',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(0, 230, 118, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(0, 230, 118, 0.6)' },
        },
        'completion-flash': {
          '0%': { boxShadow: '0 0 0 0 rgba(245, 158, 11, 0.7)' },
          '70%': { boxShadow: '0 0 0 20px rgba(245, 158, 11, 0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(245, 158, 11, 0)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'bounce-subtle': {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.15)' },
          '100%': { transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
