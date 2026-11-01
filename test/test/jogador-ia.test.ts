import { describe, it, expect } from "vitest";
import { Game } from "../src/game.js";
import { prepareSource } from "../src/source.js";

describe("Jogador-IA Config e Runners", () => {
  it("Game configura baseUrl padrão para localhost e aceita targetUrl remoto", () => {
    const localGame = new Game("/tmp/mock-src", "/tmp/mock.sqlite");
    expect(localGame.baseUrl).toBe("http://localhost:5183");
    expect(localGame.enableDev).toBe(false);
    expect(localGame.targetUrl).toBe("");

    const prodGame = new Game("/tmp/mock-src", "/tmp/mock.sqlite", "https://bleach.acoplum.com/");
    expect(prodGame.baseUrl).toBe("https://bleach.acoplum.com");
    expect(prodGame.targetUrl).toBe("https://bleach.acoplum.com/");
    expect(prodGame.enableDev).toBe(false);

    const devGame = new Game("/tmp/mock-src", "/tmp/mock.sqlite", "", true);
    expect(devGame.enableDev).toBe(true);
  });

  it("prepareSource suporta targetUrl remoto sem exigir worktree local", () => {
    const src = prepareSource("/tmp/mock-runs", false, "https://bleach.acoplum.com");
    expect(src.origem).toBe("remoto (https://bleach.acoplum.com)");
    expect(src.dir).toBeDefined();
    expect(src.sha).toBeDefined();
  });

  it("Game startServers em modo remoto inicializa apenas o browser sem processos locais", async () => {
    const remoteGame = new Game("/tmp/mock-src", "/tmp/mock.sqlite", "https://bleach.acoplum.com");
    await remoteGame.startServers();
    expect(remoteGame.browser).toBeDefined();
    expect((remoteGame as any).procs.length).toBe(0);
    await remoteGame.stop();
  });
});
