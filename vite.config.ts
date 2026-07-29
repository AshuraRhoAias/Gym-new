import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const mobile = !!/android|ios/.exec(process.env.TAURI_ENV_PLATFORM ?? '')

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: mobile ? '0.0.0.0' : false,
    hmr: mobile
      ? {
          protocol: 'ws',
          host: process.env.TAURI_DEV_HOST,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ['**/src-tauri/**'],
    },
  },
})
