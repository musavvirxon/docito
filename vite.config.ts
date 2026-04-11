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
    // Selective modulePreload: preload only entry-point dependencies (discovered
    // from HTML) to flatten the critical request chain. Dynamic import() chunks
    // (lazy routes, below-the-fold sections) are NOT preloaded — they load on-demand.
    modulePreload: {
      polyfill: false,
      resolveDependencies: (filename: string, deps: string[], { hostType }: { hostId: string; hostType: 'html' | 'js' }) => {
        // Only inject <link rel="modulepreload"> for the initial entry's deps
        // Skip preloading for JS-initiated dynamic imports (lazy routes, etc.)
        return hostType === 'html' ? deps : [];
      },
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
            
            // UI libraries - lucide icons used broadly across pages
            if (id.includes('lucide-react')) return 'vendor-icons';
            
            // === DYNAMIC-SPLIT LIBS: DO NOT assign manualChunks ===
            // @radix-ui and cmdk are only partially used on the home page
            // (dropdown-menu, tooltip). Letting Vite split them naturally
            // avoids loading unused components (select, scroll-area, slider, etc.).
            
            // Data layer - needed early for auth
            if (id.includes('@supabase')) return 'vendor-supabase';
            if (id.includes('@tanstack/react-query')) return 'vendor-query';
            
            // i18n - needed early for translations
            if (id.includes('i18next')) return 'vendor-i18n';
            
            // Date utilities - used broadly
            if (id.includes('date-fns')) return 'vendor-date';
            
            // === DYNAMIC-ONLY LIBS: DO NOT assign manualChunks ===
            // These are only used via dynamic import() and must NOT be forced
            // into named chunks, otherwise Rollup may pull them into the
            // initial load. Let Vite handle their code splitting naturally.
            //
            // - jspdf, xlsx, html2canvas, jspdf-autotable, pako (export/PDF)
            // - recharts, d3-* (dashboard charts)
            // - three, @react-three (3D viewer)
            // - framer-motion (animations - lazy pages)
            // - gsap (animations - lazy pages)
            // - react-hook-form, zod, @hookform (forms - lazy pages)
            // - react-markdown, remark, rehype (markdown - lazy pages)
          }
        },
      },
    },
    // Use esbuild for minification (built into Vite, no extra dependency)
    minify: 'esbuild',
    // CSS code splitting for smaller initial payload
    cssCodeSplit: true,
  },
  // Avoid transpiling modern JS features that are baseline in all browsers
  esbuild: {
    target: 'esnext',
    drop: ['console', 'debugger'],
  },
}));
