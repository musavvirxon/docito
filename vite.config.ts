// File: vite.config.ts

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

/**
 * Lovable "Page routes" (top bar) relies on component tagging in dev/preview.
 * This config:
 * - Uses the same React plugin Lovable expects (@vitejs/plugin-react-swc)
 * - Enables lovable-tagger only when serving (command === "serve")
 * - Forces the dev server host/port Lovable embeds against
 */
export default defineConfig(({ command }) => ({
  server: {
    host: "::",
    port: 8080,
    strictPort: true,
  },
  plugins: [react(), command === "serve" ? componentTagger() : null].filter(Boolean) as any,
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-ui": ["@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu", "@radix-ui/react-tabs", "@radix-ui/react-tooltip"],
          "vendor-query": ["@tanstack/react-query"],
          "vendor-motion": ["framer-motion", "gsap"],
          "vendor-supabase": ["@supabase/supabase-js"],
        },
      },
    },
  },
}));
