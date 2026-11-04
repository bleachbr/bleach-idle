// Primeiro passo do onboarding: "Visite o Kisuke na praça". Jogador novo, só a interface (sem atalhos de Dev).
// Contexto: as issues #26, #126 e #127 foram fechadas por consertos de hitbox, e o playtest de 04/11 voltou a
// relatar a missão travada. Estes testes mostram o que um jogador novo consegue fazer de verdade.
import { test, expect } from "@playwright/test";
import { newPlayer } from "./helpers";

// O personagem nasce sempre no mesmo tile da praça e a câmera o centraliza; com a janela fixa em 1280x720
// (playwright.config.ts) o sprite do Kisuke aparece sempre neste ponto da tela (corpo do NPC, não o prédio).
const KISUKE = { x: 890, y: 140 };

const passoKisuke = (page: import("@playwright/test").Page) => page.locator("#tutorial-list .tut", { hasText: "Visite o Kisuke" });

test("clicar no sprite do Kisuke abre a loja e conclui o passo do tutorial", async ({ page }) => {
  await newPlayer(page);
  await expect(passoKisuke(page)).not.toHaveClass(/done/);
  await page.mouse.click(KISUKE.x, KISUKE.y);
  await expect(page.locator("#modal-title")).toHaveText("Loja do Kisuke");
  await expect(passoKisuke(page)).toHaveClass(/done/);
});

test("o botão 'Ir ao Kisuke' do tutorial leva à loja, não à janela de viagem", async ({ page }) => {
  await newPlayer(page);
  await passoKisuke(page).getByRole("button", { name: "Ir ao Kisuke" }).click();
  // se o botão só abrir a janela de Viagem, o jogador novo fica sem saber como chegar ao Kisuke
  await expect(page.locator("#modal-title")).toHaveText("Loja do Kisuke");
  await expect(passoKisuke(page)).toHaveClass(/done/);
});
