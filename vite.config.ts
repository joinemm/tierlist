import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";

export default defineConfig({
  base: "/tierlist/",
  plugins: [solidPlugin()],
  optimizeDeps: {
    exclude: ["@modular-forms/solid"],
  },
  server: {
    port: 3000,
  },
  build: {
    target: "esnext",
  },
});
