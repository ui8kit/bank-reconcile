/// <reference types="vitest/config" />
import path from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

const rootDir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  root: rootDir,
  resolve: {
    alias: {
      $lib: path.join(rootDir, "src/lib"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
})
