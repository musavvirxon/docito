// File: vite.config.ts

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

/**
 * Prevent blank-screen issues in preview environments caused by stale dynamically imported chunks.
 * We inline dynamic imports so route-level lazy chunks can't 404 after a deployment.
 */
export default defineConfig({
  plugins: [react()],
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
});
