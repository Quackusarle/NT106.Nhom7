// frontend/vite.config.js (Phiên bản đã sửa)

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
// *** BƯỚC 1: Import plugin mới ***
import { nodePolyfills } from 'vite-plugin-node-polyfills';

export default defineConfig({
  base: './',
  plugins: [
    
    basicSsl(), 
    react(),
    // *** BƯỚC 2: Thêm plugin vào đây. Nó sẽ xử lý 'process', 'Buffer', 'util', etc. ***
    nodePolyfills({
      // Tùy chọn để chỉ bao gồm các polyfill cần thiết.
      // Để trống để bao gồm tất cả.
      // Ví dụ:
      // include: ['process', 'buffer'],
      // protocolImports: true,
    }),
  ],

  // *** BƯỚC 3: XÓA HOÀN TOÀN KHỐI `define` và `resolve.alias` phức tạp ***
  // Chúng không còn cần thiết nữa, plugin sẽ lo việc này.

  server: {
    host: '0.0.0.0',
    port: 5173,
    https: true,
    // Cấu hình proxy vẫn giữ nguyên, nhưng hãy đảm bảo target là đúng
    // Khi bạn build, proxy này sẽ không hoạt động. Bạn cần cấu hình API endpoint một cách khác.
    proxy: {
      '/api': {
        // Địa chỉ này chỉ dùng cho DEV. 
        // Trong PROD, bạn cần cấu hình biến môi trường cho API URL.
        target: 'https://192.168.194.169:5001', 
        changeOrigin: true,
        secure: false, // Quan trọng khi backend dùng cert tự ký
        ws: true,
        rewrite: (path) => path
      }
    }
  },

  // Khối này không còn cần thiết vì plugin đã xử lý
  // optimizeDeps: {
  //   include: ['simple-peer', 'buffer', 'events', 'util']
  // },

  // Khối build có thể để trống, Vite sẽ tự xử lý
  build: {
    rollupOptions: {
      // Bất kỳ tùy chọn rollup nào bạn cần có thể thêm vào đây
    }
  }
});