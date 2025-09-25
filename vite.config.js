import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    // Replace the placeholder in the code with the actual build timestamp
    // This ensures each build has a unique timestamp
    __BUILD_TIMESTAMP__: JSON.stringify(Date.now())
  },
  build: {
    // Increase chunk size warning limit to prevent warnings for large bundles
    chunkSizeWarningLimit: 1600
  }
})
