import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  base: './',

  server: {
    host: 'localhost',
    port: 5173,
    strictPort: false,
    https: false as any,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
    },
    // Proxy para evitar erros de CORS em desenvolvimento local
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
      '/socket.io': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
      '/uploads': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
        secure: false,
      },
      '/rtc': {
        target: 'http://livego.store:1985',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/rtc/, '/rtc')
      }
    }
  },

  preview: {
    host: 'localhost',
    port: 5173,
    strictPort: true,
  },
})
