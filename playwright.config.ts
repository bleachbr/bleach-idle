import { defineConfig, devices } from "@playwright/test";
import { resolve } from "node:path";

export default defineConfig({
  testDir: resolve(__dirname, "e2e/tests"),
  testMatch: "**/*.spec.ts",
  globalSetup: resolve(__dirname, "e2e/global-setup.ts"),
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 30_000,
  globalTimeout: 10 * 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://localhost:2580",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 720 } } }],
});
