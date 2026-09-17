import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

// WRANGLER_CONFIG lets tests point the dev server at a fully-local config
// (see wrangler.e2e.jsonc). Defaults preserve the existing dev behavior.
const wranglerConfig = process.env.WRANGLER_CONFIG;

export default defineConfig({
  plugins: [
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
    }),
    react(),
    wranglerConfig ? cloudflare({ configPath: wranglerConfig }) : cloudflare(),
  ],
});
