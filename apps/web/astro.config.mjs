import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

// Deployed as a static/SSR-hybrid build to Cloudflare Pages.
// `output: 'static'` since the dashboard is a client-side React island
// that talks to the separately-deployed API (apps/api) — no server
// rendering needed on the Pages side.
export default defineConfig({
  output: 'static',
  integrations: [
    react(),
    tailwind({ applyBaseStyles: false }),
  ],
  vite: {
    define: {
      'import.meta.env.PUBLIC_API_BASE_URL': JSON.stringify(
        process.env.PUBLIC_API_BASE_URL || 'http://localhost:8787'
      ),
    },
  },
});
