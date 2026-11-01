import { describe, expect, it } from "vitest";
import { hasUnreadRelease, isReleaseInfo, RELEASES, releaseInfo } from "../src/releases";

describe("metadados e leitura das novidades", () => {
  it("não inventa data ou versão fora de um deploy", () => {
    expect(releaseInfo()).toMatchObject({ revision: null, deployedAt: null });
    expect(releaseInfo("main", "2026-11-01T16:00:00Z")).toMatchObject({ revision: null, deployedAt: null });
    expect(releaseInfo("a".repeat(40), "inválida").deployedAt).toBeNull();
  });

  it("normaliza o horário do deploy sem depender do fuso do processo", () => {
    expect(releaseInfo("b".repeat(40), "2026-11-01T13:00:00-03:00")).toMatchObject({
      revision: "b".repeat(40), deployedAt: "2026-11-01T16:00:00.000Z",
    });
  });

  it("só indica notas não lidas quando a entrada mais recente mudou", () => {
    expect(hasUnreadRelease([], null)).toBe(false);
    expect(hasUnreadRelease(RELEASES, null)).toBe(true);
    expect(hasUnreadRelease(RELEASES, "nota-antiga")).toBe(true);
    expect(hasUnreadRelease(RELEASES, RELEASES[0].id)).toBe(false);
  });

  it("valida a resposta antes de permitir a renderização", () => {
    const valid = releaseInfo("a".repeat(40), "2026-11-01T16:00:00Z");
    expect(isReleaseInfo(valid)).toBe(true);
    expect(isReleaseInfo(releaseInfo())).toBe(true);
    for (const invalid of [null, [], {}, { ...valid, revision: 123 },
      { ...valid, deployedAt: "inválida" }, { ...valid, entries: null },
      { ...valid, entries: [{ ...RELEASES[0], date: "2026-99-99" }] },
      { ...valid, entries: [{ ...RELEASES[0], title: null }] },
      { ...valid, entries: [{ ...RELEASES[0], changes: [123] }] },
    ]) expect(isReleaseInfo(invalid)).toBe(false);
  });

  it("mantém IDs únicos, datas em ordem decrescente e notas preenchidas", () => {
    expect(new Set(RELEASES.map((entry) => entry.id)).size).toBe(RELEASES.length);
    const dates = RELEASES.map((entry) => entry.date);
    expect(dates).toEqual([...dates].sort().reverse());
    for (const entry of RELEASES) {
      expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(entry.title.trim()).not.toBe("");
      expect(entry.changes.length).toBeGreaterThan(0);
      for (const change of entry.changes) expect(change.trim()).not.toBe("");
    }
  });
});
