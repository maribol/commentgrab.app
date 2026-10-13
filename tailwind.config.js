/** @type {import('tailwindcss').Config} */
// Design tokens follow the gtm-sites admin system (~/Work/gtm-sites/src/admin/style.css):
// warm-gray neutrals, hairline borders, no drop shadows, one solid violet brand. Colors are
// CSS variables (RGB triplets in src/ui/styles/tailwind.css) so dark mode repoints them and
// opacity modifiers like `bg-ink/40` still work.
const v = (name) => `rgb(var(--cg-${name}) / <alpha-value>)`;

export default {
  content: ['./src/**/*.{vue,ts,html}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        // ink-900 → ink, 800/700 → ink-soft, 600/500 → muted, 400/300 → faint
        ink: {
          DEFAULT: v('ink'),
          soft: v('ink-soft'),
          900: v('ink'),
          800: v('ink-soft'),
          700: v('ink-soft'),
          600: v('muted'),
          500: v('muted'),
          400: v('faint'),
          300: v('faint'),
        },
        muted: v('muted'),
        faint: v('faint'),
        line: { DEFAULT: v('line'), strong: v('line-strong') },
        surface: v('surface'),
        canvas: { DEFAULT: v('canvas'), 2: v('canvas-2') },
        shell: v('shell'),
        brand: {
          50: '#f1f0fe',
          100: '#e6e3fd',
          200: '#d0cafb',
          300: '#b1a6f8',
          400: '#8f7bf3',
          500: '#6d5ef6',
          600: '#5a45e8',
          700: '#4a37c9',
          800: '#3d2fa3',
          900: '#342b81',
        },
        // The old gradient stops, all folded onto the one brand violet.
        commentgrab: {
          violet: v('brand-fg'),
          fuchsia: '#8f7bf3',
          pink: '#5a45e8',
          orange: '#fb923c',
          amber: '#fbbf24',
        },
      },
      backgroundImage: {
        commentgrab: 'linear-gradient(#6d5ef6, #6d5ef6)',
        'commentgrab-soft': 'linear-gradient(rgb(var(--cg-brand-soft)), rgb(var(--cg-brand-soft)))',
        'commentgrab-radial': 'linear-gradient(rgb(var(--cg-brand-soft)), rgb(var(--cg-brand-soft)))',
      },
      boxShadow: {
        // Hairline borders, no drop shadows (the floating widget keeps a faint lift off the host page).
        card: 'none',
        soft: 'none',
        glow: 'none',
        sm: 'none',
        widget: '0 10px 30px -14px rgba(0,0,0,0.28)',
      },
      borderRadius: {
        md: '8px',
        lg: '10px',
        xl: '12px',
        '2xl': '16px',
        '3xl': '20px',
        '4xl': '24px',
      },
      keyframes: {
        'fade-up': { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'scale-in': { '0%': { opacity: '0', transform: 'scale(0.96)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
        shimmer: { '0%': { backgroundPosition: '0% 50%' }, '100%': { backgroundPosition: '200% 50%' } },
        'spin-slow': { to: { transform: 'rotate(360deg)' } },
        indeterminate: { '0%': { transform: 'translateX(-100%)' }, '100%': { transform: 'translateX(320%)' } },
      },
      animation: {
        'fade-up': 'fade-up 0.45s cubic-bezier(0.16,1,0.3,1) both',
        'scale-in': 'scale-in 0.2s cubic-bezier(0.22,1,0.36,1)',
        shimmer: 'shimmer 2.4s linear infinite',
        'spin-slow': 'spin-slow 1.1s linear infinite',
        indeterminate: 'indeterminate 1.1s cubic-bezier(0.4,0,0.2,1) infinite',
      },
    },
  },
  plugins: [],
};
