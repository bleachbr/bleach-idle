import { describe, it, expect } from "vitest";
import {
  achievementsTabLabel,
  achievementsHeaderHtml,
  achievementsBodyHtml,
  updateBookAchievementsTab,
  updateBookAchievements,
  type AchievementItem,
} from "../src/bookAchievements";

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

  it("achievementsBodyHtml concatena cabeçalho com a lista de conquistas", () => {
    const list: AchievementItem[] = [{ id: "a1", done: true }];
    const html = achievementsBodyHtml(list, '<div class="ach done">Primeira</div>');
    expect(html).toContain("<h3>Conquistas (1/1)</h3>");
    expect(html).toContain('<div class="ach done">Primeira</div>');
  });
});

describe("montagem do Livro e atualização de conquistas no DOM", () => {
  const sampleAchievements: AchievementItem[] = [
    { id: "c1", done: true },
    { id: "c2", done: false },
    { id: "c3", done: true },
    { id: "c4", done: false },
  ];

  it("com data-tab=\"bestiario\" selecionada, o botão data-tab=\"conquistas\" exibe Conquistas (X/Y)", () => {
    const tabBtn = { textContent: "Conquistas" };
    const panel = {
      querySelector: (sel: string) => (sel === '.tabs button[data-tab="conquistas"]' ? tabBtn : null),
    };
    const body = { innerHTML: "<div class=\"beast\">Bestiario HTML</div>" };

    updateBookAchievements("bestiario", sampleAchievements, { panel, body });

    // O botão no cabeçalho exibe o progresso mesmo sem estar na aba conquistas
    expect(tabBtn.textContent).toBe("Conquistas (2/4)");
    // O corpo do bestiário não é alterado pela montagem de conquistas
    expect(body.innerHTML).toBe("<div class=\"beast\">Bestiario HTML</div>");
  });

  it("com conquistas selecionada, #book-body contém o cabeçalho Conquistas (X/Y)", () => {
    const tabBtn = { textContent: "Conquistas" };
    const panel = {
      querySelector: (sel: string) => (sel === '.tabs button[data-tab="conquistas"]' ? tabBtn : null),
    };
    const body = { innerHTML: "" };
    const listHtml = '<div class="ach done">Conquista Concluída</div>';

    updateBookAchievements("conquistas", sampleAchievements, { panel, body }, listHtml);

    // Rótulo da aba atualizado
    expect(tabBtn.textContent).toBe("Conquistas (2/4)");
    // Cabeçalho h3 visível no topo do corpo sem rolar a lista
    expect(body.innerHTML).toContain("<h3>Conquistas (2/4)</h3>");
    expect(body.innerHTML).toContain("2/4 conquistas. A recompensa chega sozinha.");
    expect(body.innerHTML).toContain(listHtml);
  });

  it("updateBookAchievementsTab tolera ausência de painel ou botão", () => {
    expect(() => updateBookAchievementsTab(null, sampleAchievements)).not.toThrow();
    expect(() => updateBookAchievementsTab({ querySelector: () => null }, sampleAchievements)).not.toThrow();
  });
});
