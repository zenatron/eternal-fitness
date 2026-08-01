/**
 * Builds a colour scale that reads from CSS custom properties, preserving
 * Tailwind's alpha-modifier syntax. See the `colors` block below.
 */
const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
const varScale = (name) =>
  Object.fromEntries(
    SHADES.map((shade) => [shade, `rgb(var(--${name}-${shade}) / <alpha-value>)`])
  );

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        body: ['var(--font-body)', 'sans-serif'],
      },
      colors: {
        /*
         * Accent and status colours resolve through CSS custom properties so a
         * theme can be swapped by setting [data-accent] on <html> — no class
         * rewriting, no duplicated utilities, no JS re-render.
         *
         * The `<alpha-value>` placeholder is what keeps Tailwind's slash-opacity
         * syntax working (`bg-accent-500/20`); without it every colour would be
         * fully opaque. That is why the variables hold bare `R G B` channel
         * triplets rather than finished `rgb()` strings.
         *
         * Definitions live in globals.css.
         */
        accent: varScale('accent'),

        // Status colours. Deliberately NOT themeable: these carry meaning, and
        // a success badge that turned purple with the accent would stop
        // communicating anything.
        success: varScale('success'),
        danger: varScale('danger'),
        warning: varScale('warning'),
        // Gold: trophies, PRs, achievement tiers. See globals.css.
        award: varScale('award'),
        info: varScale('info'),

        /*
         * Surfaces are a fixed, deliberately inverted scale: 0 is near-black and
         * 950 is cream, so `surface-50` is a *dark* value usable as light-mode
         * text. Not themeable — tinting every background per theme was
         * considered and rejected as too broad a blast radius.
         */
        surface: {
          0: '#0a0a09',
          50: '#111110',
          100: '#1a1918',
          200: '#242320',
          300: '#2f2d2a',
          400: '#3d3a36',
          500: '#504c47',
          600: '#6b665f',
          700: '#8a847c',
          800: '#a9a49c',
          900: '#c9c5bf',
          950: '#e8e6e2',
        },
      },
      keyframes: {
        'spring-in': {
          '0%': { opacity: '0', transform: 'scale(0.92) translateY(16px)' },
          '60%': { opacity: '1', transform: 'scale(1.02) translateY(-2px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        'spring-in-up': {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '60%': { opacity: '1', transform: 'translateY(-4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'spring-in-down': {
          '0%': { opacity: '0', transform: 'translateY(-16px)' },
          '60%': { opacity: '1', transform: 'translateY(3px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'spring-in-left': {
          '0%': { opacity: '0', transform: 'translateX(-24px)' },
          '60%': { opacity: '1', transform: 'translateX(4px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'spring-in-right': {
          '0%': { opacity: '0', transform: 'translateX(24px)' },
          '60%': { opacity: '1', transform: 'translateX(-4px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'pulse-energy': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        'ember-pulse': {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.05)' },
        },
      },
      animation: {
        'spring-in': 'spring-in 0.6s cubic-bezier(0.22, 0.61, 0.36, 1) both',
        'spring-in-up': 'spring-in-up 0.6s cubic-bezier(0.22, 0.61, 0.36, 1) both',
        'spring-in-down': 'spring-in-down 0.5s cubic-bezier(0.22, 0.61, 0.36, 1) both',
        'spring-in-left': 'spring-in-left 0.6s cubic-bezier(0.22, 0.61, 0.36, 1) both',
        'spring-in-right': 'spring-in-right 0.6s cubic-bezier(0.22, 0.61, 0.36, 1) both',
        'pulse-energy': 'pulse-energy 2s ease-in-out infinite',
        shimmer: 'shimmer 2s ease-in-out infinite',
        'ember-pulse': 'ember-pulse 3s ease-in-out infinite',
      },
    },
  },
  darkMode: 'class',
  plugins: [],
};
