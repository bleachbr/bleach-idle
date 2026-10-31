import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const rootFile = (rel: string) => readFileSync(fileURLToPath(new URL(`../../${rel}`, import.meta.url)), "utf8");

describe("Workflow de CI endurecido (F-11: Q5, Q8, Q9, Q10)", () => {
  it("fixa ubuntu-24.04 (sem ubuntu-latest), actions v7 por SHA, matriz Node 22/24 e job gitleaks verificado por SHA-256", () => {
    const ci = rootFile(".github/workflows/ci.yml");

    // Q9: ubuntu-24.04 fixo, sem ubuntu-latest
    expect(ci).not.toMatch(/runs-on:\s*ubuntu-latest/);
    expect(ci).toMatch(/runs-on:\s*ubuntu-24\.04/);

    // Q5: actions/checkout v7.0.1 e actions/setup-node v7.1.0 fixados por SHA completo de 40 hex
    expect(ci).toContain("actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1");
    expect(ci).toContain("actions/setup-node@949feb2413d6458794dcd2491c4babbbce0c15c1");
    expect(ci).not.toContain("11d5960a326750d5838078e36cf38b85af677262");
    expect(ci).not.toContain("49933ea5288caeca8642d1e84afbd3f7d6820020");

    // Q10: matriz com Node 22.x e 24.x
    expect(ci).toMatch(/node-version:\s*\[["']?22\.x["']?,\s*["']?24\.x["']?\]/);
    expect(ci).toContain("${{ matrix.node-version }}");

    // Q8: job de gitleaks com fetch-depth: 0, binário fixado v8.30.1 verificado por sha256sum e .gitleaks.toml
    expect(ci).toMatch(/^\s+gitleaks:/m);
    expect(ci).toMatch(/fetch-depth:\s*0/);
    expect(ci).toContain("551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb");
    expect(ci).toContain("sha256sum -c");
    expect(ci).toContain("gitleaks git --redact -c .gitleaks.toml .");
  });
});
