import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],

    // Local dev server
    server: {
        port: 3000,
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:8000',
                changeOrigin: true,
            }
        }
    },

    // Production build optimizations
    build: {
        outDir: 'dist',
        sourcemap: false,       // Disable source maps in production (smaller bundle)
        chunkSizeWarningLimit: 1000,
        rollupOptions: {
            output: {
                // Split vendor libraries into separate chunks for better caching
                manualChunks: {
                    'react-vendor': ['react', 'react-dom', 'react-router-dom'],
                    'chart-vendor': ['recharts'],
                    'ui-vendor': ['lucide-react', 'axios'],
                    'animation-vendor': ['gsap', 'animejs'],
                }
            }
        }
    }
})