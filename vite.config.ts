// File: vite.config.ts

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

/**
 * Lovable route pills (top bar) require component tagging in development.
 * The `componentTagger()` plugin injects data attributes used by Lovable’s editor.
 */
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean) as any,
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
