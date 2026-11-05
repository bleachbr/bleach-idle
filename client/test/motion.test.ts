import { describe, it, expect } from "vitest";
import { reducedMotion } from "../src/motion";

// R-14 (RF-06, ADR-002 §2.3): "auto" segue o sistema (prefers-reduced-motion), as outras duas opções mandam.
describe("reducedMotion", () => {
  it("auto segue a preferência do sistema", () => {
    expect(reducedMotion("auto", true)).toBe(true);
    expect(reducedMotion("auto", false)).toBe(false);
  });

  it("reduzido e completo ignoram o sistema", () => {
    expect(reducedMotion("reduced", false)).toBe(true);
    expect(reducedMotion("full", true)).toBe(false);
  });
});
