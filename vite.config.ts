import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    build: {
      // No sourcemaps in production — saves ~41 KiB and stops leaking internals
      sourcemap: false,
      // Minify with esbuild (default, fast)
      minify: 'esbuild',
      // Warn on chunks over 400 KiB
      chunkSizeWarningLimit: 400,
      rollupOptions: {
        output: {
          // Split large dependencies into separate chunks
          // Browser caches them independently — repeat visits are much faster
          manualChunks: {
            // React core — changes rarely
            'vendor-react': ['react', 'react-dom'],
            // Charts — large, only needed on dashboard
            'vendor-charts': ['recharts'],
            // Animation — only needed on certain pages
            'vendor-motion': ['motion'],
            // Syntax highlighting — large, defer it
            'vendor-prism': ['prismjs'],
            // Firebase — only needed if user is logged in
            'vendor-firebase': ['firebase'],
            // Google AI SDK
            'vendor-genai': ['@google/genai'],
            // Icons
            'vendor-icons': ['lucide-react'],
          },
        },
      },
    },
  };
});
