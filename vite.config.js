import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  // GitHub Pages serves this repo under a subpath in production
  base:"/",
  plugins: [react()],
  publicDir: "public",
  server: {
    fs: {
      // Allow serving files from one level up to the project root
      allow: [".."],
    },
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",

    // 👇 ADD THIS LINE
    chunkSizeWarningLimit: 1000,

    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
}));
