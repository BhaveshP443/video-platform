import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: './', // ✅ ensures JS paths work on Netlify

  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000', // ✅ local backend
        changeOrigin: true
      }
    }
  },

  define: {
    __API_BASE__: JSON.stringify(
      mode === 'development'
        ? 'http://localhost:5000/api'
        : 'https://video-platform-q44x.onrender.com/api' // ✅ your Render backend
    )
  }
}));
