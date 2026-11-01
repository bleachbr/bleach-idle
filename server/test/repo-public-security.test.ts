import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const root = new URL("../../", import.meta.url);
const sensitive = [
  "/.github/", "/.coderabbit.yaml", "/AGENTS.md", "/server/", "/client/src/",
  "/shared/src/", "/deploy/", "/Dockerfile", "/docker-compose*.yml",
  "**/package.json", "**/package-lock.json", "/.gitleaks.toml", "/.gitignore", "/.dockerignore",
  "/vitest.config.*", "**/tsconfig*.json", "/Makefile", "/.gitattributes",
  "/CLAUDE.md", "/.claude/", "/.kiro/", "/.devin/",
];

describe("proteção do repositório público", () => {
  it("arquivos sensíveis identificam os responsáveis pelo código", () => {
    const owners = new Map(readFileSync(new URL(".github/CODEOWNERS", root), "utf8")
      .trim().split("\n").map((line) => {
        const [path, ...users] = line.trim().split(/\s+/);
        return [path, users];
      }));
    for (const path of sensitive) {
      expect(owners.get(path)).toEqual(["@rafael2267", "@waldirjunior"]);
    }
  });

  it("variantes de ambiente não entram no Git nem no contexto Docker", () => {
    const gitignore = readFileSync(new URL(".gitignore", root), "utf8").split("\n");
    const dockerignore = readFileSync(new URL(".dockerignore", root), "utf8").split("\n");
    expect(gitignore).toContain(".env.*");
    expect(gitignore).toContain("*.env");
    expect(dockerignore).toContain(".env");
    expect(dockerignore).toContain(".env.*");
    expect(dockerignore).toContain("**/.env");
    expect(dockerignore).toContain("**/.env.*");
    expect(dockerignore).toContain("**/*.env");
  });

  it("CodeRabbit pode aprovar qualquer categoria após avaliação, sem atalho do autor", () => {
    const config = readFileSync(new URL(".coderabbit.yaml", root), "utf8");
    expect(config).toContain("allow_author_approval: false");
    expect(config).toContain("max_merge_risk: low");
    expect(config).toContain("auto_approvals:\n    enabled: true");
    expect(config).toContain("auto_review:\n    enabled: true");
    expect(config).toContain("fail_commit_status: true");
    expect(config).not.toContain("overrides:");
  });
});
