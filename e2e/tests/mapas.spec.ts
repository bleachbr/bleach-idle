import { test, expect } from "@playwright/test";
import { MAP_IDS } from "../../shared/src/map";
import { newPlayer } from "./helpers";

test("carrega os sete atlases por URLs versionadas e captura Karakura", async ({ page }, info) => {
  // Simula a URL antiga indisponível: a primeira visita após uma atualização
  // precisa carregar os pixels novos, mesmo com um worker anterior no navegador.
  await page.route(/\/maps\/[^/?]+_tiles\.png$/, (route) => route.abort());
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
  await expect(page.locator("#game canvas")).toBeVisible();
  // Evento de pintura, sem delay arbitrário.
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
  await page.screenshot({ path: info.outputPath("karakura-runtime.png") });
});
