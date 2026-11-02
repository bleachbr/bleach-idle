import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { Client } from "colyseus.js";
import { startTestServer, stopTestServer, once, quiet } from "./helpers/testServer";

// #23: o cliente desabilita o botão ao clicar e espera o "book" para redesenhar; na recusa
// ("já pegou hoje") o servidor só escrevia no chat e o botão ficava parado
describe("recompensa diária", () => {
  let url: string;
  beforeAll(async () => { url = (await startTestServer()).url; });
  afterAll(async () => { await stopTestServer(); });

  async function join(name: string) {
    const client = new Client(url);
    const lobby = quiet(await client.joinOrCreate("lobby", { action: "register", login: `daily_${Date.now().toString(36)}`, password: "password123" }));
    await once(lobby, "chars");
    lobby.send("create", { name, charId: "ichigo" });
    await once(lobby, "chars");
    lobby.send("play", { id: name.toLowerCase() });
    const { ticket } = await once<{ ticket: string }>(lobby, "ticket");
    await lobby.leave();
    return quiet(await client.join("world", { ticket }));
  }

  it("resgate e recusa respondem com o Livro atualizado", async () => {
    const world = await join("Diaria Ana");
    const first = once<any>(world, "book");
    world.send("daily");
    const got = await first;
    expect(got.daily.claimed).toBe(true);
    expect(got.daily.streak).toBe(1);

    // segundo clique no mesmo dia: recusado, mas o Livro volta para o cliente redesenhar
    const again = once<any>(world, "book");
    world.send("daily");
    expect((await again).daily.claimed).toBe(true);
    await world.leave();
  });
});
