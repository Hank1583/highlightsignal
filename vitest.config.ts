import { defineConfig } from "vitest/config";
import path from "node:path";

// V12-02: this project's own required "unit"/"API integration" test layer
// for the Next.js side (the PHP side has its own PHPUnit suite under
// backend/dev/tests -- see that suite's own header comments). Node
// environment (not jsdom) -- everything tested here is server-only BFF
// logic (lib/, app/api/*/route.ts), never a React component.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // server-only's real package throws unconditionally when resolved
      // via plain Node module resolution -- its no-op-vs-throw behavior
      // depends entirely on Next's webpack "browser" field remapping,
      // which Vitest has no equivalent of. Every file under test here is
      // legitimately server-only code exercised in a Node test
      // environment (never bundled for a browser), so this alias swaps in
      // a real no-op for tests only -- it changes nothing about what
      // Next's own production build does.
      "server-only": path.resolve(__dirname, "tests/support/server-only-stub.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    reporters: process.env.CI ? ["default", "junit"] : ["default"],
    outputFile: { junit: ".vitest-cache/junit.xml" },
  },
});
