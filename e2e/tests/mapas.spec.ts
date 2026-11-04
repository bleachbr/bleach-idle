import { test, expect } from "@playwright/test";
import { MAP_IDS } from "../../shared/src/map";
import { TRAVEL } from "../../shared/src/social";
import { readFileSync } from "node:fs";
import { newPlayer } from "./helpers";

test("carrega os sete atlases por URLs versionadas e captura Karakura", async ({ page }, info) => {
  // Simula a URL antiga indisponível: a primeira visita após uma atualização
  // precisa carregar os pixels novos, mesmo com um worker anterior no navegador.
  await page.route(/\/maps\/[^/?]+_tiles\.png$/, (route) => route.abort());
  await page.route(/\/maps\/scenes\/[^?]+\.webp$/, (route) => route.abort());
  const scenes = JSON.parse(readFileSync(new URL("../../client/src/worldSceneData.json", import.meta.url), "utf8"));
  const grounds = MAP_IDS.map((id) => page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname === scenes[id].ground && url.searchParams.has("v");
  }));
  const pending = MAP_IDS.map((id) => page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname === `/maps/${id}_tiles.png` && url.searchParams.has("v");
  }));
  await newPlayer(page);
  for (const response of await Promise.all(pending)) {
    expect(response.ok()).toBe(true);
    const png = await response.body();
    expect(png.readUInt32BE(16)).toBe(256);
    expect(png.readUInt32BE(20)).toBeGreaterThanOrEqual(320);
  }
  for (const response of await Promise.all(grounds)) expect(response.ok()).toBe(true);
  await expect(page.locator("#game canvas")).toBeVisible();
  // Evento de pintura, sem delay arbitrário.
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.screenshot({ path: info.outputPath("karakura-runtime.png") });
});

test("viaja pelos sete cenários e captura o personagem na câmera real", async ({ page }, info) => {
  test.skip(process.env.BI_MAP_PREVIEW !== "1", "Captura opt-in com Dev no servidor temporário: BI_MAP_PREVIEW=1");
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await newPlayer(page);
  await expect(page.locator("#game-loading")).toHaveClass(/ready/);
  await page.click("#dev-btn");
  await page.getByRole("button", { name: "Nível 150", exact: true }).click();
  await expect(page.locator("#plevel")).toContainText("150");
  await page.getByRole("button", { name: "+1.000.000 kan", exact: true }).click();
  await page.locator("#dev-body [data-a=god]").click();
  await expect(page.locator("#dev-body [data-a=god]")).toContainText("ligado");
  await page.click("#dev-close");
  // Confirmações privadas de viagem entram no canal de combate/log, não no Geral.
  await page.locator('#chat-tabs [data-tab="combate"]').click();
  for (const id of MAP_IDS) {
    if (id !== "karakura") {
      const destination = TRAVEL.find((d) => d.id === id)!;
      await page.click("#travel-btn");
      const row = page.locator("#modal .shop-row").filter({ hasText: destination.name });
      await expect(row.getByRole("button", { name: "Viajar", exact: true })).toBeEnabled();
      await row.getByRole("button", { name: "Viajar", exact: true }).click();
      await expect(page.locator("#chatlog")).toContainText(`Viajou para ${destination.name}`);
    }
    // O aviso de viagem pode chegar antes do patch de estado. Espere o mapa
    // efetivamente montado no cliente e a pintura do minimapa, sem sleep fixo.
    const map = JSON.parse(readFileSync(new URL(`../../client/public/maps/${id}.tmj`, import.meta.url), "utf8"));
    const mapName = map.properties.find((p: { name: string }) => p.name === "nome").value;
    await expect.poll(async () => (await page.locator("#minimap").getAttribute("title"))?.split(":")[0]).toBe(mapName);
    await expect.poll(() => page.locator("#minimap").evaluate((canvas: HTMLCanvasElement) => {
      const pixels = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height).data;
      return pixels.some((value, index) => index % 4 !== 3 && value > 30);
    })).toBe(true);
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await page.screenshot({ path: info.outputPath(`${id}-runtime.png`) });
  }
  expect(errors).toEqual([]);
});
