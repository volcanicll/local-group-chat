import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import polyfillNode from "rollup-plugin-polyfill-node";

export default defineConfig({
  plugins: [react(), polyfillNode()],
  define: {
    "process.env": {},
    global: "globalThis",
  },
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://locahost:4000",
        changeOrigin: true,
      },
      "/socket.io": {
        target: "http://locahost:4000",
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
