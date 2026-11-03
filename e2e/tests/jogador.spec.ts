// Caminho principal do jogador (PRD do M5-03 §3, fluxos 1 a 6). Cada teste cria a própria conta.
import { test, expect } from "@playwright/test";
import { PASSWORD, createChar, enterWorld, newPlayer, register, suffix } from "./helpers";

test("cadastro, senha errada e login", async ({ page }) => {
  const login = await register(page);
  await page.click("#logout-btn");
  await expect(page.locator("#login")).toBeVisible();

  await page.fill("#login-name", login);
  await page.fill("#login-pass", "senha-errada-1");
  await page.click('#auth-form button[value="login"]');
  await expect(page.locator("#auth-error")).toHaveText("Login ou senha incorretos.");

  await page.fill("#login-pass", PASSWORD);
  await page.click('#auth-form button[value="login"]');
  await expect(page.locator("#lobby")).toBeVisible();
  await expect(page.locator("#acc-login")).toHaveText(login);
});

test("criar personagem (escolhendo outro que não o padrão) e entrar no mundo", async ({ page }) => {
  await register(page);
  const name = await createChar(page, `Novo ${suffix()}`, 1);
  await enterWorld(page, name);
  await expect(page.locator("#game canvas")).toBeVisible();
});

test("HUD mostra nome, as 4 técnicas e o kit inicial", async ({ page }) => {
  const { name } = await newPlayer(page);
  await expect(page.locator("#pname")).toHaveText(name);
  await expect(page.locator("#techs kbd")).toHaveCount(4);
  await expect(page.locator("#inv .slot .icon").first()).toBeVisible();
});

test("chat: Enter manda a fala, que aparece no chat", async ({ page }) => {
  await newPlayer(page);
  const text = `ola ${suffix()}`;
  await page.keyboard.press("Enter"); // foca a caixa do chat
  await expect(page.locator("#chatin")).toBeFocused();
  await page.keyboard.type(text);
  await page.keyboard.press("Enter");
  await expect(page.locator("#chatlog")).toContainText(text);
});

test("trocar de personagem e, com Lembrar, recarregar pula o login", async ({ page }) => {
  // o Playwright recusa diálogos por padrão; "Trocar de personagem?" precisa ser aceito
  page.on("dialog", (d) => d.accept());
  const { name } = await newPlayer(page);
  await expect(page.locator("#remember")).toBeChecked(); // "Lembrar neste navegador" vem marcado no cadastro
  await page.click("#exit-btn");
  await expect(page.locator("#lobby")).toBeVisible();
  await expect(page.locator("#char-list .char-row", { hasText: name })).toBeVisible();
  await page.reload();
  await expect(page.locator("#lobby")).toBeVisible();
  await expect(page.locator("#login")).toBeHidden();
});

test("entrar no mundo com personagem existente exibe loading e inicializa canvas", async ({ page }) => {
  page.on("dialog", (d) => d.accept());
  const { name } = await newPlayer(page);
  // Sai para o lobby para simular retorno com personagem existente
  await page.click("#exit-btn");
  await expect(page.locator("#lobby")).toBeVisible();
  const row = page.locator("#char-list .char-row", { hasText: name });
  await expect(row).toBeVisible();

  // Clica em Jogar com personagem existente
  await row.getByRole("button", { name: "Jogar" }).click();
  await expect(page.locator("#app")).toBeVisible();

  // Aguarda o carregamento concluir com a classe ready e o canvas ficar pronto
  const loader = page.locator("#game-loading");
  await expect(loader).toHaveClass(/ready/, { timeout: 10_000 });
  const canvas = page.locator("#game canvas");
  await expect(canvas).toBeVisible();

  // Verifica que o canvas tem dimensões renderizadas válidas
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThan(100);
  expect(box!.height).toBeGreaterThan(100);

  // Confirma que o mundo entrou e o canvas tem dimensões válidas
  await expect(page.locator("#chatlog")).toContainText(`${name} entrou no mundo`);
  const shot = await canvas.screenshot();
  expect(shot.length).toBeGreaterThan(1000);
});
