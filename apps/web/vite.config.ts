/**
 * Vite config. React 19 + TypeScript. Architecture §7.1.
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'node:path';

export default defineConfig({
  // Tailwind v4 plugin must be registered before the React plugin so its
  // virtual module is resolved before the React JSX transform runs.
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router'],
          'dnd-vendor': ['@dnd-kit/core', '@dnd-kit/utilities', '@dnd-kit/sortable', 'dnd-timeline'],
          'visx-vendor': ['@visx/axis', '@visx/scale', '@visx/group', '@visx/shape'],
          // Yjs core. The realtime transport (SupabaseBroadcastProvider)
          // is our own code in `apps/web/src/lib/`, not a vendored chunk.
          // `y-protocols` is intentionally omitted — it has no `.` export,
          // only subpath imports (e.g. `y-protocols/awareness`), so it
          // cannot be a manualChunks root entry. Its files are bundled
          // alongside the modules that import them.
          'yjs-vendor': ['yjs'],
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    // Exclude Playwright e2e specs from the Vitest unit-test runner.
    // Playwright owns `tests/e2e/**`; Vitest owns `src/**/*.test.ts(x)`.
    exclude: ['node_modules', 'dist', 'tests/e2e/**', '**/playwright-report/**'],
  },
});
