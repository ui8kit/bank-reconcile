import path from "node:path"
import { fileURLToPath } from "node:url"
import { svelte } from "@sveltejs/vite-plugin-svelte"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite"

const rootDir = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  root: rootDir,
  plugins: [tailwindcss(), svelte()],
  resolve: {
    alias: {
      $lib: path.join(rootDir, "src/lib"),
      "$ui8kit/ui": path.join(rootDir, "src/lib/ui8kit/ui/index.ts"),
      "$ui8kit/utils": path.join(rootDir, "src/lib/ui8kit/utils/index.ts"),
    },
  },
  server: {
    port: 5180,
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
})
