import { defineConfig } from "vitest/config";

// File parallelism is off: every test file resets the same real Atlas TEST database.
export default defineConfig({
  test: {
    environment: "node",
    fileParallelism: false,
    setupFiles: ["./tests/setup.js"],
    testTimeout: 60000,
    hookTimeout: 60000,
  },
});
