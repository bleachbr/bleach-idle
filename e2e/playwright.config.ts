// Testes de ponta a ponta no navegador (M5-03, ADR-001 de docs/features/e2e-navegador/).
// O jogo roda como em produção: o servidor do jogo entrega o build e o WebSocket na mesma origem.
import { defineConfig, devices } from "@playwright/test";

export const PORT = 2580; // não briga com npm run dev (2567/5173), os cenários (2577) nem o Jogador-IA (2578/5183)

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  globalSetup: "./global-setup.ts",
  // um servidor e um mundo para todos: um worker só, e o evento global (invasão) roda por último no próprio arquivo
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    ...devices["Desktop Chrome"],
    viewport: { width: 1280, height: 720 },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 720 } } }],
});
