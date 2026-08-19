import { defineConfig } from "vitest/config"
import { fileURLToPath } from "node:url"

// Config de Vitest para carpintería.
// Lógica pura (lib/*) en node; componentes React (*.test.tsx) en jsdom.
// El alias '@' replica el paths de tsconfig.json.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    environmentMatchGlobs: [["**/*.test.tsx", "jsdom"]],
    include: ["tests/**/*.test.{ts,tsx}"],
    globals: false,
    setupFiles: ["./tests/setup.ts"],
  },
})
