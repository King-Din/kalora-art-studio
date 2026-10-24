import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Same-origin in development: the browser only talks to :5173 and Vite forwards /api and /images.
// (changeOrigin stays false so the Host header matches the browser's Origin for the server's origin check.)
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:4000",
      "/images": "http://localhost:4000",
    },
  },
});
