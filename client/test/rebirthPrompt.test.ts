import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { rebirthPrompt } from "../src/rebirthPrompt";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");

describe("janela de renascimento (issue #35)", () => {
  it("primeiro renascimento: volta ao nível 8 e mostra o bônus de agora e o de depois", () => {
    const r = rebirthPrompt({ level: 60, rebirths: 0 });
    expect(r.title).toBe("Renascer (1º)");
    expect(r.ready).toBe(true);
    expect(r.reset).toBe("Você volta ao nível 8 e vai para a praça de Karakura.");
    expect(r.bonus).toEqual(["XP: +0% → +10%", "Dano: +0% → +5%", "Vida: +0% → +5%"]);
    expect(r.requirements).toEqual([{ text: "Nível 60 (você está no 60)", ok: true }]);
    expect(r.note).toBe("Fique 6 segundos fora de combate antes de confirmar.");
    expect(r.next).toBe("O renascimento seguinte pede o nível 65.");
  });

  it("renascimentos seguintes acumulam o bônus e o nível pedido sobe até 100", () => {
    const r = rebirthPrompt({ level: 80, rebirths: 3 });
    expect(r.title).toBe("Renascer (4º)");
    expect(r.bonus).toEqual(["XP: +30% → +40%", "Dano: +15% → +20%", "Vida: +15% → +20%"]);
    expect(r.requirements[0]).toEqual({ text: "Nível 75 (você está no 80)", ok: true });
    expect(rebirthPrompt({ level: 100, rebirths: 9 }).next).toBe("O renascimento seguinte pede o nível 100.");
  });

  it("abaixo do nível pedido a confirmação fica bloqueada (o servidor também recusa)", () => {
    const r = rebirthPrompt({ level: 59, rebirths: 0 });
    expect(r.ready).toBe(false);
    expect(r.requirements[0]).toEqual({ text: "Nível 60 (você está no 59)", ok: false });
  });

  it("no limite de 250 renascimentos não oferece confirmar", () => {
    expect(rebirthPrompt({ level: 100, rebirths: 250 }).ready).toBe(false);
  });

  it("cliente e servidor leem o mesmo limite de shared/ (sem 250 escrito à mão)", () => {
    expect(read("../src/rebirthPrompt.ts")).not.toMatch(/\b250\b/);
    expect(read("../../server/src/WorldRoom.ts")).toMatch(/p\.rebirths >= REBIRTH_MAX/);
  });

  it("o botão de renascer não usa mais o window.confirm do navegador", () => {
    const main = read("../src/main.ts");
    const handler = main.slice(main.indexOf('$("#rebirth-btn")'), main.indexOf('$("#rebirth-btn")') + 800);
    expect(handler).not.toBe("");
    expect(handler).not.toMatch(/\bconfirm\(/);
  });

  it("o index.html tem um diálogo próprio com Confirmar Renascimento e Cancelar", () => {
    const html = read("../index.html");
    expect(html).toMatch(/<dialog id="rebirth-dialog" aria-labelledby="rebirth-title" aria-describedby="rebirth-reset"/);
    expect(html).toMatch(/<button type="button" id="rebirth-cancel" autofocus>Cancelar<\/button>/);
    expect(html).toMatch(/<button type="button" id="rebirth-confirm"[^>]*>Confirmar Renascimento<\/button>/);
  });
});
