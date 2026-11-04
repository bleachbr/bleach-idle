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

/** SHA completo (40 hex) ou nada: o valor vem de um servidor remoto e vai parar numa linha de comando do git. */
export function parseRevision(body: unknown): string | undefined {
  const r = (body as { revision?: unknown } | null)?.revision;
  return typeof r === "string" && /^[0-9a-f]{40}$/i.test(r) ? r.toLowerCase() : undefined;
}

/** Revisão que o servidor remoto está rodando (GET /release, a mesma que o jogo mostra em "Novidades"). `undefined`
 * se a rede, o status ou o corpo não servirem: quem chama decide o plano B, e o relatório avisa. */
export async function fetchDeployedRevision(baseUrl: string, doFetch: (url: string) => Promise<Response> = (u) => fetch(u, { signal: AbortSignal.timeout(10_000) })): Promise<string | undefined> {
  try {
    const res = await doFetch(`${baseUrl.replace(/\/+$/, "")}/release`);
    return res.ok ? parseRevision(await res.json()) : undefined;
  } catch { return undefined; }
}

const isAncestor = (repo: string, a: string, b: string) => { try { git(repo, "merge-base", "--is-ancestor", a, b); return true; } catch { return false; } };
const knownCommit = (repo: string, sha: string) => { try { git(repo, "cat-file", "-e", `${sha}^{commit}`); return true; } catch { return false; } };

/** O que mudou até `head` (o código que está sendo testado) desde o checkpoint. `main` é a ponta da origin/main: quando
 * `head` está atrás dela (produção sem o último deploy), o texto avisa quantos commits ainda NÃO estão no ar, para o
 * agente não relatar como bug um recurso que o servidor testado ainda não tem (#342). */
export function changelogFor(repo: string, { previous, head, main }: { previous?: string; head: string; main: string }): string {
  let log: string;
  if (previous && previous === head) log = "Sem mudanças no código testado desde o último checkpoint.";
  else if (previous && isAncestor(repo, previous, head)) {
    log = `Commits novos desde o último checkpoint (${previous.slice(0, 7)} → ${head.slice(0, 7)}):\n`
      + git(repo, "log", "--no-merges", "--format=- %h %s", `${previous}..${head}`).slice(0, 3500)
      + "\n\nArquivos alterados:\n" + git(repo, "diff", "--stat", "--stat-width=90", previous, head, "--", "client", "server", "shared").split("\n").slice(-30).join("\n");
  } else if (previous) {
    log = `O checkpoint anterior (${previous.slice(0, 7)}) não é ancestral de ${head.slice(0, 7)} (a revisão testada voltou ou é de outra linha). Últimos commits até ${head.slice(0, 7)}:\n`
      + git(repo, "log", "--no-merges", "-n", "15", "--format=- %h %s", head);
  } else log = "Primeira sessão (sem checkpoint). Últimos commits do código testado:\n" + git(repo, "log", "--no-merges", "-n", "15", "--format=- %h %s", head);

  if (head === main || !isAncestor(repo, head, main)) return log;
  const atraso = Number(git(repo, "rev-list", "--count", `${head}..${main}`));
  const faltam = git(repo, "log", "--no-merges", "-n", "10", "--format=- %h %s", `${head}..${main}`);
  return `${log}\n\nAVISO: o servidor testado está em ${head.slice(0, 7)}, ${atraso} commit${atraso === 1 ? "" : "s"} atrás da main (${main.slice(0, 7)}). `
    + `O que está abaixo AINDA NÃO ESTÁ NO AR: não relate como bug a ausência disso.\n${faltam}`;
}

/** `deployedRevision`: com `targetUrl`, a revisão que o servidor remoto publicou (`fetchDeployedRevision`). Se faltar ou não
 * existir no clone local, o changelog cai na origin/main e o texto diz que não dá para garantir que o que está lá já foi ao ar. */
export function prepareSource(runsDir: string, local: boolean, targetUrl = "", deployedRevision?: string): Source {
  let origem = targetUrl ? `remoto (${targetUrl})` : "origin/main";
  try { git(REPO, "fetch", "origin", "main", "--quiet"); }
  catch { origem = targetUrl ? `remoto (${targetUrl})` : "origin/main (fetch falhou: usando a última versão já baixada)"; console.log("aviso: git fetch falhou; usando origin/main local"); }
  const sha = git(REPO, "rev-parse", "origin/main");
  const cpFile = join(runsDir, "checkpoint.json");
  const previous: string | undefined = existsSync(cpFile) ? JSON.parse(readFileSync(cpFile, "utf8")).sha : undefined;

  const publicada = targetUrl && deployedRevision && knownCommit(REPO, deployedRevision) ? deployedRevision : undefined;
  const head = publicada ?? sha;
  let changelog = changelogFor(REPO, { previous, head, main: sha });
  if (targetUrl && !publicada) {
    changelog += `\n\nAVISO: não consegui descobrir a revisão publicada em ${targetUrl} (${deployedRevision ? "ela não existe no clone local; rode git fetch" : "GET /release falhou"}). `
      + "O changelog acima é o da main e pode listar recursos que o servidor testado ainda não tem: não relate a ausência deles como bug.";
    origem += " (revisão publicada desconhecida)";
  } else if (publicada) origem = `remoto (${targetUrl}) na revisão publicada`;

  if (targetUrl) return { dir: REPO, sha: head, previous, changelog, origem };
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
