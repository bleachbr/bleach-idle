// Auditoria de Qualidade e Progressão da Jornada do Herói (Agente GROK)
// Validação E2E automatizada da progressão canônica: Recruta -> Karakura 2.5D -> Trava Lv 30 -> Seireitei Shikai -> Hueco Mundo
import { test, expect, type Page } from "@playwright/test";
import { PASSWORD, register, suffix } from "./helpers";
import { expForLevel } from "../../shared/src/formulas";
import { TRAVEL } from "../../shared/src/social";

/** Monitora erros de página e console durante a execução. */
function attachErrorMonitor(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(`[PageError] ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      errors.push(`[ConsoleError] ${msg.text()}`);
    }
  });
  return errors;
}

test.describe("Jornada do Herói: Da Criação do Recruta ao Hueco Mundo", () => {
  test("1. Criação de personagem restrita estritamente a Recruta (M) e Recruta (F)", async ({ page }) => {
    const consoleErrors = attachErrorMonitor(page);
    await register(page);

    // Valida que o container de arquétipos existe e contém estritamente as 2 opções canônicas de recruta
    const charButtons = page.locator("#chars button.char");
    await expect(charButtons).toHaveCount(2);

    const firstChar = charButtons.nth(0);
    const secondChar = charButtons.nth(1);

    await expect(firstChar).toContainText("Recruta (M)");
    await expect(secondChar).toContainText("Recruta (F)");

    // Confirma que Recruta (M) inicia selecionado por padrão
    await expect(firstChar).toHaveAttribute("aria-pressed", "true");
    await expect(secondChar).toHaveAttribute("aria-pressed", "false");

    // Seleciona Recruta (F) e confere alternância visual e acessibilidade
    await secondChar.click();
    await expect(firstChar).toHaveAttribute("aria-pressed", "false");
    await expect(secondChar).toHaveAttribute("aria-pressed", "true");

    // Cria a recruta feminina
    const heroName = `Heroina ${suffix()}`;
    await page.fill("#new-name", heroName);
    await page.click("#create-form button[type=submit]");

    // Confirma persistência e exibição na lista de personagens
    const row = page.locator("#char-list .char-row", { hasText: heroName });
    await expect(row).toBeVisible();
    await expect(row.locator("small")).toContainText("Recruta (F)");

    expect(consoleErrors).toEqual([]);
  });

  test("2. Jornada Completa: Entrada 2.5D, Trava Canônica de XP Lv 30, Seireitei e Despertar de Shikai, e Hueco Mundo", async ({ page }, info) => {
    const consoleErrors = attachErrorMonitor(page);

    // --- Passo 1: Cadastro e criação de Recruta (M) ---
    await register(page);
    const recruitButtons = page.locator("#chars button.char");
    await expect(recruitButtons).toHaveCount(2);
    await recruitButtons.nth(0).click(); // Recruta (M)
    await expect(recruitButtons.nth(0)).toHaveAttribute("aria-pressed", "true");

    const heroName = `Shinigami ${suffix()}`;
    await page.fill("#new-name", heroName);
    await page.click("#create-form button[type=submit]");
    const recruitRow = page.locator("#char-list .char-row", { hasText: heroName });
    await expect(recruitRow).toBeVisible();

    // --- Passo 2: Entrada no mundo em Karakura no novo visual 2.5D ---
    await recruitRow.getByRole("button", { name: "Jogar" }).click();
    await expect(page.locator("#app")).toBeVisible();
    await expect(page.locator("#chatlog")).toContainText(`${heroName} entrou no mundo`);

    // Loader do jogo alcança estado .ready
    await expect(page.locator("#game-loading")).toHaveClass(/ready/);

    // Minimapa indica Karakura
    const minimap = page.locator("#minimap");
    await expect(minimap).toHaveAttribute("title", /^Karakura/);

    // Canvas WebGL do jogo ativo e renderizando
    const canvas = page.locator("#game canvas");
    await expect(canvas).toBeVisible();
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(400);
    expect(box!.height).toBeGreaterThan(300);

    // Aguarda frames de pintura para confirmar estabilidade do renderizador
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));

    // Captura evidência visual de Karakura 2.5D
    await page.screenshot({ path: info.outputPath("01-karakura-25d-recruta.png") });

    // Ficha inicial do recruta: confirma Patente militar "Recruta"
    await page.click("#sheet-btn");
    await expect(page.locator("#sheet-dialog")).toBeVisible();
    const sheetBody = page.locator("#sheet-body");
    await expect(sheetBody).toContainText("Título Militar");
    await expect(sheetBody).toContainText("Recruta");
    await page.click("#sheet-close");
    await expect(page.locator("#sheet-dialog")).not.toBeVisible();

    // --- Passo 3: Progressão até o Lv 30 e Trava Canônica de XP com Convocação do Seireitei ---
    // Financiamento para viagens e simulação da evolução até nível 30
    await page.evaluate(() => {
      const room = (window as any).__bi?.room;
      room?.send("debugGold", { gold: 50000 });
      room?.send("debugSetLevel", { level: 30 });
    });

    // O nível deve ser exatamente 30
    await expect(page.locator("#plevel")).toContainText("nível 30");

    // A barra de XP do HUD deve exibir a trava canônica solene
    const expBar = page.locator(".bar.exp span");
    await expect(expBar).toHaveText("[BLOQUEADO: CONVOCAÇÃO DO SEIREITEI]");

    // Na ficha do personagem, o Nível deve refletir o bloqueio
    await page.click("#sheet-btn");
    await expect(page.locator("#sheet-dialog")).toBeVisible();
    await expect(sheetBody).toContainText("[BLOQUEADO: CONVOCAÇÃO DO SEIREITEI]");
    await page.click("#sheet-close");

    // No log de combate, deve constar o alerta solene de convocação para o Seireitei
    await page.locator('#chat-tabs [data-tab="combate"]').click();
    await expect(page.locator("#chatlog")).toContainText("Convocação do Seireitei: Apresente-se no Senkaimon!");

    // Tentativa de ganho de XP adicional enquanto bloqueado não deve ultrapassar o Lv 30 nem o expForLevel(30)
    await page.evaluate((expVal) => {
      const room = (window as any).__bi?.room;
      room?.send("debugGainExp", { exp: 5000 });
    }, expForLevel(30));

    await expect(page.locator("#plevel")).toContainText("nível 30");
    await expect(expBar).toHaveText("[BLOQUEADO: CONVOCAÇÃO DO SEIREITEI]");

    // Captura evidência visual da trava de XP
    await page.screenshot({ path: info.outputPath("02-trava-xp-seireitei-lv30.png") });

    // --- Passo 4: Viagem dimensional ao Seireitei (Soul Society) ---
    await page.click("#travel-btn");
    await expect(page.locator("#modal")).toBeVisible();
    const soulDest = TRAVEL.find((t) => t.id === "soul")!;
    const soulRow = page.locator("#modal .shop-row").filter({ hasText: soulDest.name });
    await expect(soulRow.getByRole("button", { name: "Viajar", exact: true })).toBeEnabled();
    await soulRow.getByRole("button", { name: "Viajar", exact: true }).click();

    // Confirma chegada ao Seireitei
    await expect(page.locator("#chatlog")).toContainText(`Viajou para ${soulDest.name}`);
    await expect.poll(async () => (await minimap.getAttribute("title"))?.split(":")[0]).toBe("Soul Society");

    // Captura evidência visual no Seireitei
    await page.screenshot({ path: info.outputPath("03-seireitei-chegada.png") });

    // --- Passo 5: Promoção Militar, Despertar da Shikai e Frase de Liberação ---
    // Executa a promoção militar no Seireitei
    await page.evaluate(() => {
      const room = (window as any).__bi?.room;
      room?.send("promoteToOfficer");
    });

    // Canal Geral exibe a transmissão cósmica com frase de liberação da Shikai
    await page.locator('#chat-tabs [data-tab="geral"]').click();
    await expect(page.locator("#chatlog")).toContainText(`${heroName} despertou sua Shikai:`);

    // Canal de combate/sistema confirma desbloqueio da técnica no slot 4
    await page.locator('#chat-tabs [data-tab="combate"]').click();
    await expect(page.locator("#chatlog")).toContainText("Sua nova técnica está disponível na tecla 4.");

    // A barra de XP do HUD agora está livre do bloqueio
    await expect(expBar).not.toHaveText("[BLOQUEADO: CONVOCAÇÃO DO SEIREITEI]");

    // Ficha do personagem: agora Oficial do Gotei 13 com Zanpakutō despertada
    await page.click("#sheet-btn");
    await expect(page.locator("#sheet-dialog")).toBeVisible();
    await expect(sheetBody).toContainText("Oficial");
    await expect(sheetBody).toContainText("Status da Bankai");
    await expect(sheetBody).toContainText("Adormecida");
    await expect(sheetBody).not.toContainText("[BLOQUEADO: CONVOCAÇÃO DO SEIREITEI]");
    await page.click("#sheet-close");

    // Captura evidência visual do despertar no Seireitei
    await page.screenshot({ path: info.outputPath("04-shikai-despertada-oficial.png") });

    // --- Passo 6: Liberação do Level Cap e Progressão para o Nível 31+ ---
    await page.evaluate(() => {
      const room = (window as any).__bi?.room;
      room?.send("debugGainExp", { exp: 60000 });
    });

    // Confirma avanço de nível além do 30
    await expect.poll(async () => {
      const txt = await page.locator("#plevel").textContent();
      const match = txt?.match(/nível (\d+)/);
      return match ? Number(match[1]) : 0;
    }).toBeGreaterThanOrEqual(31);

    // --- Passo 7: Jornada dimensional para o Hueco Mundo ---
    await page.click("#travel-btn");
    await expect(page.locator("#modal")).toBeVisible();
    const huecoDest = TRAVEL.find((t) => t.id === "hueco")!;
    const huecoRow = page.locator("#modal .shop-row").filter({ hasText: huecoDest.name });
    await expect(huecoRow.getByRole("button", { name: "Viajar", exact: true })).toBeEnabled();
    await huecoRow.getByRole("button", { name: "Viajar", exact: true }).click();

    // Confirma chegada ao Hueco Mundo
    await expect(page.locator("#chatlog")).toContainText(`Viajou para ${huecoDest.name}`);
    await expect.poll(async () => (await minimap.getAttribute("title"))?.split(":")[0]).toBe("Hueco Mundo");

    // Aguarda renderização contínua do terreno do Hueco Mundo
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));

    // Captura evidência visual no Hueco Mundo
    await page.screenshot({ path: info.outputPath("05-hueco-mundo-conquistado.png") });

    // Zero erros de execução ou console tolerados
    expect(consoleErrors).toEqual([]);
  });
});
