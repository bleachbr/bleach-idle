// O container roda o servidor a partir de /app (raiz do repositório), onde não há tsconfig.json.
// Sem o server/tsconfig.json, o tsx compila os campos de classe com useDefineForClassFields: true:
// eles escondem os acessores do defineTypes e o Colyseus manda o estado vazio, sem patches
// (produção em 01/11/2026: HUD vazio, sem personagem nem monstros). Este teste roda a sonda com o
// WORKDIR, o ENV e o CMD do estágio final do Dockerfile. Ele roda no checkout, não na imagem:
// não enxerga o que o .dockerignore ou o COPY deixam de fora, nem overrides do compose.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../../", import.meta.url));
const PROBE = "server/test/helpers/schemaProbe.ts";

/** WORKDIR, ENV e CMD do último estágio (depois do último FROM). */
function finalStage(dockerfile: string) {
  const lines = dockerfile.split(/\r?\n/);
  const stage = lines.slice(lines.map((l) => /^FROM\s/i.test(l)).lastIndexOf(true));
  const env: Record<string, string> = {};
  let workdir = "";
  let cmd: string[] = [];
  for (const line of stage) {
    const [, op, rest] = /^(\w+)\s+(.*)$/.exec(line.trim()) ?? [];
    if (op === "WORKDIR") workdir = rest;
    if (op === "ENV") for (const [, k, v] of rest.matchAll(/(\w+)=(\S+)/g)) env[k] = v;
    if (op === "CMD") cmd = JSON.parse(rest);
  }
  return { workdir, env, cmd };
}

describe("comando do container", () => {
  const stage = finalStage(readFileSync(new URL("../../Dockerfile", import.meta.url), "utf8"));

  it("roda da raiz do repositório com o tsx", () => {
    // a sonda abaixo usa a raiz como cwd: só vale enquanto o container rodar de /app
    expect(stage.workdir).toBe("/app");
    expect(stage.cmd.slice(0, 3)).toEqual(["node", "--import", "tsx"]);
    expect(stage.cmd[3]).toBe("server/src/index.ts");
  });

  it("registra os campos do estado sincronizado", () => {
    const env: NodeJS.ProcessEnv = { ...process.env };
    delete env.TSX_TSCONFIG_PATH; // só vale o que o Dockerfile define
    // caminho absoluto dentro da imagem (/app/...) aponta para o mesmo arquivo do checkout
    for (const [k, v] of Object.entries(stage.env))
      env[k] = v.startsWith(`${stage.workdir}/`) ? join(root, v.slice(stage.workdir.length + 1)) : v;
    const run = spawnSync(stage.cmd[0], [...stage.cmd.slice(1, -1), PROBE], { cwd: root, env, encoding: "utf8", timeout: 20_000 });
    expect(run.error).toBeUndefined();
    expect(run.status, run.stderr).toBe(0);
    expect(JSON.parse(run.stdout.trim())).toEqual({ encodedName: true });
  }, 30_000);
});
