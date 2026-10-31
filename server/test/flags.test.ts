import { describe, it, expect } from "vitest";
import { flagOn } from "../src/flags";

describe("flagOn: recursos perigosos nascem desligados", () => {
  it("só o valor exato 1 liga", () => {
    expect(flagOn("BI_DEV", { BI_DEV: "1" })).toBe(true);
  });

  it.each([undefined, "", "0", "true", "yes", " 1", "1 ", "on", "2"])("o valor %j não liga", (valor) => {
    expect(flagOn("BI_DEV", { BI_DEV: valor })).toBe(false);
  });

  it("sem a variável, desligado, em qualquer NODE_ENV (era ligado fora de produção)", () => {
    expect(flagOn("BI_DEV", {})).toBe(false);
    expect(flagOn("BI_DEV", { NODE_ENV: "development" })).toBe(false);
    expect(flagOn("BI_DEV", { NODE_ENV: "production" })).toBe(false);
    expect(flagOn("BI_DEV", { NODE_ENV: "test" })).toBe(false);
  });

  it("o vitest roda sem BI_DEV: o modo Dev está desligado nos testes e2e", () => {
    expect(flagOn("BI_DEV")).toBe(false);
  });
});
