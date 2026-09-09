import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./pages/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Manrope', 'system-ui', 'sans-serif'], mono: ['IBM Plex Mono', 'monospace'] },
      colors: { arthix: { ink: '#f4f5f6', muted: '#969ba4', panel: '#0b0d10', line: 'rgba(255,255,255,.1)', cyan: '#7dd3fc', green: '#7ee2a8', amber: '#f4bf73', red: '#fb7185' } },
      boxShadow: { panel: '0 20px 70px rgba(0,0,0,.35)', cyan: '0 0 24px rgba(125,211,252,.16)' },
    },
  },
  plugins: [],
};

export default config;
