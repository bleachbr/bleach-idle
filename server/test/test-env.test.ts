import { describe, it, expect } from "vitest";
// import estático de propósito: é o caso que falhava. O ESM avalia os imports antes do corpo do arquivo,
// então um `process.env.DB_FILE = ":memory:"` escrito aqui chegaria tarde e o db.ts já teria aberto o arquivo
import * as db from "../src/db";

describe("ambiente do Vitest", () => {
  it("todo teste usa banco em memória, mesmo quem importa o db.ts antes de definir DB_FILE", () => {
    // sem isto, auth.test, arena.test e e2e-world-gameplay.test abriam o bleach-idle.sqlite do disco (o banco
    // de quem desenvolve) em workers paralelos, e o CI falhava às vezes com "database is locked"
    expect(process.env.DB_FILE).toBe(":memory:");
    expect(typeof db.getMeta).toBe("function");
  });
});
