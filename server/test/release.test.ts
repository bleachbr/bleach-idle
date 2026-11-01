import { afterEach, describe, expect, it, vi } from "vitest";
import type { AddressInfo } from "node:net";
import { createHttpServer } from "../src/http.js";
import { RELEASES } from "../../shared/src/releases.js";

afterEach(() => vi.unstubAllEnvs());

describe("novidades da versão publicada", () => {
  it("expõe o commit e a data do deploy sem cache nem dados operacionais", async () => {
    vi.stubEnv("RELEASE_REVISION", "a".repeat(40));
    vi.stubEnv("RELEASE_DEPLOYED_AT", "2026-11-01T16:00:00Z");
    const server = createHttpServer(() => ({ privateValue: "não publicar" }));
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    try {
      const response = await fetch(`http://127.0.0.1:${(server.address() as AddressInfo).port}/release`);
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("application/json");
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(response.headers.get("x-content-type-options")).toBe("nosniff");
      const release = await response.json();
      expect(release.revision).toBe("a".repeat(40));
      expect(release.deployedAt).toBe("2026-11-01T16:00:00.000Z");
      expect(release.entries).toEqual(RELEASES);
      expect(release.entries[0].changes.length).toBeGreaterThan(0);
      expect(release).not.toHaveProperty("privateValue");
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
