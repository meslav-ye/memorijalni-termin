import { defineConfig } from "vitest/config";
import path from "node:path";

// Jedinicni testovi pokrivaju iskljucivo lib/domain/ — ciste funkcije bez Reacta,
// bez baze i bez preglednika. Zato je okruzenje "node", a ne jsdom.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["lib/domain/**", "lib/format.ts"],
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
});
