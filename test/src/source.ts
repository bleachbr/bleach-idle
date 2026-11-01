// Prepara o código do jogo a testar: busca a main (git fetch, só leitura na árvore de trabalho),
// monta um checkout isolado dela e calcula o que mudou desde o último checkpoint.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

export const REPO = fileURLToPath(new URL("../..", import.meta.url));
const git = (cwd: string, ...args: string[]) => execFileSync("git", args, { cwd, encoding: "utf8", timeout: 60_000, maxBuffer: 8e6 }).trim();

export type Source = { dir: string; sha: string; previous?: string; changelog: string; origem: string };

export function prepareSource(runsDir: string, local: boolean, targetUrl = ""): Source {
  let origem = targetUrl ? `remoto (${targetUrl})` : "origin/main";
  try { git(REPO, "fetch", "origin", "main", "--quiet"); }
  catch { origem = targetUrl ? `remoto (${targetUrl})` : "origin/main (fetch falhou: usando a última versão já baixada)"; console.log("aviso: git fetch falhou; usando origin/main local"); }
  const sha = git(REPO, "rev-parse", "origin/main");
  const cpFile = join(runsDir, "checkpoint.json");
  const previous: string | undefined = existsSync(cpFile) ? JSON.parse(readFileSync(cpFile, "utf8")).sha : undefined;

  let changelog: string;
  if (previous && previous === sha) changelog = "Sem mudanças na main desde o último checkpoint.";
  else if (previous) {
    changelog = `Commits novos desde o último checkpoint (${previous.slice(0, 7)} → ${sha.slice(0, 7)}):\n`
      + git(REPO, "log", "--no-merges", "--format=- %h %s", `${previous}..${sha}`).slice(0, 3500)
      + "\n\nArquivos alterados:\n" + git(REPO, "diff", "--stat", "--stat-width=90", previous, sha, "--", "client", "server", "shared").split("\n").slice(-30).join("\n");
  } else {
    changelog = "Primeira sessão (sem checkpoint). Últimos commits da main:\n" + git(REPO, "log", "--no-merges", "-n", "15", "--format=- %h %s", sha);
  }

  if (targetUrl) return { dir: REPO, sha, previous, changelog, origem };
  if (local) return { dir: REPO, sha, previous, changelog, origem: "árvore local (--local)" };

  // checkout isolado da main (git worktree) em tmpdir para não entrar no glob do Vitest da raiz
  const dir = join(tmpdir(), "bleach-ia-main");
  if (existsSync(join(dir, ".git"))) git(dir, "checkout", "--detach", "--force", sha);
  else git(REPO, "worktree", "add", "--detach", dir, sha);
  if (!existsSync(join(dir, "node_modules"))) symlinkSync(join(REPO, "node_modules"), join(dir, "node_modules"));
  return { dir, sha, previous, changelog, origem };
}

export function saveCheckpoint(runsDir: string, sha: string) {
  writeFileSync(join(runsDir, "checkpoint.json"), JSON.stringify({ sha, em: new Date().toISOString() }));
}
