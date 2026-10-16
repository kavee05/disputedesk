import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    // Tests never touch PayPal or an AI provider: in-memory DB, demo mode.
    env: { DATABASE_PATH: ":memory:", DEMO_MODE: "true", GEMINI_API_KEY: "", ANTHROPIC_API_KEY: "" },
  },
  resolve: { alias: { "@": new URL("./src", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1") } },
});
