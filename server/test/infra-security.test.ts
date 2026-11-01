import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const rootFile = (rel: string) => readFileSync(fileURLToPath(new URL(`../../${rel}`, import.meta.url)), "utf8");

describe("Dockerfile não-root e permissão de /data (F-05)", () => {
  it("estágio final cria /data com dono node:node antes de VOLUME /data e define USER node", () => {
    const dockerfile = rootFile("Dockerfile");
    const stages = dockerfile.split(/^FROM\s+/m).filter(Boolean);
    expect(stages.length).toBeGreaterThanOrEqual(2);

    const runtimeStage = stages[stages.length - 1];
    const chownIdx = runtimeStage.search(/chown\s+-R\s+node:node\s+.*\/data/);
    const volumeIdx = runtimeStage.search(/^VOLUME\s+\/data/m);
    const userNodeIdx = runtimeStage.search(/^USER\s+node\b/m);
    const cmdIdx = runtimeStage.search(/^CMD\s+/m);

    // O diretório /data precisa pertencer a node:node ANTES de VOLUME /data para que volumes novos herdem a permissão
    expect(chownIdx, "falta chown -R node:node /data no estágio final").toBeGreaterThan(-1);
    expect(volumeIdx, "falta VOLUME /data").toBeGreaterThan(chownIdx);
    expect(userNodeIdx, "falta diretiva USER node no estágio final").toBeGreaterThan(-1);
    expect(cmdIdx, "USER node deve vir antes do CMD").toBeGreaterThan(userNodeIdx);
  });
});
