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
        inlineDynamicImports: true,
        manualChunks: undefined as any,
      },
    },
  },
}));
