// Ajuda dos testes no navegador: nomes únicos e os passos de cadastro, criação e entrada no mundo.
import { expect, type Page } from "@playwright/test";

/** 6 letras aleatórias: o nome do personagem só aceita letras e espaço, e cabe nos 16 caracteres do formulário. */
export const suffix = () => Array.from({ length: 6 }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join("");

export const PASSWORD = "senha-e2e-123";

/** Cria conta pelo formulário e espera o lobby. */
export async function register(page: Page, login = `e2e${suffix()}`) {
  await page.goto("/");
  await page.fill("#login-name", login);
  await page.fill("#login-pass", PASSWORD);
  await page.click('#auth-form button[value="register"]');
  await expect(page.locator("#lobby")).toBeVisible();
  return login;
}

/** Cria um personagem no lobby e espera ele aparecer na lista. */
export async function createChar(page: Page, name = `Teste ${suffix()}`) {
  await page.fill("#new-name", name);
  await page.locator("#chars button.char").first().click();
  await page.click("#create-form button[type=submit]");
  await expect(page.locator("#char-list .char-row", { hasText: name })).toBeVisible();
  return name;
}

/** "Jogar" no personagem e espera o mundo carregar (o chat avisa a entrada). */
export async function enterWorld(page: Page, name: string) {
  await page.locator("#char-list .char-row", { hasText: name }).getByRole("button", { name: "Jogar" }).click();
  await expect(page.locator("#app")).toBeVisible();
  await expect(page.locator("#chatlog")).toContainText(`${name} entrou no mundo`);
}

/** Conta nova com um personagem já no mundo. */
export async function newPlayer(page: Page) {
  const login = await register(page);
  const name = await createChar(page);
  await enterWorld(page, name);
  return { login, name };
}
