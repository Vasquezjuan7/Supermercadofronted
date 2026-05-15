import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/proxy/backend': {
        target: 'http://18.219.0.19:8081',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/backend/, ''),
      },
      '/proxy/ia': {
        target: 'http://18.219.0.19:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/ia/, ''),
      },
    },
  },
})
