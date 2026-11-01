import { defineConfig } from "vite";

export default defineConfig({
  server: {
    proxy: {
      "/release": "http://127.0.0.1:2567",
    },
  },
});
