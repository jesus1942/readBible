import { defineConfig } from "vite";
export default defineConfig({
  server: {
    host: "0.0.0.0",
    allowedHosts: ["terminal.local"],
    proxy: {
      "/proxy": { target: "https://versiculodiario-production.up.railway.app", changeOrigin: true },
      "/api": { target: "https://versiculodiario-production.up.railway.app", changeOrigin: true, rewrite: (path) => path.replace(/^\/api/, "") }
    }
  }
});
