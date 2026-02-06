import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { componentTagger } from "lovable-tagger";

/**
 * Vite plugin to make CSS non-render-blocking by using media="print" + onload pattern.
 * This defers CSS loading while critical styles are already inlined in index.html.
 */
function asyncCssPlugin(): Plugin {
  return {
    name: 'async-css',
    enforce: 'post',
    transformIndexHtml(html) {
      // Transform Vite-injected CSS links to use async loading pattern
      // Pattern: <link rel="stylesheet" href="/assets/index-*.css">
      return html.replace(
        /<link rel="stylesheet" crossorigin href="(\/assets\/[^"]+\.css)">/g,
        `<link rel="preload" href="$1" as="style" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="$1"></noscript>`
      );
    },
  };
}

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' && componentTagger(),
    mode === 'production' && asyncCssPlugin(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Optimize dependencies for modern browsers
  optimizeDeps: {
    esbuildOptions: {
      target: 'esnext',
    },
  },
  build: {
    // Target modern browsers to avoid legacy polyfills
    target: 'esnext',
    // Generate source maps for debugging in production
    sourcemap: true,
    // Disable modulepreload entirely - prevents browser from eagerly downloading
    // all dynamically-imported chunks (vendor-export, vendor-recharts, etc.)
    // Chunks will load on-demand when actually needed via lazy() / dynamic import()
    modulePreload: false,
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
    // Use terser for more aggressive minification (especially for icons)
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
      },
      mangle: true,
      format: {
        comments: false,
      },
    },
    // CSS code splitting for smaller initial payload
    cssCodeSplit: true,
  },
  // Avoid transpiling modern JS features that are baseline in all browsers
  esbuild: {
    target: 'esnext',
  },
}));
