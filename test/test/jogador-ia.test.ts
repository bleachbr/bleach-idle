import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync, existsSync, statSync, rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { Game, compressVideoToMp4 } from "../src/game.js";
import { prepareSource } from "../src/source.js";

function hasFfmpeg(): boolean {
  try {
    execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

test("Game configura baseUrl padrão para localhost e aceita targetUrl remoto", () => {
  const localGame = new Game("/tmp/mock-src", "/tmp/mock.sqlite");
  assert.equal(localGame.baseUrl, "http://localhost:5183");
  assert.equal(localGame.enableDev, false);
  assert.equal(localGame.compressVideo, true);
  assert.equal(localGame.targetUrl, "");

  const prodGame = new Game("/tmp/mock-src", "/tmp/mock.sqlite", "https://bleach.acoplum.com/");
  assert.equal(prodGame.baseUrl, "https://bleach.acoplum.com");
  assert.equal(prodGame.targetUrl, "https://bleach.acoplum.com/");
  assert.equal(prodGame.enableDev, false);
  assert.equal(prodGame.compressVideo, true);

  const devGame = new Game("/tmp/mock-src", "/tmp/mock.sqlite", "", true, false);
  assert.equal(devGame.enableDev, true);
  assert.equal(devGame.compressVideo, false);
});

test("prepareSource suporta targetUrl remoto sem exigir worktree local", () => {
  const src = prepareSource("/tmp/mock-runs", false, "https://bleach.acoplum.com");
  assert.equal(src.origem, "remoto (https://bleach.acoplum.com)");
  assert.ok(src.dir);
  assert.ok(src.sha);
});

test("Game startServers em modo remoto inicializa apenas o browser sem processos locais", async () => {
  const remoteGame = new Game("/tmp/mock-src", "/tmp/mock.sqlite", "https://bleach.acoplum.com");
  await remoteGame.startServers();
  assert.ok(remoteGame.browser, "browser deve ser iniciado");
  assert.equal((remoteGame as any).procs.length, 0, "nenhum processo local deve ser aberto");
  await remoteGame.stop();
});

test("compressVideoToMp4 comprime WebM para MP4 WhatsApp e apaga o original", (t) => {
  if (!hasFfmpeg()) {
    t.skip("ffmpeg não disponível no ambiente");
    return;
  }

  const tmp = mkdtempSync(join(tmpdir(), "bi-video-test-"));
  const rawDir = join(tmp, "video", "explorar");
  mkdirSync(rawDir, { recursive: true });
  const rawWebm = join(rawDir, "dummy.webm");
  const targetMp4 = join(tmp, "video", "explorar.mp4");

  try {
    // Cria um webm de 1s de teste via lavfi
    execFileSync("ffmpeg", ["-y", "-f", "lavfi", "-i", "color=c=black:s=320x240:d=1", "-c:v", "libvpx-vp9", rawWebm], { stdio: "ignore" });
    assert.ok(existsSync(rawWebm), "rawWebm deve existir");

    const ok = compressVideoToMp4(rawWebm, targetMp4);
    assert.equal(ok, true, "compressVideoToMp4 deve retornar true");
    assert.ok(existsSync(targetMp4), "targetMp4 deve existir");
    assert.ok(statSync(targetMp4).size > 0, "targetMp4 deve ter tamanho > 0");
    assert.equal(existsSync(rawWebm), false, "rawWebm original deve ter sido apagado");
    assert.equal(existsSync(rawDir), false, "pasta temporária explorar/ deve ter sido removida");
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
