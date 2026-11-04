// Evento narrado (R-12; PRD do M5-03 §3, fluxo 7). A invasão é global e põe Hollows na praça, então este
// arquivo roda por último (o nome começa com "zz", e o config usa um worker só, em ordem).
import { test, expect } from "@playwright/test";
import { Client } from "colyseus.js";
import { PORT } from "../port";
import { PASSWORD, newPlayer, suffix } from "./helpers";
import { readFileSync } from "node:fs";
import { parseMap, walkable } from "../../shared/src/map";
import { findPath } from "../../server/src/path";
import type { WorldState } from "../../server/src/schema";

/** Um segundo jogador, por colyseus.js, só para mandar as mensagens de depuração (o cliente do jogo não as envia). */
async function debugClient() {
  const c = new Client(`ws://localhost:${PORT}`);
  const login = `e2edbg${suffix()}`;
  const lobby = await c.joinOrCreate("lobby", { action: "register", login, password: PASSWORD });
  const next = <T>(type: string) => new Promise<T>((r) => lobby.onMessage(type, r));
  lobby.onMessage("*", () => {});
  let chars = next<{ id: string }[]>("chars");
  await chars;
  chars = next("chars");
  lobby.send("create", { name: `Depura ${suffix()}`, charId: "ichigo" });
  const [me] = await chars;
  const ticket = next<{ ticket: string }>("ticket");
  lobby.send("play", { id: me.id });
  const world = await c.join<WorldState>("world", { ticket: (await ticket).ticket });
  world.onMessage("*", () => {});
  await lobby.leave();
  return world;
}

test("Karakura contínua: percorre o cenário e mostra personagem com mobs reais", async ({ page }, info) => {
  const { name } = await newPlayer(page);
  const observer = await debugClient();
  try {
    const me = () => observer.state.players.get(name.toLowerCase())!;
    await expect.poll(() => !!me(), { timeout: 5000 }).toBe(true);
    const start = { x: me().x, y: me().y };
    const minimap = page.locator("#minimap");
    const box = (await minimap.boundingBox())!;
    await expect(page.locator("#game-loading")).toHaveClass(/ready/);
    await page.screenshot({ path: info.outputPath("karakura-personagem-praca.png") });
    const map = parseMap("karakura", JSON.parse(readFileSync(new URL("../../client/public/maps/karakura.tmj", import.meta.url), "utf8")));
    const threats = [...observer.state.monsters.values()] as { map: string; kind: string; x: number; y: number }[];
    const path = findPath(start.x, start.y, (x, y) => x === 31 && y === 2,
      (x, y) => !walkable(map, x, y) || threats.some((m) => m.map === "karakura" && m.kind !== "hollow_menor"
        && Math.max(Math.abs(m.x - x), Math.abs(m.y - y)) <= 7));
    expect(path.length).toBeGreaterThan(10);
    // Usa os pontos livres da matriz real, sem clicar em construções. Cliques
    // globais usam o mesmo retângulo que o handler, incluindo a borda do minimapa.
    const waypoints = path.filter((_, i) => i % 6 === 5 || i === path.length - 1);
    for (const { x, y } of waypoints) {
      await page.mouse.click(box.x + box.width * (x + .5) / map.w, box.y + box.height * (y + .5) / map.h);
      await expect.poll(() => Math.max(Math.abs(me().x - x), Math.abs(me().y - y)), { timeout: 5000 }).toBe(0);
    }
    expect(Math.max(Math.abs(me().x - start.x), Math.abs(me().y - start.y))).toBeGreaterThan(10);
    await expect.poll(() => {
      const monsters = [...observer.state.monsters.values()] as { map: string; x: number; y: number }[];
      return monsters.some((m) => m.map === "karakura" && Math.abs(m.x - me().x) <= 6 && Math.abs(m.y - me().y) <= 4);
    }, { timeout: 5000 }).toBe(true);
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    await page.screenshot({ path: info.outputPath("karakura-personagem-mobs.png") });
  } finally {
    await observer.leave();
  }
});

test("invasão de Hollows: banner no topo e lore no chat", async ({ page }) => {
  await newPlayer(page);
  const dbg = await debugClient();
  try {
    dbg.send("debugInvasion");
    const banner = page.locator("#event-banner");
    await expect(banner).toBeVisible();
    await expect(banner).toContainText("Invasão de Hollows");
    await expect(page.locator("#chatlog .lore").first()).toBeVisible();
  } finally {
    dbg.send("debugInvasionEnd");
    await dbg.leave();
  }
});
