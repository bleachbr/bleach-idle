// Primeiro passo do onboarding: "Visite o Kisuke na praça". Jogador novo, só a interface (sem atalhos de Dev).
// Contexto: as issues #26, #126 e #127 foram fechadas por consertos de hitbox, e o playtest de 04/11 voltou a
// relatar a missão travada. Estes testes mostram o que um jogador novo consegue fazer de verdade.
import { test, expect } from "@playwright/test";
import { newPlayer } from "./helpers";

// O personagem nasce sempre no mesmo tile da praça e a câmera o centraliza; com a janela fixa em 1280x720
// (playwright.config.ts) o sprite do Kisuke aparece sempre neste ponto da tela. É o tronco do NPC, um tile acima
// do tile da loja (18, 12): só o retângulo do desenho (interactAt) aceita esse clique, então o teste cobre a
// hitbox do #330 e não apenas o tile (estimativa a partir de screenshot; se a câmera ou o spawn mudarem, ajuste).
const KISUKE = { x: 890, y: 115 };

const passoKisuke = (page: import("@playwright/test").Page) => page.locator("#tutorial-list .tut", { hasText: "Visite o Kisuke" });

test("clicar no sprite do Kisuke abre a loja e conclui o passo do tutorial", async ({ page }) => {
  await newPlayer(page);
  // "entrou no mundo" vem do servidor; o clique só vale depois que a cena do Phaser registrou o pointerdown, e
  // GameScene.create() acende .ready no loader logo depois disso (no CI o clique chegava antes e caía no vazio)
  await expect(page.locator("#game-loading")).toHaveClass(/ready/);
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
