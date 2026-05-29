import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        proxy: {
            '/proxy/backend': {
                target: 'http://52.14.226.191:8081',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/proxy\/backend/, ''),
            },
            '/proxy/ia': {
                target: 'http://52.14.226.191:8080',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/proxy\/ia/, ''),
            },
        },
    },
});
