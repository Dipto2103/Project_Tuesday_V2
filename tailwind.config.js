/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Design Language Tokens
        bg: {
          0: 'var(--bg-0)',
          1: 'var(--bg-1)',
          2: 'var(--bg-2)',
          3: 'var(--bg-3)',
        },
        rust: 'var(--mars-rust)',
        orange: 'var(--mars-orange)',
        glow: 'var(--lantern-glow)',
        cyan: 'var(--science-cyan)',
        sand: 'var(--text)',
        dim: 'var(--text-dim)',
        faint: 'var(--text-faint)',
        border: {
          DEFAULT: 'var(--border)',
          strong: 'var(--border-strong)',
        },
        ok: 'var(--ok)',
        warn: 'var(--warn)',
        danger: 'var(--danger)',
        unknown: 'var(--unknown)',
        prov: {
          measured: 'var(--prov-measured)',
          nasa: 'var(--prov-nasa)',
          modeled: 'var(--prov-modeled)',
          simulated: 'var(--prov-simulated)',
          unknown: 'var(--prov-unknown)',
        },
        // Legacy 'mars' palette alias for seamless backward compatibility
        mars: {
          darkest: '#0B0D10',
          dark: '#101114',
          surface: '#15181D',
          card: '#1C2027',
          border: 'rgba(231,225,216,0.10)',
          rust: '#C65D38',
          'rust-dark': '#8c3a1e',
          orange: '#FF7043',
          'orange-bright': '#FF8A5C',
          amber: '#F5B544',
          sand: '#E7E1D8',
          muted: '#A0A0A0',
          text: '#E7E1D8',
          cyan: '#56D9E8',
          green: '#4ADE80',
          red: '#EF4444'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        'sm': 'var(--r-sm)',
        'md': 'var(--r-md)',
        'lg': 'var(--r-lg)',
        'xl': 'var(--r-xl)',
      },
      boxShadow: {
        'panel': 'var(--shadow-1)',
        'glow-orange': 'var(--glow-orange)',
        'glow-cyan': 'var(--glow-cyan)',
      }
    },
  },
  plugins: [],
}
