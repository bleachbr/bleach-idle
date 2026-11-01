// Testes de ponta a ponta no navegador (M5-03, ADR-001 de docs/features/e2e-navegador/).
// O jogo roda como em produção: o servidor do jogo entrega o build e o WebSocket na mesma origem.
import { defineConfig, devices } from "@playwright/test";
import { PORT } from "./port";

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.ts",
  globalSetup: "./global-setup.ts",
  // um servidor e um mundo para todos: um worker só, e os arquivos rodam em ordem alfabética
  // (o do evento global, a invasão, começa com "zz" para rodar por último)
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 30_000,
  // nada de execução pendurada: se travar, o job falha e o artefato sobe
  globalTimeout: 10 * 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 720 } } }],
});
