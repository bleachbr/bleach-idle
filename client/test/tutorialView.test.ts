import { describe, it, expect } from "vitest";
import { renderTutorialStep, tutorialAction, dispatchTutorialAction } from "../src/tutorialView";

describe("Lote 4: Primeiros passos interativos e atalhos de HUD", () => {
  it("renderTutorialStep gera botões de ação clicáveis para passos não concluídos", () => {
    // Passo de Auto Hunt pendente
    const autoStep = { id: "auto", text: "Ligue o Auto Hunt (continua caçando com o jogo fechado)", done: false };
    const autoHtml = renderTutorialStep(autoStep);
    expect(autoHtml).toContain('data-act="auto"');
    expect(autoHtml).toContain("Ligar Auto Hunt (H)");
    expect(autoHtml).toContain("tut-act");
    expect(autoHtml).not.toContain("done");

    // Passo de Livro/Diária pendente
    const dailyStep = { id: "daily", text: "Abra o livro e pegue a recompensa diária", done: false };
    const dailyHtml = renderTutorialStep(dailyStep);
    expect(dailyHtml).toContain('data-act="book"');
    expect(dailyHtml).toContain("Abrir Livro (L)");
    expect(dailyHtml).toContain("tut-act");

    // Passo de Kisuke/Loja pendente
    const shopStep = { id: "shop", text: "Visite o Kisuke na praça (loja, missões e forja)", done: false };
    const shopHtml = renderTutorialStep(shopStep);
    expect(shopHtml).toContain('data-act="travel"');
    expect(shopHtml).toContain("Ir ao Kisuke");

    // Passo de Bankai pendente
    const bankaiStep = { id: "bankai", text: "No nível 10, solte o Bankai (tecla T)", done: false };
    const bankaiHtml = renderTutorialStep(bankaiStep);
    expect(bankaiHtml).toContain('data-act="bankai"');
    expect(bankaiHtml).toContain("Bankai (T)");

    // Passo de derrotar Hollow pendente
    const killStep = { id: "kill", text: "Derrote um Hollow: clique nele ou aperte Tab", done: false };
    const killHtml = renderTutorialStep(killStep);
    expect(killHtml).toContain("Atalho: Tab para mirar");
  });

  it("renderTutorialStep não exibe botões de ação quando o passo já está concluído", () => {
    const doneStep = { id: "auto", text: "Ligue o Auto Hunt (continua caçando com o jogo fechado)", done: true };
    const doneHtml = renderTutorialStep(doneStep);
    expect(doneHtml).toContain("done");
    expect(doneHtml).toContain("✔");
    expect(doneHtml).not.toContain("tut-act");
    expect(doneHtml).not.toContain('data-act="auto"');
  });

  it("tutorialAction mapeia a ação para o identificador correspondente", () => {
    expect(tutorialAction("auto")).toBe("auto");
    expect(tutorialAction("book")).toBe("book");
    expect(tutorialAction("travel")).toBe("travel");
    expect(tutorialAction("bankai")).toBe("bankai");
    expect(tutorialAction("unknown")).toBeNull();
  });

  it("dispatchTutorialAction encaminha para o handler específico e ignora desconhecidos", () => {
    const calls: string[] = [];
    const handlers = {
      auto: () => calls.push("auto"),
      book: () => calls.push("book"),
      travel: () => calls.push("travel"),
      bankai: () => calls.push("bankai"),
    };

    expect(dispatchTutorialAction("auto", handlers)).toBe(true);
    expect(dispatchTutorialAction("book", handlers)).toBe(true);
    expect(dispatchTutorialAction("travel", handlers)).toBe(true);
    expect(dispatchTutorialAction("bankai", handlers)).toBe(true);
    expect(dispatchTutorialAction("invalid", handlers)).toBe(false);

    expect(calls).toEqual(["auto", "book", "travel", "bankai"]);
  });
});
