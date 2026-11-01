import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["**/*.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", "test/**"],
    globals: true,
    // acima dos 5 s de `once` e `vi.waitFor`: assim a espera vencida mostra a asserção que falhou,
    // e não "Test timed out", e termina dentro do próprio teste, sem seguir rodando durante o seguinte
    testTimeout: 10_000,
  },
});
