/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx,md,mdx}'],
  theme: {
    extend: {
      colors: {
        // Base surfaces — a blue-tinted charcoal "terminal ink", not pure black.
        ink: '#0D1017',
        surface: '#141A22',
        raised: '#1B2330',
        hairline: '#262F3B',

        // Text
        ash: '#E6EAF2',
        dim: '#8B93A3',

        // Dual pipeline accents — the whole product is "two lenses on one page",
        // so every score/chart/tag inherits one of these two rather than a
        // single brand accent.
        seo: {
          DEFAULT: '#4C8DFF', // crawl blue — classic search/hyperlink association
          dim: '#2C4A85',
          soft: '#1A2740',
        },
        geo: {
          DEFAULT: '#FFB84D', // citation amber — "highlighter ink" on quotable text
          dim: '#8A6229',
          soft: '#332314',
        },

        // Severity (independent of pipeline color)
        critical: '#FF6B6B',
        warn: '#F2B84B',
        minor: '#7A8699',
      },
      fontFamily: {
        // Same type superfamily for display and body — cohesive "engineering
        // spec" feel appropriate to a tool whose whole job is machine-reading.
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        sans: ['"IBM Plex Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        seam: 'inset 1px 0 0 0 rgba(255,255,255,0.04)',
      },
    },
  },
  plugins: [],
};
