import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    // Mirror Caddy's production path routing so a single relative API base works
    // in dev: strip the prefix and forward to the individual services.
    proxy: {
      '/auth': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/auth/, ''),
      },
      '/training': {
        target: 'http://localhost:4001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/training/, ''),
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    // undici's fetch (used under jsdom) cannot parse relative URLs, so give the
    // API base an absolute origin in tests. Requests are stubbed, so this host
    // is never actually contacted.
    env: {
      VITE_API_URL: 'http://localhost',
    },
  },
});
