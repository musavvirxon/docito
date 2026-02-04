import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Target modern browsers to avoid legacy polyfills
    target: 'esnext',
    // Disable modulepreload polyfill - all modern browsers support it natively
    modulePreload: {
      polyfill: false,
    },
    // Increase chunk size limit to reduce number of chunks
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            // Core React - keep minimal, load first
            if (id.includes('react-dom')) return 'vendor-react';
            if (id.includes('react-router')) return 'vendor-router';
            
            // UI libraries - separate chunk
            if (id.includes('@radix-ui') || id.includes('cmdk')) return 'vendor-ui';
            if (id.includes('lucide-react')) return 'vendor-icons';
            
            // Animation - separate chunks, defer loading
            if (id.includes('framer-motion')) return 'vendor-framer';
            if (id.includes('gsap')) return 'vendor-gsap';
            
            // Heavy visualization - only load on interaction
            if (id.includes('three') || id.includes('@react-three')) return 'vendor-three';
            if (id.includes('recharts')) return 'vendor-recharts';
            if (id.includes('d3-')) return 'vendor-d3';
            
            // Data layer - separate chunks
            if (id.includes('@supabase')) return 'vendor-supabase';
            if (id.includes('@tanstack/react-query')) return 'vendor-query';
            
            // Form handling
            if (id.includes('react-hook-form') || id.includes('zod') || id.includes('@hookform')) return 'vendor-forms';
            
            // Utilities - separate chunks
            if (id.includes('date-fns')) return 'vendor-date';
            if (id.includes('i18next')) return 'vendor-i18n';
            
            // PDF/Excel - very heavy, only for dashboards
            if (id.includes('jspdf') || id.includes('xlsx') || id.includes('html2canvas')) return 'vendor-export';
            
            // React markdown - only for specific pages
            if (id.includes('react-markdown') || id.includes('remark') || id.includes('rehype')) return 'vendor-markdown';
          }
        },
      },
    },
    // Minification settings
    minify: 'esbuild',
  },
  // Avoid transpiling modern JS features that are baseline in all browsers
  esbuild: {
    target: 'esnext',
    // Drop console.log in production for smaller bundle
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
}));