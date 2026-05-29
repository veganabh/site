import { defineConfig, configDefaults } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: false,
    css: false,
    // Worktrees do Claude (cópias stale) e specs e2e (Playwright, rodam via
    // `npm run e2e`) não entram na suíte unit/component do vitest.
    exclude: [...configDefaults.exclude, "**/.claude/**", "**/tests/e2e/**"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
