// Evento narrado (R-12; PRD do M5-03 §3, fluxo 7). A invasão é global e põe Hollows na praça, então este
// arquivo roda por último (o nome começa com "zz", e o config usa um worker só, em ordem).
import { test, expect } from "@playwright/test";
import { Client } from "colyseus.js";
import { PORT } from "../port";
import { PASSWORD, newPlayer, suffix } from "./helpers";

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
  const world = await c.join("world", { ticket: (await ticket).ticket });
  world.onMessage("*", () => {});
  await lobby.leave();
  return world;
}

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
