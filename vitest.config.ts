import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    include: ["shared/**/*.test.ts", "worker/**/*.test.ts", "src/**/*.test.{ts,tsx}"],
    exclude: ["node_modules", "dist", "e2e/**", "tests/workers/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
    },
  },
});
