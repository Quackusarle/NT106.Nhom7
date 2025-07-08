







import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
  plugins: [basicSsl(), react()],
  define: {
   global: 'window',
    'process.nextTick': '((fn, ...args) => Promise.resolve().then(() => fn(...args)))',
    'process.env': '{}',
    process: '({ nextTick: (fn, ...args) => Promise.resolve().then(() => fn(...args)), env: {} })',
  },
  resolve: {
    alias: {
      buffer: 'buffer',
      events: 'events', 
      util: 'util',
      stream: 'stream-browserify',
      'readable-stream': 'vite-compatible-readable-stream'
    },
  },
  server: {
    host: '0.0.0.0', // Listen on all network interfaces
    port: 5173,
    https: true, // Enable HTTPS with self-signed certificate
    proxy: {
      '/api': {
        target: 'https://192.168.1.158:5001', // Backend server address
        changeOrigin: true,
        secure: false,
        ws: true,
        rewrite: (path) => path
      }
    }
  },
  optimizeDeps: {
    include: ['simple-peer', 'buffer', 'events', 'util']
  },
  rollupOptions: {
    external: [],
    globals: {
      'util': 'util'
    }
  },
  build: {
    rollupOptions: {
      external: [],
      output: {
        globals: {}
      }
    }
  }
})