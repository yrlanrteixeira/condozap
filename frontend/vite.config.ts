import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@/shared": path.resolve(__dirname, "./src/shared"),
      "@/components": path.resolve(__dirname, "./src/shared/components"),
      "@/hooks": path.resolve(__dirname, "./src/shared/hooks"),
      "@/utils": path.resolve(__dirname, "./src/shared/utils"),
      "@/styles": path.resolve(__dirname, "./src/shared/styles"),
      "@/contexts": path.resolve(__dirname, "./src/shared/contexts"),
      "@/store": path.resolve(__dirname, "./src/shared/store"),
      "@/types": path.resolve(__dirname, "./src/@types"),
    },
  },
  build: {
    outDir: "dist",
    copyPublicDir: true,
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-redux": ["@reduxjs/toolkit", "react-redux", "redux-persist"],
          "vendor-query": ["@tanstack/react-query"],
          "vendor-form": ["react-hook-form", "@hookform/resolvers", "zod"],
        },
      },
    },
  },
});
