import { describe, it, expect } from "vitest";
import { achievementsTabLabel, achievementsHeaderHtml, type AchievementItem } from "../src/bookAchievements";

describe("aba Conquistas do Livro (contador de progresso)", () => {
  it("rótulo da aba com lista vazia ou nula mostra apenas Conquistas", () => {
    expect(achievementsTabLabel([])).toBe("Conquistas");
    expect(achievementsTabLabel(null)).toBe("Conquistas");
    expect(achievementsTabLabel(undefined)).toBe("Conquistas");
  });

  it("rótulo da aba mostra Conquistas (X/Y) com o total e concluídas", () => {
    const list: AchievementItem[] = [
      { id: "a1", done: true },
      { id: "a2", done: false },
      { id: "a3", done: true },
      { id: "a4", done: false },
    ];
    expect(achievementsTabLabel(list)).toBe("Conquistas (2/4)");
  });

  it("rótulo quando todas estão feitas", () => {
    const list: AchievementItem[] = [
      { id: "a1", done: true },
      { id: "a2", done: true },
    ];
    expect(achievementsTabLabel(list)).toBe("Conquistas (2/2)");
  });

  it("cabeçalho da aba de conquistas exibe título h3 com o contador numérico", () => {
    const list: AchievementItem[] = [
      { id: "a1", done: true },
      { id: "a2", done: false },
      { id: "a3", done: true },
    ];
    const html = achievementsHeaderHtml(list);
    expect(html).toContain("<h3>Conquistas (2/3)</h3>");
    expect(html).toContain("2/3 conquistas");
  });
});
