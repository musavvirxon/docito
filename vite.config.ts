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
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('framer-motion')) return 'vendor-framer';
            if (id.includes('three') || id.includes('@react-three')) return 'vendor-three';
            if (id.includes('recharts') || id.includes('d3-')) return 'vendor-charts';
            if (id.includes('@supabase')) return 'vendor-supabase';
            if (id.includes('react-dom')) return 'vendor-react';
            if (id.includes('@radix-ui') || id.includes('cmdk')) return 'vendor-ui';
            if (id.includes('i18next')) return 'vendor-i18n';
            if (id.includes('gsap')) return 'vendor-gsap';
            if (id.includes('date-fns')) return 'vendor-date';
            if (id.includes('react-hook-form') || id.includes('zod') || id.includes('@hookform')) return 'vendor-forms';
          }
        },
      },
    },
  },
}));