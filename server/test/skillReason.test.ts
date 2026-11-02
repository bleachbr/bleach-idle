// #27: a técnica usada duas vezes seguidas diz no chat que está em recarga e quanto falta,
// em vez de "indisponível (recarga, reiatsu ou alcance)". Alvo: o boneco de treino da Soul Society,
// que fica parado e não morre; o personagem nasce ao lado dele, fora da zona de proteção.
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { Client } from "colyseus.js";
import * as db from "../src/db";
import { startTestServer, stopTestServer, once, quiet } from "./helpers/testServer";

const BONECO = { x: 38, y: 9 }; // spawn fixo (raio 0) em client/public/maps/soul.tmj

describe("E2E: motivo da técnica indisponível (#27)", () => {
  let url: string;

  beforeAll(async () => {
    url = (await startTestServer()).url;
  });

  afterAll(async () => {
    await stopTestServer();
  });

  it("a segunda técnica seguida avisa a recarga com o tempo que falta", async () => {
    const client = new Client(url);
    const tag = Date.now().toString(36);
    const lobby = quiet(await client.joinOrCreate("lobby", { action: "register", login: `skill_${tag}`, password: "password123" }));
    await once(lobby, "chars");
    const letters = Array.from({ length: 4 }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join("");
    const name = `Recarga ${letters}`; // nome só aceita letras
    lobby.send("create", { name, charId: "ichigo" });
    await once(lobby, "chars");
    const id = name.toLowerCase();
    const row = db.load(id)!;
    db.save(id, { ...row.data, map: "soul", x: BONECO.x, y: BONECO.y + 1 }, false);
    lobby.send("play", { id });
    const { ticket } = await once<{ ticket: string }>(lobby, "ticket");
    await lobby.leave();

    const world = quiet(await client.join("world", { ticket }));
    const logs: string[] = [];
    world.onMessage("log", (m: { text: string }) => logs.push(m.text));

    let bonecoId = "";
    await vi.waitFor(() => {
      for (const [mid, mo] of world.state.monsters.entries())
        if (mo.kind === "boneco" && mo.map === "soul" && mo.x === BONECO.x && mo.y === BONECO.y) bonecoId = mid;
      expect(bonecoId).not.toBe("");
    }, { timeout: 5000, interval: 25 });

    world.send("target", { id: bonecoId });
    await vi.waitFor(() => expect(world.state.players.get(id)?.targetId).toBe(bonecoId), { timeout: 5000, interval: 25 });

    // a primeira sai (gasta reiatsu); a segunda bate na recarga
    world.send("skill", { slot: 1 });
    world.send("skill", { slot: 1 });
    await vi.waitFor(() => expect(logs.some((t) => t.includes("em recarga (restam"))).toBe(true), { timeout: 5000, interval: 25 });
    expect(logs.some((t) => /recarga, reiatsu ou alcance/.test(t))).toBe(false);

    await world.leave();
  });
});
