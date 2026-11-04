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
  // sem a revisão publicada o cabeçalho do relatório avisa que o changelog é o da main (#342)
  assert.equal(src.origem, "remoto (https://bleach.acoplum.com) (revisão publicada desconhecida)");
  assert.match(src.changelog, /não consegui descobrir a revisão publicada/);
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

// #342: com --prod o changelog vem da revisão publicada (GET /release), não da origin/main. Sem rede e sem relógio:
// um repositório git temporário com commits conhecidos e um fetch falso.
function repoComCommits(...msgs: string[]): { dir: string; shas: string[] } {
  const dir = mkdtempSync(join(tmpdir(), "bleach-ia-repo-"));
  const git = (...a: string[]) => execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", ...a], { cwd: dir, encoding: "utf8" }).trim();
  git("init", "-q", "-b", "main");
  const shas = msgs.map((m, i) => {
    writeFileSync(join(dir, "client.txt"), `${i}\n`);
    git("add", "."); git("commit", "-q", "-m", m);
    return git("rev-parse", "HEAD");
  });
  return { dir, shas };
}

test("parseRevision só aceita SHA completo vindo do /release", async () => {
  const { parseRevision } = await import("../src/source.js");
  const sha = "2432a43699876f3c273002644d337a3a7b8594a7";
  assert.equal(parseRevision({ revision: sha }), sha);
  assert.equal(parseRevision({ revision: sha.toUpperCase() }), sha);
  for (const ruim of [undefined, null, {}, { revision: "" }, { revision: "abc" }, { revision: "--upload-pack=x" }, { revision: 42 }, { revision: `${sha}0` }, "texto"])
    assert.equal(parseRevision(ruim), undefined, JSON.stringify(ruim));
});

test("fetchDeployedRevision lê a revisão publicada e devolve undefined se a rede ou o corpo falharem", async () => {
  const { fetchDeployedRevision } = await import("../src/source.js");
  const sha = "2432a43699876f3c273002644d337a3a7b8594a7";
  const ok = async (url: string) => { assert.equal(url, "https://x.test/release"); return new Response(JSON.stringify({ revision: sha, entries: [] })); };
  assert.equal(await fetchDeployedRevision("https://x.test/", ok), sha); // barra final não duplica
  assert.equal(await fetchDeployedRevision("https://x.test", async () => new Response("<html>", { status: 200 })), undefined);
  assert.equal(await fetchDeployedRevision("https://x.test", async () => new Response("{}", { status: 500 })), undefined);
  assert.equal(await fetchDeployedRevision("https://x.test", async () => { throw new Error("offline"); }), undefined);
});

test("changelogFor usa a revisão publicada e avisa quantos commits da main ainda não estão no ar", async () => {
  const { changelogFor } = await import("../src/source.js");
  const { dir, shas } = repoComCommits("feat: base", "fix: no ar", "feat: so na main A", "feat: so na main B");
  try {
    // produção em shas[1]; a main está em shas[3]; checkpoint anterior em shas[0]
    const c = changelogFor(dir, { previous: shas[0], head: shas[1], main: shas[3] });
    const [noAr, aviso] = c.split("AVISO");
    assert.match(noAr, /fix: no ar/);
    assert.doesNotMatch(noAr, /so na main A|so na main B/, "commit que a produção não tem não pode vir como novidade no ar");
    assert.match(aviso, /2 commits/);
    assert.match(aviso, /so na main A/); // o aviso diz o que ainda não está no ar, para o agente ignorar
    assert.match(aviso, /so na main B/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("changelogFor sem atraso não avisa, e checkpoint que não é ancestral cai nos últimos commits", async () => {
  const { changelogFor } = await import("../src/source.js");
  const { dir, shas } = repoComCommits("feat: base", "fix: um", "fix: dois");
  try {
    assert.doesNotMatch(changelogFor(dir, { previous: shas[0], head: shas[2], main: shas[2] }), /AVISO/);
    assert.match(changelogFor(dir, { previous: shas[2], head: shas[2], main: shas[2] }), /Sem mudanças/);
    // a produção voltou para uma revisão mais antiga que o checkpoint: nada de intervalo invertido
    const volta = changelogFor(dir, { previous: shas[2], head: shas[1], main: shas[2] });
    assert.match(volta, /não é ancestral|anterior à/i);
    assert.match(volta, /fix: um/);
    assert.match(volta, /AVISO/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("prepareSource com revisão publicada conhecida usa essa revisão e não a origin/main", async (t) => {
  const { prepareSource: prep } = await import("../src/source.js");
  const repo = new URL("../..", import.meta.url).pathname;
  let anterior: string;
  try { anterior = execFileSync("git", ["rev-parse", "origin/main~1"], { cwd: repo, encoding: "utf8" }).trim(); }
  catch { return t.skip("clone raso: sem origin/main~1"); }
  const src = prep(mkdtempSync(join(tmpdir(), "bleach-ia-runs-")), false, "https://bleach.acoplum.com", anterior);
  assert.equal(src.sha, anterior);
  assert.match(src.origem, /revisão publicada/);
  assert.doesNotMatch(src.origem, /desconhecida/);
  assert.match(src.changelog, /AVISO: o servidor testado está em/); // a main tem ao menos 1 commit a mais
});
