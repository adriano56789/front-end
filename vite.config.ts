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
        target: 'https://livego.store',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
      // ── Socket.IO (presentes/chat em tempo real — mesmo servidor Express do backend) ──
      '/socket.io': {
        target: 'https://livego.store',
        changeOrigin: true,
        secure: false,
        ws: true,
      },
      '/uploads': {
        target: 'https://livego.store',
        changeOrigin: true,
        secure: false,
      },
      '/rtc': {
        target: `https://${process.env.VITE_SRS_HOST || '2.25.192.154'}`,
        changeOrigin: true,
        secure: false,
        ws: true,
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
