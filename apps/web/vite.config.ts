/**
 * Vite config. React 19 + TypeScript. Architecture §7.1.
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
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
          'yjs-vendor': ['yjs', 'y-protocols', 'y-supabase'],
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
  },
});
