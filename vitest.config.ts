import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["**/*.test.ts"],
    globals: true,
    // acima dos 5 s de `once` e `vi.waitFor`: assim a espera vencida mostra a asserção que falhou,
    // e não "Test timed out", e termina dentro do próprio teste, sem seguir rodando durante o seguinte
    testTimeout: 10_000,
    // banco em memória em todos os workers, antes de qualquer import: quem importa o db.ts estaticamente
    // (auth.test, arena.test, e2e-world-gameplay.test) abria o bleach-idle.sqlite do disco em paralelo
    // e o CI falhava às vezes com "database is locked" (server/test/test-env.test.ts).
    // Vale por cima do DB_FILE do shell: os testes nunca abrem um banco em disco
    env: { DB_FILE: ":memory:" },
  },
});
