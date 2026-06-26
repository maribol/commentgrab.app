/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{vue,ts,html}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      colors: {
        ink: {
          DEFAULT: '#0b1020',
          900: '#0b1020',
          700: '#1e2435',
          500: '#5b6172',
          400: '#858b9c',
          300: '#aab0c0',
        },
        commentgrab: {
          violet: '#7c3aed',
          fuchsia: '#d946ef',
          pink: '#ec4899',
          orange: '#fb923c',
          amber: '#fbbf24',
        },
      },
      backgroundImage: {
        commentgrab: 'linear-gradient(135deg, #7c3aed 0%, #d946ef 52%, #ec4899 100%)',
        'commentgrab-soft':
          'linear-gradient(100deg, rgba(124,58,237,0.14) 0%, rgba(217,70,239,0.14) 50%, rgba(236,72,153,0.14) 100%)',
        'commentgrab-radial':
          'radial-gradient(120% 120% at 0% 0%, rgba(124,58,237,0.16) 0%, rgba(217,70,239,0.09) 45%, rgba(236,72,153,0.05) 100%)',
      },
      boxShadow: {
        // Flat by default — the dashboard uses hairline borders, not drop shadows.
        card: '0 1px 2px rgba(11,16,32,0.03)',
        soft: '0 1px 2px rgba(11,16,32,0.04)',
        glow: '0 1px 2px rgba(11,16,32,0.04)',
        widget: '0 12px 32px -12px rgba(11,16,32,0.22), 0 0 0 1px rgba(11,16,32,0.04)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '200% 50%' },
        },
        'spin-slow': {
          to: { transform: 'rotate(360deg)' },
        },
        indeterminate: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(320%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.35s cubic-bezier(0.22,1,0.36,1)',
        'scale-in': 'scale-in 0.2s cubic-bezier(0.22,1,0.36,1)',
        shimmer: 'shimmer 2.4s linear infinite',
        'spin-slow': 'spin-slow 1.1s linear infinite',
        indeterminate: 'indeterminate 1.1s cubic-bezier(0.4,0,0.2,1) infinite',
      },
    },
  },
  plugins: [],
};
